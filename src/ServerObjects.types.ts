

// *** SERVER ***


export interface ServerObject {
	idObj: string
	value: any[]
	listeners: Listener[]
	actions: Action[]
}

export interface Listener {
	client: any
	lastVersion: number
}

export interface Action {
	/** qaulsiasi comando che permetta l'aggiornamento */
	command: any
	/** la versione in cui è stato eseguito questo command */
	atVersion: number
	/** l'ordine in cui è memorizzato il COMMAND nel SERVER  */
	version: number
}

// MESSAGES
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

