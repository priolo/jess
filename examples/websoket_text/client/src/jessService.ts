import { ClientObjects, TextApplicator } from "@priolo/jess"

// creo il repository locale degli oggetti
export const clientObjects = new ClientObjects()
// a questo repository applico comandi di tipo testuale
clientObjects.apply = TextApplicator.ApplyCommands

// creao il socket
const socket = new WebSocket(`ws://${window.location.hostname}:${8080}/`);
// connessione al SERVER: osservo l'oggetto con id = "doc"
socket.onopen = () => clientObjects.init("doc", true)
// ricezione di un messaggio da SERVER: lo invio al repsitory lcale
socket.onmessage = (event) => {
	console.log("received:", event.data)
	clientObjects.receive(event.data)
}

// funzione specifica per inviare dei essggi al SERVER (in questo caso uso il WEB SOCKET)
clientObjects.onSend = async (messages) => socket.send(JSON.stringify(messages))

// memorizzo dei COMMANDs e li invio quando tutto è calmo
let idTimeout: NodeJS.Timeout
export function sendCommands (command:any) {
	clientObjects.command("doc", command)
	clearTimeout(idTimeout)
	idTimeout = setTimeout(() => clientObjects.update(), 1000)
}
