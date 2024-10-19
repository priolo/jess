import { ApplyActionFunction, ClientInitMessage, ClientResetMessage, ClientUpdateMessage } from "./ClientObjects.types"
import { Action, Listener, ServerInitMessage, ServerObject, ServerUpdateMessage } from "./ServerObjects.types"



export class ServerObjects {

	apply: ApplyActionFunction = null
	onSend: (client: any, message: ServerUpdateMessage | ServerInitMessage) => Promise<void> = null
	objects: { [idObj: string]: ServerObject } = {}

	/** invia a tutti i client le azioni mancanti in maniera da aggiornarli */
	update() {
		for (const idObj in this.objects) {
			const object = this.objects[idObj]
			const lastVersion = object.actions[object.actions.length - 1]?.version ?? 0
			for ( let listener of object.listeners ) {

				/** il client è gi' aggiornato all'ultima versione */
				if (listener.lastVersion == -1 || listener.lastVersion == lastVersion) continue

				/** tutti gli actions da inviare al listener */
				const actions = object.actions.filter(action => action.version > listener.lastVersion)
				const msg: ServerUpdateMessage = {
					type: "s:update",
					idObj: object.idObj,
					actions,
				}
				this.sendToListener(msg, listener, lastVersion)
			}
			this.gc(object)	
		}
	}
	private async sendToListener(msg: ServerUpdateMessage, listener: Listener, lastVersion: number) {
		let oldVersion = listener.lastVersion
		try {
			listener.lastVersion = -1
			await this?.onSend(listener.client, msg)
			listener.lastVersion = lastVersion
		} catch (error) {
			console.error(error)
			listener.lastVersion = oldVersion
		}
	}
	private gc(object:ServerObject) {
		const minVersion = object.listeners.reduce((min, l) => Math.min(min, l.lastVersion), Infinity)
		if ( minVersion == -1 ) return
		object.actions = object.actions.filter(a => a.version > minVersion)
	}

	/** disconnette un client */
	disconnect(client: any) {
		for (const idObj in this.objects) {
			const object = this.objects[idObj]
			const index = object.listeners.findIndex(l => l.client == client)
			if (index == -1) continue
			object.listeners.splice(index, 1)
		}
	}





	/** riceve un messaggio dal client */
	receive(messageStr: string, client: any) {
		const message = JSON.parse(messageStr)

		switch (message.type) {

			case "c:init": {
				const msgInit = message as ClientInitMessage
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

			case "c:update": {
				const msg = message as ClientUpdateMessage
				this.updateFromCommand(msg.payload.idObj, msg.payload.command, msg.payload.atVersion)
				break
			}

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
		let data = this.objects[idObj]

		if (!data) {
			data = {
				idObj,
				value: this.apply(),
				listeners: [{ client, lastVersion: 0 }],
				actions: []
			}
			this.objects[idObj] = data

		} else if (!data.listeners.some(l => l.client == client)) {
			data.listeners.push({
				client,
				lastVersion: data.actions[data.actions.length - 1]?.version ?? 0
			})
		}

		return data
	}

	/** aggiorno l'OBJ con un command (generico)*/
	private updateFromCommand(idObj: string, command: any, atVersion: number) {
		const objShared = this.objects[idObj]
		if (!objShared) return
		const act: Action = {
			command,
			atVersion,
			version: objShared.actions.length + 1
		}
		// se atVerson == version -1 allora è un comando che non non deve essere mandato a chi lo ha inviato quindi il lastversion de client che ha mandato questo messaggio lo si aggiorna a quello attuale in maniera che non lo manda appunto
		objShared.actions.push(act)
		objShared.value = this.apply(objShared.value, act)
	}
}