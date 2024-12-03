import { Action } from "./ServerObjects.types.js"



//#region *** DATA ***

/**
 * il proxy locale dell'OBJECT remoto `idObj`
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
 * dice al SERVER che il CLIENT vuole ricevere e osservare un OBJECT
 */
export interface ClientInitMessage {
	type: "c:init"
	/** l'id del CLIENT serve per registrarmi sul SEERVER */
	clientId: string
	/** id dell OBJECT a cui siamo interessati */
	idObj: string
}

/** 
 * dice al SERVER a quale versione il CLIENT è arrivato 
 * su tutti gli OBJECTs osservati 
 * Serve quando il client si disconnette e si riconnette
 * */
export interface ClientResetMessage {
	type: "c:reset"
	clientId: string
	payload: {
		idObj: string,
		version: number,
	}[]
}

/** 
 * dice al SERVER che il CLIENT ha eseguito un comando di aggiornamento su un OBJECT osservato
 * */
export interface ClientUpdateMessage {
	type: "c:update"
	idObj: string
	action: Action
}

export type ClientMessage = ClientInitMessage | ClientUpdateMessage | ClientResetMessage

/**
 * Applica un'ACTION ad un oggetto e restituisce l'oggetto modificato
 * Viene implementata per condividere diversi tipi di dato
 * IMPORTANTE: deve essere implementata in modo che sia possibile chiamarla con parametri nulli (inizializzazione)
 */
export type ApplyCommandFunction = (data?: any, command?: any) => any

//#endregion