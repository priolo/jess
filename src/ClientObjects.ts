import { ApplyActionFunction, ApplyActionsFunction, ClientInitMessage, ClientMessage, ClientObject, ClientResetMessage, ClientUpdateMessage } from "./ClientObjects.types.js"
import { Action, ServerInitMessage, ServerUpdateMessage } from "./ServerObjects.types.js"



let idCounter = 0

export class ClientObjects {

	/**
	 * modifica un OBJECT tramite un ACTION
	 */
	apply: ApplyActionFunction = null
	multiApply: ApplyActionsFunction = null

	/** 
	 * invia al server un messaggio 
	 * emette un errore se il messaggio non è stato inviato correttamente
	*/
	onSend: (messages: ClientMessage[]) => Promise<void> = null

	/**libreria di BJECTs */
	private id: string = crypto.randomUUID()
	private objects: { [idObj: string]: ClientObject } = {}
	private observers: { [idObj: string]: ((data: any) => void)[] } = {}
	private initResponse: { resolve: () => void, reject: (m: any) => void } | null = null
	private buffer: ClientMessage[] = []
	private waitBuffer: ClientMessage[] = []

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
		this.getObject(idObj)
		const message: ClientInitMessage = {
			clientId: this.id,
			type: "c:init",
			idObj,
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
			idObj,
			action: { idClient: this.id, counter: idCounter++, command }
		}

		this.buffer.push(message)
		this.updateWaitValue(idObj)
	}

	/** 
	 * dico al server gli OBJECT osservati e la versione raggiunta
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
		// non ho nulla da mandare...
		if (this.buffer.length == 0 || !this.onSend) return
		const temp = this.buffer
		this.buffer = []
		try {
			await this.onSend(temp)
		} catch (error) {
			this.buffer.push(...temp)
			throw error
		}
		this.waitBuffer.push(...temp);

		[...new Set(temp.map(m => (m as ClientUpdateMessage).idObj))]
			.forEach(idObj => this.updateWaitValue(idObj))
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
				this.objects[msgInit.idObj] = {
					idObj: msgInit.idObj,
					value: msgInit.data,
					valueWait: null,
					version: msgInit.version,
				}

				// [II] TODO da capire se farlo sempre 
				this.waitBuffer = []
				this.updateWaitValue(msgInit.idObj)

				this.notify(msgInit.idObj, this.objects[msgInit.idObj].value)

				this.initResponse?.resolve()
				this.initResponse = null
				break
			}
			case "s:update": {
				const msgUp = message as ServerUpdateMessage
				//this.updateObject(msgUp.idObj, msgUp.actions)

				const obj = this.objects[msgUp.idObj]
				if (!obj) throw new Error("Object not found")

				if (this.multiApply) {
					obj.value = this.multiApply(obj.value, msgUp.actions.map(a => a.command))
				} else {
					for (const action of msgUp.actions) {
						obj.value = this.apply(obj.value, action.command)
					}
				}

				obj.version = msgUp.actions[msgUp.actions.length - 1].version

				// [II] TODO mettere in "updateObject" 
				// elimino il message tra quelli in attesa
				this.filterWaitBuffer(msgUp.idObj, msgUp.actions)
				this.updateWaitValue(msgUp.idObj)

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
			valueWait: this.apply(),
			version: 0
		}
		return object
	}

	/**
	 * applica una serie di azioni ad un OBJECT
	 * @param idObj id dell'oggetto
	 * @param actions azioni da applicare
	 */
	// private updateObject(idObj: string, actions: Action[]) {
	// 	const obj = this.objects[idObj]
	// 	if (!obj) throw new Error("Object not found")
	// 	for (const action of actions) {
	// 		obj.value = this.apply(obj.value, action.command)
	// 	}
	// 	obj.version = actions[actions.length - 1].version
	// }

	//#endregion



	//#region WAIT BUFFER

	/**
	 * elimina i messaggi in attesa che sono stati eseguiti
	 * @param idObj id dell'oggetto
	 * @param actions azioni applicate
	 */
	filterWaitBuffer(idObj: string, actions: Action[]) {
		this.waitBuffer = this.waitBuffer.filter(msg => {
			const msgUp = msg as ClientUpdateMessage
			return msgUp.idObj != idObj
				|| !actions.some(action =>
					action.idClient == msgUp.action.idClient && action.counter == msgUp.action.counter
				)
		})
	}

	/**
	 * restituisce il valore di un OBJECT con tutte le modifiche in attesa
	 * @param idObj id dell'oggetto
	 */
	getWaitValue(idObj: string): any {
		// prendo tutti i messaggi in attesa per questo oggetto
		// [II] ATTENZIONE BISOGNA FARE UN CLONE DEEP
		const obj = this.objects[idObj]
		let v = !!obj ? [...obj.value] : this.apply()
		const msgBuffer = this.waitBuffer.concat(this.buffer)
		const commands = msgBuffer.reduce((acc, msg) => {
			if (msg.type != "c:update") return acc
			const msgUp = msg as ClientUpdateMessage
			if (msgUp.idObj != idObj) return acc
			acc.push(msgUp.action.command)
			return acc
		}, [] as any[])

		if (this.multiApply) {
			v = this.multiApply(v, commands)
		} else {
			for (const command of commands) {
				v = this.apply(v, command)
			}
		}

		return v
	}
	updateWaitValue(idObj: string) {
		this.objects[idObj].valueWait = this.getWaitValue(idObj)
	}

	//#endregion
}