import WebSocket, { WebSocketServer } from 'ws';
import { ClientObjects } from "../src/ClientObjects"
import { ServerObjects } from "../src/ServerObjects"
import { delay } from "../src/utils"
import { ApplyAction, TYPE_ARRAY_COMMAND } from "../src/applicators/ArrayApplicator"



/**
 * Creo un CLIET e un SERVER legati localmente in modo che possano comunicare tra loro
 */
// function buildClientAndServer() {
// 	const server = new ServerObjects()
// 	const client = new ClientObjects()
// 	server.onSend = async (client, message) => client.receive(JSON.stringify(message))
// 	client.onSend = async (message) => server.receive(JSON.stringify(message), client)
// 	server.apply = ApplyAction
// 	client.apply = ApplyAction
// 	return { server, client }
// }


/**
 * Crea un server WebSocket
 */
function WSServer(): [ServerObjects, WebSocketServer] {

	const server = new ServerObjects()
	server.apply = ApplyAction
	server.onSend = async (ws: WebSocket, message) => ws.send(JSON.stringify(message))

	const wss = new WebSocketServer({ port: 8080 })
	wss.on('connection', (ws: WebSocket) => {
		ws.on('message', (data: string) => server.receive(data.toString(), ws))
		ws.on('close', () => server.disconnect(ws))
	})

	return [server, wss]
}

async function WSClient(cli?: ClientObjects): Promise<[ClientObjects, WebSocket]> {
	const ws = new WebSocket('ws://localhost:8080');

	const client = cli ?? new ClientObjects()
	client.apply = ApplyAction
	client.onSend = async (message) => ws.send(JSON.stringify(message))
	ws.on('message', (data: string) => client.receive(data));

	// aspetta che la connessione sia aperta
	return new Promise(resolve => ws.on('open', () => resolve([client, ws])))
}


beforeAll(async () => {
})

afterAll(async () => {
})

test("sincronizzazione di un array tra CLIENT e SERVER", async () => {
	const [server, wss] = WSServer()
	const [client, wsc] = await WSClient()

	await client.init("my-object", true)
	await delay(200)

	// creo il buffer delle modifiche
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })
	// le invio al server (il client )
	client.update()
	await delay(200)

	// il server deve aggiornare tutti i client
	server.update()
	await delay(200)


	expect(server.objects["my-object"].value).toEqual([
		"first row",
		"third row",
	])
	expect(client.getObject("my-object").value).toEqual([
		"first row",
		"third row",
	])
	wss.close()
	wsc.close()
})


test("sincronizza due CLIENT con il SERVER", async () => {
	const [server, wss] = WSServer()
	const [client1, wsc1] = await WSClient()
	const [client2, wsc2] = await WSClient()

	await client1.init("my-object", true)

	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 1" })
	await client2.init("my-object", true)
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row from 1" })
	client2.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 2" })
	client2.update()
	client1.update()
	await delay(200)

	server.update()
	await delay(200)

	
	const expected = [
		"first row from 2",
		"first row from 1",
		"second row from 1",
	]
	expect(server.objects["my-object"].value).toEqual(expected)
	expect(client1.getObject("my-object").value).toEqual(expected)
	expect(client2.getObject("my-object").value).toEqual(expected)
	wss.close()
	wsc1.close()
	wsc2.close()
})


test("simula una disconnessione di un CLIENT", async () => {
	const [server, wss] = WSServer()
	const [client1, wsc1] = await WSClient()
	const [client2, wsc2] = await WSClient()

	await client1.init("my-object", true)
	await client2.init("my-object", true)

	// 1 crea un COMMAND e lo invia al server
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 1" })
	client1.update()
	// 2 crea due COMMAND
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row from 1" })
	client2.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 2" })

	// 1 si disconnette
	wsc1.close()
	// 2 invia il suo COMMAND
	client2.update()
	await delay(200)
	// il SERVER aggiorna i CLIENT (in questo caso solo il 2)
	server.update()

	// 1 si riconnette e invia i suoi COMMAND
	await WSClient(client1)
	client1.reset()
	client1.update()
	await delay(200)

	// il SERVER aggiorna i CLIENT (in questo caso 1 e 2)
	server.update()
	await delay(200)

	
	const expected = [
		"first row from 1",
		"first row from 2",
		"second row from 1",
	]
	expect(server.objects["my-object"].value).toEqual(expected)
	expect(client1.getObject("my-object").value).toEqual(expected)
	expect(client2.getObject("my-object").value).toEqual(expected)
	wss.close()
	wsc1.close()
	wsc2.close()
})

test("il CIENT inizia offline", async () => {
	const [server, wss] = WSServer()
	const client = new ClientObjects()

	client.init("my-object", true)
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 1" })
	client.update()
	await delay(200)

	// il client si connette
	const [_, wsc] = await WSClient(client)
	client.reset()
	client.update()
	await delay(200)
	
	server.update()
	await delay(200)
	
	const expected = [
		"first row from 1",
	]
	expect(server.objects["my-object"].value).toEqual(expected)
	expect(client.getObject("my-object").value).toEqual(expected)

	wss.close()
	wsc.close()
})


test("verifica funzionamento del GC sul SERVER", async () => {
	const [server, wss] = WSServer()
	// setto il minimo di action da conservare a 0
	// in questa maniera elimino subito tutte le ACTION che non sono piu' utili
	server.bufferMin = 0
	const [client1, wsc1] = await WSClient()
	const [client2, wsc2] = await WSClient()

	// CLIENT-1 chiede la risorsa "my-object"
	await client1.init("my-object", true)
	// CLIENT-1 invia un COMMAND e il SERVER va alla versione 1
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "client 1 row 1" })
	client1.update()
	await delay(200)

	// il server aggiorna CLIENT-1 alla versione 1 (primo COMMAND)
	// fatto questo controlla che tutti i listener di "my-object" sono all'ultima versione 
	// quindi elimina le ACTIONS che non sono piu' utili (in questo caso tutte perche' c'e' solo CLIENT-1)
	server.update()
	await delay(200)
	expect(server.objects["my-object"].actions.length).toBe(0)
	expect(server.objects["my-object"].version).toBe(1)

	// CLIENT-1 invia 5 COMMANDs (il server va alla versione 6)
	Array.from({ length: 5 }, (_, i) => `client 1 row ${i}`)
		.forEach(row => client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: row }))
	client1.update()
	await delay(200)
	// ci dovrebbero essere 5 action memorizzate nel server
	expect(server.objects["my-object"].actions.length).toBe(5)
	expect(server.objects["my-object"].version).toBe(6)


	// CLIENT-2 chiede la stessa risorsa e va alla versione 6. 
	// Mentre CLIENT-1 rimane alla versione 1 perchè il SERVER non ha ancora smistato aggiornamenti
	await client2.init("my-object", true)
	// CLIENT-2 invia una modifica e il SERVER va alla versione 7
	client2.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "client 2 row 1" })
	client2.update()
	await delay(200)
	// il numero di action memorizzate nel server
	expect(server.objects["my-object"].actions.length).toBe(6)
	expect(server.objects["my-object"].version).toBe(7)

	// il SERVER aggiorna sia CLIENT-1 che CLIENT-2 alla versione 7 azzera le ACTIONs
	server.update()
	await delay(200)
	expect(server.objects["my-object"].actions.length).toBe(0)
	expect(server.objects["my-object"].version).toBe(7)

	wss.close()
	wsc1.close()
	wsc2.close()
})