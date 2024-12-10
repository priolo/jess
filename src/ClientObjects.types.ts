import { Action } from "./ServerObjects.types.js"



//#region *** DATA ***

/**
 * the local proxy of the remote OBJECT `idObj`
 */
export interface ClientObject {
	/** identificativo del CLIENT*/
	idObj: string
	/** valore locale aggiornato dal SERVER*/
	value: any
	/** value locale precalcolato con le ultime ACTIONs*/
	valueTemp: any
	/** ultima versione a cui è aggiornato questo "value" */
	version: number
}

//#endregion



//#region *** MESSAGES ***

/**
 * tells the SERVER that the CLIENT wants to receive and observe an OBJECT
 */
export interface ClientInitMessage {
	type: ClientMessageType.INIT
	/** the CLIENT id is used to register on the SERVER */
	clientId: string
	/** id dell OBJECT a cui siamo interessati */
	idObj: string
}

/** 
 * tells the SERVER which version the CLIENT has reached 
 * on all observed OBJECTs 
 * Used when the client disconnects and reconnects
 * */
export interface ClientResetMessage {
	type: ClientMessageType.RESET
	clientId: string
	payload: {
		idObj: string,
		version: number,
	}[]
}

/** 
 * tells the SERVER that the CLIENT has executed an update command on an observed OBJECT
 * */
export interface ClientUpdateMessage {
	type: ClientMessageType.UPDATE
	idObj: string
	action: Action
}

export type ClientMessage = ClientInitMessage | ClientUpdateMessage | ClientResetMessage

/**
 * Applies an ACTION to an object and returns the modified object
 * It is implemented to share different types of data
 * IMPORTANT: it must be implemented so that it can be called with null parameters (initialization)
 */
export type ApplyCommandFunction = (data?: any, command?: any) => any


export enum ClientMessageType {
	INIT = "c:init",
	UPDATE = "c:update",
	RESET = "c:reset",
}

//#endregion