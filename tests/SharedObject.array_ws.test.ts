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
	client.onSend = async (message) => ws.send(JSON.stringify(message))
	client.apply = ApplyAction

	ws.on('message', (data: string) => client.receive(data));
	return new Promise(resolve => ws.on('open', () => resolve([client, ws])))
}


beforeAll(async () => {
})

afterAll(async () => {
})

test("sincronizzazione di un array tra CLIENT e SERVER", async () => {
	const [server] = WSServer()
	const [client] = await WSClient()

	await client.init("my-object", true)
	await delay(200)

	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })
	client.update()
	await delay(200)

	server.update()
	await delay(200)

	expect(server.objects["my-object"].value).toEqual([
		"first row",
		"third row",
	])
	expect(client.objects["my-object"].value).toEqual([
		"first row",
		"third row",
	])
}, 100000)


test("sincronizza due CLIENT con il SERVER", async () => {
	const [server] = WSServer()
	const [client1] = await WSClient()
	const [client2] = await WSClient()

	await client1.init("my-object", true)

	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 1" })
	await delay(200)
	await client2.init("my-object", true)
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row from 1" })
	await delay(200)
	client2.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 2" })
	await delay(200)
	client2.update()
	client1.update()
	await delay(200)

	server.update()
	await delay(200)

	const expected = [
		"first row from 1",
		"second row from 1",
		"first row from 2",
	]
	expect(server.objects["my-object"].value).toEqual(expected)
	expect(client1.objects["my-object"].value).toEqual(expected)
	expect(client2.objects["my-object"].value).toEqual(expected)

}, 100000)


test("simula una disconnessione di un CLIENT", async () => {
	const [server] = WSServer()
	const [client1, wsc1] = await WSClient()
	const [client2] = await WSClient()

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
	expect(client1.objects["my-object"].value).toEqual(expected)
	expect(client2.objects["my-object"].value).toEqual(expected)

}, 100000)


test("verifica funzionamento del GC sul SERVER", async () => {
	const [server] = WSServer()
	const [client1] = await WSClient()
	const [client2] = await WSClient()

	// 1 chiede una risorsa
	await client1.init("my-object", true)
	// client 1 invia un COMMAND 
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "client 1 row 1" })
	client1.update()
	await delay(200)

	// il server riceve e aggiorna CLIENT 1 alla versione 1 (primo COMMAND)
	// tutti i listener di "my-object" sono all'ultima versione (solo CLIENT1) quindi elimina le ACTIONS
	// il GC non avviene immediatamente bisogna aspettare almeno un paio di update del SERVER
	server.update()
	await delay(200)
	server.update()
	expect(server.objects["my-object"].actions.length).toBe(0)

	// 1 invia un po' di modifiche (il server è alla versione 6)
	Array.from({ length: 5 }, (_, i) => `client 1 row ${i}`)
		.forEach(row => client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: row }))
	client1.update()

	expect(server.objects["my-object"].actions.length).toBe(0)

	// 2 chiede la stessa risorsa e va alla versione 6. Mentre client 1 rimane alla versione 1
	await client2.init("my-object", true)
	// 2 invia una modifica e il server che va alla versione 7
	client2.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "client 2 row 1" })
	client2.update()

	// il numero di action memorizzate nel server
	expect(server.objects["my-object"].actions.length).toBe(7)

	// il server aggiorna sia 1 che 2 ala versione 7
	server.update()





}, 100000)