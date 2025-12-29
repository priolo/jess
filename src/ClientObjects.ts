import { ApplyCommandFunction, ClientInitMessage, ClientMessage, ClientMessageType, ClientObject, ClientResetMessage, ClientUpdateMessage } from "./ClientObjects.types.js"
import { Action, ServerInitMessage, ServerMessage, ServerUpdateMessage } from "./ServerObjects.types.js"
import { shortUUID } from "./utils.js"



export class ClientObjects {

	/**
	 * modifies an OBJECT through a series of ACTIONs
	 */
	apply: ApplyCommandFunction = null

	/** 
	 * sends a series of messages to the server
	 * emits an error if the message was not sent correctly
	*/
	onSend: (messages: ClientMessage[]) => Promise<any> = null

	
	/** counter to make the messages sent by this CLIENT-ID unique */
	private static IdCounter = 0
	private id: string = shortUUID()
	private objects: { [idObj: string]: ClientObject } = {}
	private observers: { [idObj: string]: ((data: any) => void)[] } = {}
	private initResponse: { resolve: () => void, reject: (m: any) => void } | null = null
	private buffer: ClientMessage[] = []
	private bufferTemp: ClientUpdateMessage[] = []



	//#region OBSERVERS

	/**
	 * called when the observed object changes
	 */
	observe(idObj: string, callback: (data: any) => void) {
		if (!this.observers[idObj]) this.observers[idObj] = []
		this.observers[idObj].push(callback)
	}
	/**
	 * stops observing the object
	 */
	unobserve(idObj: string, callback: (data: any) => void) {
		if (!this.observers[idObj]) return
		this.observers[idObj] = this.observers[idObj].filter(obs => obs != callback)
	}
	/**
	 * notifies all observers of the object
	 */
	private notify(idObj: string, data: any) {
		this.observers[idObj]?.forEach(obs => obs(data))
	}

	//#endregion



	/** 
	 * asks the SERVER to synchronize an OBJECT
	 * @param idObj id of the OBJECT to synchronize
	 * @param update if true, immediately sends the request to the SERVER and waits for the response
	 **/
	async init(idObj: string, send?: boolean): Promise<void> {
		// if it does not exist, create the object
		this.getObject(idObj)
		const message: ClientInitMessage = {
			clientId: this.id,
			type: ClientMessageType.INIT,
			idObj,
		}
		this.buffer.push(message)
		// if it is to be sent, then prepare the promise and send it
		if (!send) return
		const promise = new Promise<void>((resolve, reject) => this.initResponse = { resolve, reject })
		try {
			await this.update()
		} catch (e) { }
		return promise
	}

	/** 
	 * buffers a "command" on an OBJECT
	 * @param idObj id of the object
	 * @param command command to execute
	 **/
	command(idObj: string, command: any) {
		if (!idObj || command == null) return
		this.getObject(idObj)
		const message: ClientUpdateMessage = {
			type: ClientMessageType.UPDATE,
			idObj,
			action: { idClient: this.id, counter: ClientObjects.IdCounter++, command }
		}
		this.buffer.push(message)
		this.updateValueTemp(idObj)
	}

	/** 
	 * tells the server the observed OBJECTs and the version reached
	 **/
	async reset(): Promise<void> {
		const message: ClientResetMessage = {
			type: ClientMessageType.RESET,
			clientId: this.id,
			payload: Object.values(this.objects).map(obj => ({ idObj: obj.idObj, version: obj.version }))
		}
		await this.onSend([message])
	}

	/** 
	 * sends all buffered MESSAGES to the server
	 * */
	async update(): Promise<void> {
		// I have nothing to send...
		if (this.buffer.length == 0) return

		let temp = this.buffer
		this.buffer = []
		try {
			const res = await this.onSend(temp)
			if (res != null) temp = res
		} catch (error) {
			this.buffer.push(...temp)
			this.initResponse?.reject(error)
			this.initResponse = null
			throw error
		}

		// store the sent MESSAGES to reconstruct the value while waiting for confirmation from the server
		this.bufferTemp.push(...temp.filter(m => m.type == ClientMessageType.UPDATE));
		const idObjs = temp.map(m => (m as ClientUpdateMessage).idObj);
		[...new Set(idObjs)].forEach(idObj => this.updateValueTemp(idObj))
	}

