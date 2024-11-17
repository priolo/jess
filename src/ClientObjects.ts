import { ApplyActionFunction, ClientInitMessage, ClientMessage, ClientObject, ClientResetMessage, ClientUpdateMessage } from "./ClientObjects.types"
import { Action, ServerInitMessage, ServerUpdateMessage } from "./ServerObjects.types"




export class ClientObjects {

	/**
	 * modifica un OBJECT tramite un ACTION
	 */
	apply: ApplyActionFunction = null

	/** 
	 * invia al server un messaggio 
	 * emette un errore se il messaggio non è stato inviato correttamente
	*/
	onSend: (messages: ClientMessage[]) => Promise<void> = null

	/**libreria di BJECTs */
	private objects: { [idObj: string]: ClientObject } = {}
	private observers: { [idObj: string]: ((data: any) => void)[] } = {}
	private initResponse: { resolve: () => void, reject: (m: any) => void } | null = null
	private buffer: ClientMessage[] = []

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
	 * chiede al server di sincronizzare un oggetto
	 * tipicamente quando l'oggetto è creato oppure quando si chiude la connessione di comunicazione
	 * @param idObj id dell'oggetto da sincronizzare
	 * @param update se true invia subito la richiesta al server e aspetta la risposta
	 **/
	async init(idObj: string, send?: boolean): Promise<void> {
		// if (this.objects[idObj]) {
		// 	try {
		// 		await this.reset()
		// 	} catch (error) {
		// 		return Promise.reject(error)
		// 	}
		// 	return Promise.resolve()
		// }
		const message: ClientInitMessage = {
			type: "c:init",
			payload: { idObj }
		}
		this.buffer.push(message)
		if (!send) return
		const promise = new Promise<void>((resolve, reject) => this.initResponse = { resolve, reject })
		await this.update()
		return promise
		//return new Promise<void>((resolve, reject) => this.initResponse = { resolve, reject })
	}

	/** 
	 * bufferizza un "command" su un OBJECT
	 * @param idObj id dell'oggetto
	 * @param command comando da eseguire
	 **/
	command(idObj: string, command: any) {
		const object = this.getObject(idObj)
		const message: ClientUpdateMessage = {
			type: "c:update",
			payload: {
				idObj: idObj,
				atVersion: object.version,
				command,
			},
		}
		this.buffer.push(message)
	}

	/** 
	 * dico al server gli OBJECT osservati e a versione raggiunta
	 **/
	async reset(): Promise<void> {
		const message: ClientResetMessage = {
			type: "c:reset",
			payload: Object.values(this.objects).map(obj => ({ idObj: obj.idObj, version: obj.version }))
		}
		this.onSend([message])
	}

	/** 
	 * invia al server tutti i command bufferizzati
	 * */
	async update(): Promise<void> {
		if (this.buffer.length == 0 || !this.onSend ) return
		const temp = this.buffer
		this.buffer = []
		try {
			await this.onSend(temp)
		} catch (error) {	
			this.buffer = temp.concat(this.buffer)
			throw error
		}
	}

	/** 
	 * riceve un messaggio dal server
	 * @param messageStr messaggio da parsare
	 * */
	receive(messageStr: string) {
		const message = JSON.parse(messageStr)
		switch (message.type) {
			case "s:init": {
				const msgInit = message as ServerInitMessage
				this.setObject(msgInit.idObj, msgInit.data, msgInit.version)
				this.initResponse?.resolve()
				this.initResponse = null
				break
			}
			case "s:update": {
				const msgUp = message as ServerUpdateMessage
				this.updateObject(msgUp.idObj, msgUp.actions)
				break
			}
		}
	}



	/**
	 * Recupera o crea un OBJECT
	 */
	getObject(idObj: string): ClientObject {
		let object = this.objects[idObj]
		if (!object) this.objects[idObj] = object = { idObj, value: [], version: 0 }
		return object
	}

	/**
	 * setto il vaore di un OBJECT
	 * @param idObj id dell'oggetto
	 * @param value valore da assegnare
	 * @param version versione dell'oggetto
	 */
	private setObject(idObj: string, value: any[], version: number) {
		this.objects[idObj] = { idObj, value, version }
		this.notify(idObj, value)
	}

	/**
	 * applica una serie di azioni ad un OBJECT
	 * @param idObj id dell'oggetto
	 * @param actions azioni da applicare
	 */
	private updateObject(idObj: string, actions: Action[]) {
		const obj = this.objects[idObj]
		if (!obj) throw new Error("Object not found")

		actions.forEach(action => obj.value = this.apply(obj.value, action))
		obj.version = actions[actions.length - 1].version
		this.notify(idObj, obj.value)
	}
}