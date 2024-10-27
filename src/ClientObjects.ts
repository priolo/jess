import { ApplyActionFunction, ClientInitMessage, ClientMessage, ClientObject, ClientResetMessage, ClientUpdateMessage} from "./ClientObjects.types"
import { Action, ServerInitMessage, ServerUpdateMessage } from "./ServerObjects.types"




export class ClientObjects {

	apply: ApplyActionFunction = null
	onSend: (message: ClientMessage) => Promise<void> = null

	objects: { [idObj: string]: ClientObject } = {}
	private observers: { [idObj: string]: ((data: any) => void)[] } = {}
	private initResolve: ((value: void | PromiseLike<void>) => void) | null = null
	private buffer: ClientMessage[] = []

	//#region OBSERVERS

	observe(idObj: string, callback: (data: any) => void) {
		if (!this.observers[idObj]) this.observers[idObj] = []
		this.observers[idObj].push(callback)
	}
	unobserve(idObj: string, callback: (data: any) => void) {
		if (!this.observers[idObj]) return
		this.observers[idObj] = this.observers[idObj].filter(obs => obs != callback)
	}
	private notify(idObj: string, data: any) {
		this.observers[idObj]?.forEach(obs => obs(data))
	}

	//#endregion

	/** chiede al server di restituire/creare un certo oggetto */
	init(idObj: string, send?: boolean): Promise<void> {
		if ( this.objects[idObj] ) {
			this.reset()
			return Promise.resolve()
		}
		const message: ClientInitMessage = {
			type: "c:init",
			payload: { idObj }
		}
		return new Promise<void>(resolve => {
			this.initResolve = resolve
			this.buffer.push(message)
			if (send) this.update()
		})
	}

	/** memorizza nel buffer una richiesta di update dell'OBJECT osservato*/
	command(idObj: string, command: any) {
		const object = this.objects[idObj]
		if (!object) throw new Error("Object not found")
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

	/** dice al SERVER a che versione sono i suoi OBJECT */
	reset() {
		const message: ClientResetMessage = {
			type: "c:reset",
			payload: Object.values(this.objects).map(obj => ({ idObj: obj.idObj, version: obj.version }))
		}
		this.onSend(message)
	}

	/** invia al server tutti i command memorizzati nel buffer */
	update() {
		this.buffer.forEach(message => this.onSend(message))
		this.buffer = []
	}





	/** stringa messaggio da analizzare */
	receive(messageStr: string) {
		const message = JSON.parse(messageStr)
		switch (message.type) {
			case "s:init": {
				const msgInit = message as ServerInitMessage
				this.setObject(msgInit.idObj, msgInit.data, msgInit.version)
				if (this.initResolve) {
					this.initResolve()
					this.initResolve = null
				}
				break
			}
			case "s:update": {
				const msgUp = message as ServerUpdateMessage
				this.updateObject(msgUp.idObj, msgUp.actions)
				break
			}
		}
	}

	private setObject(idObj: string, value: any[], version: number) {
		this.objects[idObj] = { idObj, value, version }
		this.notify(idObj, value)
	}

	private updateObject(idObj: string, actions: Action[]) {
		const obj = this.objects[idObj]
		if (!obj) throw new Error("Object not found")

		actions.forEach(action => obj.value = this.apply(obj.value, action))
		obj.version = actions[actions.length - 1].version
		this.notify(idObj, obj.value)
	}
}