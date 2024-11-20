import { ApplyActionFunction, ClientInitMessage, ClientMessage, ClientResetMessage, ClientUpdateMessage } from "./ClientObjects.types"
import { Action, Listener, ServerInitMessage, ServerMessage, ServerObject, ServerUpdateMessage } from "./ServerObjects.types"
import { truncate } from "./utils"

// import path from 'path';
// import { fileURLToPath } from 'url';
// const __dirname = path.dirname(fileURLToPath(import.meta.url));


export class ServerObjects {

	/**
	 * modifica un OBJECT tramite un ACTION
	 */
	apply: ApplyActionFunction = null
	/** 
	 * invia al client un messaggio 
	 * emette un errore se il messaggio non è stato inviato correttamente
	 * */
	onSend: (client: any, message: ServerUpdateMessage | ServerInitMessage) => Promise<void> = null

	/**libreria di BJECTs */
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
		if (listener.lastVersion == object.version) return

		let msg: ServerMessage
		// se il listener è inferiore all'ultima action memorizzata allora mando tutto
		if (listener.lastVersion < object.actions[0].version) {
			msg = <ServerInitMessage>{
				type: "s:init",
				idObj: object.idObj,
				data: object.value,
				version: object.version
			}
		} else {
			/** tutti gli actions da inviare al listener */
			const actions = object.actions.filter(action => action.version > listener.lastVersion)
			msg = <ServerUpdateMessage>{
				type: "s:update",
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
		// [II] mmm in alcuni casi potrebbe fallire sto metodo 
		// perche' se arriva un altro messaggio prima che questo finisca di eseguire 
		// allora listener.lastVersion non è piu' quello che era all'inizio
		let oldVersion = listener.lastVersion
		try {
			//listener.lastVersion = -1
			listener.lastVersion = lastVersion
			await this?.onSend(listener.client, msg)
			//listener.lastVersion = lastVersion
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
		//console.log( "disconnect", __dirname )
		for (const idObj in this.objects) {
			const object = this.objects[idObj]
			const index = object.listeners.findIndex(l => l.client == client)
			if (index == -1) continue
			object.listeners.splice(index, 1)
		}
	}

	/** 
	 * riceve un messaggio dal client 
	 **/
	receive(messagesStr: string, client: any) {
		const messages = JSON.parse(messagesStr) as ClientMessage[]
		for (const message of messages) {
			this.executeMessage(message, client)
		}
	}
	private executeMessage(message: ClientMessage, client: any) {
		switch (message.type) {

			// il CLIENT chiede di ricevere l'inizializzazione di un OBJECT
			case "c:init": {
				const msgInit = message as ClientInitMessage
				client._jess_id = msgInit.clientId
				const object = this.getObject(msgInit.payload.idObj, client)
				// invio lo stato iniziale
				const msg: ServerInitMessage = {
					type: "s:init",
					idObj: object.idObj,
					data: [...object.value],
					version: object.actions[object.actions.length - 1]?.version ?? 0
				}
				this.onSend(client, msg)
				break
			}

			// il CLIENT invia un comando per modificare un OBJECT
			case "c:update": {
				const msg = message as ClientUpdateMessage
				this.updateFromAction(msg.idObj, msg.action)
				break
			}

			// il CLIENT invia la versione a cui è arrivato su tutti gli OBJECTs
			case "c:reset": {
				const msg = message as ClientResetMessage
				msg.payload.forEach(obj => {
					const object = this.getObject(obj.idObj, client)
					object.listeners.find(l => l.client == client).lastVersion = obj.version
				})
				break
			}
		}
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

	/** aggiorno l'OBJ con un command (generico)*/
	private updateFromAction(idObj: string, clientAction: Action) {
		const object = this.objects[idObj]
		if (!object) return
		object.version++
		const action: Action = {
			...clientAction,
			version: object.version,
		}
		// [II] OTTIMIZZAZIONE: se atVerson == version -1 allora è un comando che non non deve essere mandato a chi lo ha inviato quindi il lastversion de client che ha mandato questo messaggio lo si aggiorna a quello attuale in maniera che non lo manda appunto
		object.actions.push(action)
		object.value = this.apply(object.value, action.command)
	}
}