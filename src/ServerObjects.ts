import { ApplyCommandFunction, ClientInitMessage, ClientMessage, ClientResetMessage, ClientUpdateMessage } from "./ClientObjects.types.js"
import { Action, Listener, ServerInitMessage, ServerMessage, ServerMessageType, ServerObject, ServerUpdateMessage } from "./ServerObjects.types.js"
import { truncate } from "./utils.js"



export class ServerObjects {

	/**
	 * modifica un OBJECT tramite un ACTION
	 */
	apply: ApplyCommandFunction = null
	/** 
	 * invia al client un messaggio 
	 * emette un errore se il messaggio non è stato inviato correttamente
	 * */
	onSend: (client: any, message: ServerUpdateMessage | ServerInitMessage) => Promise<void> = null

	/**libreria di OBJECTs */
	objects: { [idObj: string]: ServerObject } = {}
	/** buffer minimo di azioni da mantenere */
	bufferMin: number = 1000

	/** 
	 * invia a tutti i CLIENT le ACTIONs mancanti in maniera da sincronizzarli
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
		/** il client è già aggiornato all'ultima versione */
		if (listener.lastVersion == object.version || object.actions.length == 0) return

		let msg: ServerMessage
		// se il listener è inferiore all'ultima action memorizzata allora mando tutto
		const firstVersion = object.actions[0].version
		if (listener.lastVersion < firstVersion && firstVersion > 1) {
			msg = <ServerInitMessage>{
				type: ServerMessageType.INIT,
				idObj: object.idObj,
				data: object.value,
				version: object.version
			}
		} else {
			/** tutti gli actions da inviare al listener */
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
		// invio il messaggio di aggiornamento al client
		this.sendToListener(msg, listener, object.version)
	}

	/**
	 * effettivamente invia il messaggio al listener e aggiorna la sua ultima versione
	 */
	private async sendToListener(msg: ServerMessage, listener: Listener, lastVersion: number) {
		// [II] potrebbe fallire perche' se arriva un altro messaggio prima che questo finisca di eseguire allora listener.lastVersion non è piu' quello che era all'inizio
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
	 * elimina azioni che sono sicuramente inviate a tutti i listeners
	 * @param object 
	 */
	private gc(object: ServerObject) {
		const minVersion = object.listeners.reduce((min, l) => Math.min(min, l.lastVersion), Infinity)
		object.actions = truncate(object.actions, minVersion, this.bufferMin)
	}

	/** 
	 * disconnette un client 
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
	 * riceve una serie di messaggi da un client 
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

		// eseguo gli aggiornamenti a blocchi per ogni OBJECT
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
		// invio lo stato iniziale
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

	/** recupera/crea un OBJ (assegno il listener "client") */
	private getObject(idObj: string, client: any): ServerObject {
		let object = this.objects[idObj]

		// se l'oggetto non c'e' lo creo
		if (!object) {
			object = {
				idObj,
				value: this.apply(),
				listeners: [{ client, lastVersion: 0 }],
				actions: [],
				version: 0,
			}
			this.objects[idObj] = object

			// se nell'oggetto non c'e' il listener lo aggiungo
		} else if (!object.listeners.some(l => l.client == client)) {
			object.listeners.push({
				client,
				lastVersion: object.version
			})
		}

		return object
	}

}