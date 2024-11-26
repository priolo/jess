
export interface ServerObject {
	idObj: string
	value: any[]
	listeners: Listener[]
	actions: Action[]
	version: number
}

export interface Listener {
	client: any
	lastVersion: number
}

export interface Action {
	idClient: string
	counter: number
	/** qaulsiasi comando che permetta l'aggiornamento */
	command: any
	/** la versione in cui è stato eseguito questo command */
	//atVersion: number
	/** l'ordine in cui è memorizzato il COMMAND nel SERVER 
	 * cioe' questo aggiornamento porta l'oggetto a che versione 
	 **/
	version?: number
}

// MESSAGES
export type ServerMessage = ServerInitMessage | ServerUpdateMessage

export interface ServerInitMessage {
	type: "s:init"
	idObj: string
	data: any[]
	version: number
}

export interface ServerUpdateMessage {
	type: "s:update"
	idObj: string		
	actions: Action[]
}
