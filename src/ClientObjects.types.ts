
// DATA

import { Action } from "./ServerObjects.types"

/**
 * il proxy locale dell'oggetto remoto idObj
 */
export interface ClientObject {
	/** identificativo */
	idObj: string
	/** valore locale */
	value: any[]
	/** ultima versione di aggiornamento */
	version: number
}

// MESSAGES

/**
 * dice al server che il client vuole ricevere e osservare un OBJECT
 */
export interface ClientInitMessage {
	type: "c:init"
	payload: {
		idObj: string
	}
}

/** 
 * dice al server a quale versione il client è arrivato su tutti gli OBJECTs osservati 
 * Serve quando il client si disconnette e si riconnette
 * */
export interface ClientResetMessage {
	type: "c:reset"
	payload: {
		idObj: string,
		version: number,
	}[]
}

/** 
 * dice al server che il client ha eseguito un comando di aggiornamento su un OBJECT osservato
 * */
export interface ClientUpdateMessage {
	type: "c:update"
	payload: {
		idObj: string, // id dell'Obj
		atVersion: number,
		command: any,
	}
}

export type ClientMessage = ClientInitMessage | ClientUpdateMessage | ClientResetMessage

/**
 * Applica un'ACTION ad un oggetto e restituisce l'oggetto modificato
 * Viene implementata per condividere diversi tipi di dato
 * IMPORTANTE: deve essere implementata in modo che sia possibile chiamarla con parametri nulli (inizializzazione)
 */
export type ApplyActionFunction = (data?: any, action?: Action) => any;