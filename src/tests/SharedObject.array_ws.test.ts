import WebSocket, { WebSocketServer } from 'ws';
import { ApplyCommands, TYPE_ARRAY_COMMAND } from "../applicators/ArrayApplicator";
import { ClientObjects } from "../ClientObjects.js";
import { ServerObjects } from "../ServerObjects.js";
import { delay } from "../utils";



let PORT = 8080

/**
 * Creates a WebSocket server
 */
function WSServer(): [ServerObjects, WebSocketServer] {


	const server = new ServerObjects()
	server.apply = ApplyCommands
	server.onSend = async (ws: WebSocket, message) => ws.send(JSON.stringify(message))

	const wss = new WebSocketServer({ port: PORT })
	wss.on('connection', (ws: WebSocket) => {
		ws.on('message', (data: string) => server.receive(data.toString(), ws))
		ws.on('close', () => server.disconnect(ws))
	})

	return [server, wss]
}

async function WSClient(cli?: ClientObjects): Promise<[ClientObjects, WebSocket]> {
	const ws = new WebSocket('ws://localhost:8080');

	const client = cli ?? new ClientObjects()
	client.apply = ApplyCommands
	client.onSend = async (message) => ws.send(JSON.stringify(message))
	ws.on('message', (data: string) => client.receive(data));

	// wait for the connection to be open
	return new Promise(resolve => ws.on('open', () => resolve([client, ws])))
}


beforeAll(async () => {
})

afterAll(async () => {
})

test("synchronization of an array between CLIENT and SERVER", async () => {
	console.log("*** PORT", PORT)
	const [server, wss] = WSServer()
	const [client, wsc] = await WSClient()

	await client.init("my-object", true)
	await delay(200)

	// create the buffer of changes
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })
	// send them to the server (the client)
	client.update()
	await delay(200)

	// the server must update all clients
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


test("synchronize two CLIENTS with the SERVER", async () => {
	const [server, wss] = WSServer()
	const [client1, wsc1] = await WSClient()
	const [client2, wsc2] = await WSClient()

	await client1.init("my-object", true)
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 1" })
	await client2.init("my-object", true)
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row from 1" })
	client2.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 2" })
	await client2.update()
	await client1.update()
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

test("simulate a CLIENT disconnection", async () => {
	const [server, wss] = WSServer()
	const [client1, wsc1] = await WSClient()
	const [client2, wsc2] = await WSClient()

	await client1.init("my-object", true)
	await client2.init("my-object", true)

	// 1 creates a COMMAND and sends it to the server
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 1" })
	client1.update()
	// 2 creates two COMMANDS
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row from 1" })
	client2.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 2" })

	// 1 disconnects
	wsc1.close()
	// 2 sends its COMMAND
	client2.update()
	await delay(200)
	// the SERVER updates the CLIENTS (in this case only 2)
	server.update()

	// 1 reconnects and sends its COMMANDS
	await WSClient(client1)
	client1.reset()
	client1.update()
	await delay(200)

	// the SERVER updates the CLIENTS (in this case 1 and 2)
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

test("[II] cannot handle try in a JEST test! the CLIENT starts offline", async () => {
	const [server, wss] = WSServer()
	const client = new ClientObjects()
	client.apply = ApplyCommands


	function wrapInit() {
		client.init("my-object", true)
	}
	function wrapUpdate() {
		client.update()
	}


	expect(wrapInit).toThrow()
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 1" })
	expect(wrapUpdate()).toThrow()

	// the client connects
	const [_, wsc] = await WSClient(client)
	await client.reset()
	await client.update()
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

test("verify SERVER GC functionality", async () => {
	const [server, wss] = WSServer()
	// set the minimum number of actions to keep to 0
	// this way, immediately remove all ACTIONS that are no longer useful
	server.bufferMin = 0
	const [client1, wsc1] = await WSClient()
	const [client2, wsc2] = await WSClient()

	// CLIENT-1 requests the resource "my-object"
	await client1.init("my-object", true)
	// CLIENT-1 sends a COMMAND and the SERVER goes to version 1
	client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "client 1 row 1" })
	client1.update()
	await delay(200)

	// the server updates CLIENT-1 to version 1 (first COMMAND)
	// after this, it checks that all listeners of "my-object" are at the latest version
	// then removes the ACTIONS that are no longer useful (in this case all because there is only CLIENT-1)
	server.update()
	await delay(200)
	expect(server.objects["my-object"].actions.length).toBe(0)
	expect(server.objects["my-object"].version).toBe(1)

	// CLIENT-1 sends 5 COMMANDs (the server goes to version 6)
	Array.from({ length: 5 }, (_, i) => `client 1 row ${i}`)
		.forEach(row => client1.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: row }))
	client1.update()
	await delay(200)
	// there should be 5 actions stored on the server
	expect(server.objects["my-object"].actions.length).toBe(5)
	expect(server.objects["my-object"].version).toBe(6)


	// CLIENT-2 requests the same resource and goes to version 6.
	// While CLIENT-1 remains at version 1 because the SERVER has not yet distributed updates
	await client2.init("my-object", true)
	// CLIENT-2 sends a change and the SERVER goes to version 7
	client2.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "client 2 row 1" })
	client2.update()
	await delay(200)
	// the number of actions stored on the server
	expect(server.objects["my-object"].actions.length).toBe(6)
	expect(server.objects["my-object"].version).toBe(7)

	// the SERVER updates both CLIENT-1 and CLIENT-2 to version 7 and resets the ACTIONS
	server.update()
	await delay(200)
	expect(server.objects["my-object"].actions.length).toBe(0)
	expect(server.objects["my-object"].version).toBe(7)

	wss.close()
	wsc1.close()
	wsc2.close()
})