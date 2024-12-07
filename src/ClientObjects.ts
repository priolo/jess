import { ApplyCommandFunction, ClientInitMessage, ClientMessage, ClientMessageType, ClientObject, ClientResetMessage, ClientUpdateMessage } from "./ClientObjects.types.js"
import { Action, ServerInitMessage, ServerMessage, ServerUpdateMessage } from "./ServerObjects.types.js"
import { shortUUID } from "./utils.js"



export class ClientObjects {

	/**
	 * modifica un OBJECT tramite una serie di ACTIONs
	 */
	apply: ApplyCommandFunction = null

	/** 
	 * invia al server una serie di messaggi
	 * emette un errore se il messaggio non è stato inviato correttamente
	*/
	onSend: (messages: ClientMessage[]) => Promise<any> = null

	
	/** contatore er rende univoci i messaggi inviati da questo CLIENT-ID  */
	private static IdCounter = 0
	private id: string = shortUUID()
	private objects: { [idObj: string]: ClientObject } = {}
	private observers: { [idObj: string]: ((data: any) => void)[] } = {}
	private initResponse: { resolve: () => void, reject: (m: any) => void } | null = null
	private buffer: ClientMessage[] = []
	private bufferTemp: ClientUpdateMessage[] = []



	//#region OBSERVERS

	/**
	 * chiamato quando l'oggetto osservato cambia
	 */
	observe(idObj: string, callback: (data: any) => void) {
		if (!this.observers[idObj]) this.observers[idObj] = []
		this.observers[idObj].push(callback)
	}
	/**
	 * smette di osservare l'oggetto
	 */
	unobserve(idObj: string, callback: (data: any) => void) {
		if (!this.observers[idObj]) return
		this.observers[idObj] = this.observers[idObj].filter(obs => obs != callback)
	}
	/**
	 * notifica tutti gli osservatori dell'oggetto
	 */
	private notify(idObj: string, data: any) {
		this.observers[idObj]?.forEach(obs => obs(data))
	}

	//#endregion



	/** 
	 * chiede al SERVER di sincronizzare un OGGETTO
	 * @param idObj id dell'OGGETTO da sincronizzare
	 * @param update se true invia subito la richiesta al SERVER e aspetta la risposta
	 **/
	async init(idObj: string, send?: boolean): Promise<void> {
		// se non esiste crea l'oggetto
		this.getObject(idObj)
		const message: ClientInitMessage = {
			clientId: this.id,
			type: ClientMessageType.INIT,
			idObj,
		}
		this.buffer.push(message)
		// se è da inviare allora preparo la promise e lo invio
		if (!send) return
		const promise = new Promise<void>((resolve, reject) => this.initResponse = { resolve, reject })
		await this.update()
		return promise
	}

	/** 
	 * bufferizza un "command" su un OBJECT
	 * @param idObj id dell'oggetto
	 * @param command comando da eseguire
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
	 * dico al server gli OBJECT osservati e la versione raggiunta
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
	 * invia al server tutti i MESSAGES bufferizzati
	 * */
	async update(): Promise<void> {
		// non ho nulla da mandare...
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

		// memorizzo i MESSAGES inviati per ricostruire il valore intanto che aspetto la conferma dal server
		this.bufferTemp.push(...temp.filter(m => m.type == ClientMessageType.UPDATE));
		const idObjs = temp.map(m => (m as ClientUpdateMessage).idObj);
		[...new Set(idObjs)].forEach(idObj => this.updateValueTemp(idObj))
	}

	/** 
	 * riceve un MESSAGE dal SERVER
	 * @param messageStr messaggio da parsare
	 * */
	receive(messageStr: string) {
		const message: ServerMessage = JSON.parse(messageStr)
		switch (message.type) {

			// risposta alla richiesta di sincronizzazione
			case "s:init": {
				const msgInit = message as ServerInitMessage
				this.objects[msgInit.idObj] = {
					idObj: msgInit.idObj,
					value: msgInit.data,
					valueTemp: null,
					version: msgInit.version,
				}

				// aggiorno il valore "provvisorio" con il valore reale
				this.updateValueTemp(msgInit.idObj)

				this.notify(msgInit.idObj, this.objects[msgInit.idObj].value)

				// eventualmente risolvo la promise di init
				this.initResponse?.resolve()
				this.initResponse = null
				break
			}

			// aggiornamento di un OBJECT
			case "s:update": {
				const msgUp = message as ServerUpdateMessage
				const obj = this.objects[msgUp.idObj]
				if (!obj) throw new Error("Object not found")

				// nel caso non ci sia command allora cerco di recuperarlo da un messaggio in attesa
				for (const action of msgUp.actions) {
					if (action.idClient != this.id || !!action.command) continue
					action.command = (this.bufferTemp.find(m => {
						const msgUp = m as ClientUpdateMessage
						return m.type == ClientMessageType.UPDATE && msgUp.idObj == obj.idObj && msgUp.action?.idClient == action.idClient && msgUp.action?.counter == action.counter
					}) as ClientUpdateMessage)?.action?.command
				}

				obj.value = this.apply(obj.value, msgUp.actions.map(a => a.command))
				obj.version = msgUp.actions[msgUp.actions.length - 1].version

				// elimino il MESSAGE tra quelli in attesa
				this.filterBufferTemp(msgUp.idObj, msgUp.actions)
				this.updateValueTemp(msgUp.idObj)

				this.notify(msgUp.idObj, obj.value)
				break
			}
		}
	}

	//#region OBJECT

	/**
	 * Recupera o crea un OBJECT
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
	 * elimina i messaggi in attesa che sono stati eseguiti
	 * @param idObj id dell'oggetto
	 * @param actions azioni applicate
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
	 * aggiorno il valore "provvisorio" di un OBJECT con tutti i MESSAGES in attesa
	 * @param idObj id dell'oggetto
	 */
	private updateValueTemp(idObj: string) {
		// prendo il VALUE attuale per questo OBJECT
		// [II] ATTENZIONE BISOGNA FARE UN CLONE DEEP
		const obj = this.objects[idObj]
		let v = !!obj ? [...obj.value] : this.apply()
		// tutte i MESSAGES da applicare
		const msgBuffer = this.bufferTemp.concat(this.buffer.filter(m => m.type == ClientMessageType.UPDATE))
		// applico solo i MESSAGES di aggiornamento per questo OBJECT
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