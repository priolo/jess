
//#region *** DATA ***

/**
 * l OBJECT `idObj` che il SERVER aggiorna e sincronizza con i CLIENT
 */
export interface ServerObject {
	idObj: string
	value: any
	/** tutti i CLIENT in ascolto */
	listeners: Listener[]
	actions: Action[]
	version: number
}

/**
 * l'ascolto di un CLIENT su un OBJECT
 */
export interface Listener {
	client: any
	/** a che versione di aggiornamento è arrivato il CLIENT */
	lastVersion: number
}

/**
 * un'azione di aggiornamento per il value di un OBJECT
 */
export interface Action {
	idClient: string
	/** insieme all' `idClient` permette di identificare la action*/
	counter: number
	/** qaulsiasi comando che permetta l'aggiornamento */
	command: any
	/** l'ordine in cui è memorizzato il COMMAND nel SERVER 
	 * cioe' questo aggiornamento porta l'oggetto a che versione 
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