	/** 
	 * receives a MESSAGE from the SERVER
	 * @param messageStr message to parse
	 * */
	receive(messageStr: string) {
		const message: ServerMessage = JSON.parse(messageStr)
		switch (message.type) {

			// response to the synchronization request
			case "s:init": {
				const msgInit = message as ServerInitMessage
				this.objects[msgInit.idObj] = {
					idObj: msgInit.idObj,
					value: msgInit.data,
					valueTemp: null,
					version: msgInit.version,
				}

				// update the "temporary" value with the real value
				this.updateValueTemp(msgInit.idObj)

				this.notify(msgInit.idObj, this.objects[msgInit.idObj].value)

				// possibly resolve the init promise
				this.initResponse?.resolve()
				this.initResponse = null
				break
			}

			// update of an OBJECT
			case "s:update": {
				const msgUp = message as ServerUpdateMessage
				const obj = this.objects[msgUp.idObj]
				if (!obj) throw new Error("Object not found")

				// if there is no command, try to retrieve it from a pending message
				for (const action of msgUp.actions) {
					if (action.idClient != this.id || !!action.command) continue
					action.command = (this.bufferTemp.find(m => {
						const msgUp = m as ClientUpdateMessage
						return m.type == ClientMessageType.UPDATE && msgUp.idObj == obj.idObj && msgUp.action?.idClient == action.idClient && msgUp.action?.counter == action.counter
					}) as ClientUpdateMessage)?.action?.command
				}

				obj.value = this.apply(obj.value, msgUp.actions.map(a => a.command))
				obj.version = msgUp.actions[msgUp.actions.length - 1].version

				// delete the MESSAGE from those pending
				this.filterBufferTemp(msgUp.idObj, msgUp.actions)
				this.updateValueTemp(msgUp.idObj)

				this.notify(msgUp.idObj, obj.value)
				break
			}
		}
	}

	//#region OBJECT

	/**
	 * Retrieves or creates an OBJECT
	 */
	getObject(idObj: string): ClientObject {
		let object = this.objects[idObj]
		if (!object) this.objects[idObj] = object = {
			idObj,
			value: this.apply(),
			valueTemp: this.apply(),
			version: 0
		}
		return object
	}

	//#endregion



	//#region WAIT BUFFER

	/**
	 * deletes pending messages that have been executed
	 * @param idObj id of the object
	 * @param actions applied actions
	 */
	private filterBufferTemp(idObj: string, actions: Action[]) {
		this.bufferTemp = this.bufferTemp.filter(msgUp => {
			return msgUp.idObj != idObj
				|| !actions.some(action =>
					action.idClient == msgUp.action.idClient && action.counter == msgUp.action.counter
				)
		})
	}

	/**
	 * updates the "temporary" value of an OBJECT with all pending MESSAGES
	 * @param idObj id of the object
	 */
	private updateValueTemp(idObj: string) {
		// take the current VALUE for this OBJECT
		// [II] ATTENTION MUST MAKE A DEEP CLONE
		const obj = this.objects[idObj]
		let v = !!obj ? [...obj.value] : this.apply()
		// all MESSAGES to apply
		const msgBuffer = this.bufferTemp.concat(this.buffer.filter(m => m.type == ClientMessageType.UPDATE))
		// apply only the update MESSAGES for this OBJECT
		const commands = msgBuffer.reduce((acc, msgUp) => {
			if (msgUp.idObj != idObj) return acc
			acc.push(msgUp.action.command)
			return acc
		}, [] as any[])
		v = this.apply(v, commands)

		obj.valueTemp = v
	}

	//#endregion
}