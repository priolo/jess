import { ApplyCommandFunction, ClientInitMessage, ClientMessage, ClientResetMessage, ClientUpdateMessage } from "./ClientObjects.types.js"
import { Action, Listener, ServerInitMessage, ServerMessage, ServerMessageType, ServerObject, ServerUpdateMessage } from "./ServerObjects.types.js"
import { truncate } from "./utils.js"



export class ServerObjects {

	/**
	 * modifies an OBJECT through an ACTION
	 */
	apply: ApplyCommandFunction = null
	/** 
	 * sends a message to the client
	 * emits an error if the message was not sent correctly
	 * */
	onSend: (client: any, message: ServerUpdateMessage | ServerInitMessage) => Promise<void> = null

	/** library of OBJECTs */
	objects: { [idObj: string]: ServerObject } = {}
	/** minimum buffer of actions to maintain */
	bufferMin: number = 1000

	/** 
	 * sends all missing ACTIONs to all CLIENTS to synchronize them
	 * */
	update() {
		for (const idObj in this.objects) {
			const object = this.objects[idObj]
			for (let lstIndex = 0; lstIndex < object.listeners.length; lstIndex++) {
				this.updateListener(object, lstIndex)
			}
			this.gc(object)
		}
	}
	private updateListener(object: ServerObject, indexlistener: number) {
		const listener = object.listeners[indexlistener]
		/** the client is already updated to the latest version */
		if (listener.lastVersion == object.version || object.actions.length == 0) return

		let msg: ServerMessage
		// if the listener is below the last stored action then send everything
		const firstVersion = object.actions[0].version
		if (listener.lastVersion < firstVersion && firstVersion > 1) {
			msg = <ServerInitMessage>{
				type: ServerMessageType.INIT,
				idObj: object.idObj,
				data: object.value,
				version: object.version
			}
		} else {
			/** all actions to send to the listener */
			let actions = object.actions.filter(action => action.version > listener.lastVersion)
			actions = actions.map(action => {
				if (action.idClient != listener.client._jess_id) return action
				return { ...action, command: null }
			})
			msg = <ServerUpdateMessage>{
				type: ServerMessageType.UPDATE,
				idObj: object.idObj,
				actions,
			}
		}
		// send the update message to the client
		this.sendToListener(msg, listener, object.version)
	}

	/**
	 * actually sends the message to the listener and updates its last version
	 */
	private async sendToListener(msg: ServerMessage, listener: Listener, lastVersion: number) {
		// [II] it could fail because if another message arrives before this one finishes executing then listener.lastVersion is no longer what it was at the beginning
		let oldVersion = listener.lastVersion
		try {
			listener.lastVersion = lastVersion
			await this?.onSend(listener.client, msg)
		} catch (error) {
			console.error(error)
			listener.lastVersion = oldVersion
		}
	}

	/**
	 * garbage collection
	 * deletes actions that have definitely been sent to all listeners
	 * @param object 
	 */
	private gc(object: ServerObject) {
		const minVersion = object.listeners.reduce((min, l) => Math.min(min, l.lastVersion), Infinity)
		object.actions = truncate(object.actions, minVersion, this.bufferMin)
	}

	/** 
	 * disconnects a client 
	 **/
	disconnect(client: any) {
		for (const idObj in this.objects) {
			const object = this.objects[idObj]
			const index = object.listeners.findIndex(l => l.client == client)
			if (index == -1) continue
			object.listeners.splice(index, 1)
		}
	}

	/** 
	 * receives a series of messages from a client 
	 **/
	receive(messagesStr: string, client: any) {
		const messages = JSON.parse(messagesStr) as ClientMessage[]
		const groups: { [idObj: string]: ClientUpdateMessage[] } = {}

		for (const message of messages) {
			switch (message.type) {
				case "c:init": {
					this.execInitMessage(message as ClientInitMessage, client)
					break
				}
				case "c:reset": {
					this.execResetMessage(message as ClientResetMessage, client)
					break
				}
				case "c:update": {
					const msg = message as ClientUpdateMessage
					if (!groups[msg.idObj]) groups[msg.idObj] = []
					groups[msg.idObj].push(msg)
					break
				}
			}
		}

		// execute updates in blocks for each OBJECT
		for (const idObj in groups) {
			this.execUpdateMessages(idObj, groups[idObj])
		}
	}
	private execUpdateMessages(idObj: string, messages: ClientUpdateMessage[]) {
		const object = this.objects[idObj]
		if (!object) return
		const cmmToApply: any[] = []
		for (const msg of messages) {
			object.version++
			const action: Action = {
				...msg.action,
				version: object.version,
			}
			object.actions.push(action)
			cmmToApply.push(action.command)
		}
		object.value = this.apply(object.value, cmmToApply)
	}
	private execInitMessage(message: ClientInitMessage, client: any) {
		const object = this.getObject(message.idObj, client)
		// send the initial state
		const msg: ServerInitMessage = {
			type: ServerMessageType.INIT,
			idObj: object.idObj,
			data: object.value,
			version: object.actions[object.actions.length - 1]?.version ?? 0
		}
		this.onSend(client, msg)
		client._jess_id = message.clientId
	}
	private execResetMessage(message: ClientResetMessage, client: any) {
		message.payload.forEach(obj => {
			const object = this.getObject(obj.idObj, client)
			object.listeners.find(l => l.client == client).lastVersion = obj.version
		})
		client._jess_id = message.clientId
	}

	/** retrieves/creates an OBJ (assigns the listener "client") */
	private getObject(idObj: string, client: any): ServerObject {
		let object = this.objects[idObj]

		// if the object does not exist, create it
		if (!object) {
			object = {
				idObj,
				value: this.apply(),
				listeners: [{ client, lastVersion: 0 }],
				actions: [],
				version: 0,
			}
			this.objects[idObj] = object

			// if the listener is not in the object, add it
		} else if (!object.listeners.some(l => l.client == client)) {
			object.listeners.push({
				client,
				lastVersion: object.version
			})
		}

		return object
	}

}