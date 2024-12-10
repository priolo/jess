//#region *** DATA ***

/**
 * The OBJECT `idObj` that the SERVER updates and synchronizes with the CLIENTS
 */
export interface ServerObject {
	idObj: string
	value: any
	/** all CLIENTS listening */
	listeners: Listener[]
	actions: Action[]
	version: number
}

/**
 * Listening of a CLIENT on an OBJECT
 */
export interface Listener {
	client: any
	/** the version of the update the CLIENT has reached */
	lastVersion: number
}

/**
 * An update action for the value of an OBJECT
 */
export interface Action {
	idClient: string
	/** together with `idClient` allows identifying the action */
	counter: number
	/** any command that allows the update */
	command: any
	/** the order in which the COMMAND is stored on the SERVER
	 * that is, this update brings the object to which version
	 **/
	version?: number
}

//#endregion

//#region *** MESSAGES ***

export type ServerMessage = ServerInitMessage | ServerUpdateMessage

export interface ServerInitMessage {
	type: ServerMessageType.INIT
	idObj: string
	data: any
	version: number
}

export interface ServerUpdateMessage {
	type: ServerMessageType.UPDATE
	idObj: string		
	actions: Action[]
}

export enum ServerMessageType {
	INIT = "s:init",
	UPDATE = "s:update",
}
//#endregion