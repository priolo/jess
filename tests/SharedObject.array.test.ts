import { ClientObjects } from "../src/ClientObjects"
import { ServerObjects } from "../src/ServerObjects"
import { delay } from "../src/utils"
import { ApplyAction, TYPE_ARRAY_COMMAND } from "../src/applicators/ArrayApplicator"


/**
 * Creo un CLIET e un SERVER legati localmente in modo che possano comunicare tra loro
 */
function buildClientAndServer() {
	const server = new ServerObjects()
	const client = new ClientObjects()
	server.onSend = async (client, message) => client.receive(JSON.stringify(message))
	client.onSend = async (message) => server.receive(JSON.stringify(message), client)
	server.apply = ApplyAction
	client.apply = ApplyAction
	return { server, client }
}


beforeAll(async () => {
})

afterAll(async () => {
})

test("sincronizzazione di un array tra CLIENT e SERVER", async () => {
	const { server, client } = buildClientAndServer()

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



test("send actions", async () => {
	const myServer = new ServerObjects()
	const myClient = new ClientObjects()
	myServer.onSend = async (client, message) => (<ClientObjects>client).receive(JSON.stringify(message))
	myServer.apply = ApplyAction
	myClient.onSend = async (message) => myServer.receive(JSON.stringify(message), myClient)
	myClient.apply = ApplyAction


	await myClient.init("pippo", true)
	myClient.command("pippo", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
	myClient.command("pippo", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
	myClient.update()
	myClient.command("pippo", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1})
	myClient.command("pippo", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })


	// simulo la disconnessione
	myServer.disconnect(myClient)
	await delay(200)

	// simulo la riconnessione
	myClient.reset()
	await delay(200)
	myClient.update()
	await delay(200)
	myServer.update()
	await delay(200)
	myServer.update()

	const expected = [
		"first row",
		"third row",
	]

	expect(myServer.objects["pippo"].value).toEqual(expected)
	expect(myClient.objects["pippo"].value).toEqual(expected)
}, 100000)


test("send actions 2 client", async () => {
	const myServer = new ServerObjects()
	const myClient1 = new ClientObjects()
	myClient1["name"] = "client1"
	const myClient2 = new ClientObjects()
	myClient2["name"] = "client2"

	// const serverCom = new MemServerComunication(myServer)
	// const clientCom1 = new MemClientComunication(myClient1, serverCom)
	// const clientCom2 = new MemClientComunication(myClient2, serverCom)
	myServer.onSend = async (client, message) => {
		(<ClientObjects>client).receive(JSON.stringify(message))
	}
	myClient1.onSend = async (message) => {
		myServer.receive(JSON.stringify(message), myClient1)
	}
	myClient2.onSend = async (message) => {
		myServer.receive(JSON.stringify(message), myClient2)
	}


	myClient1.observe("pippo", (data) => {
		console.log("client1", data)
	})
	myClient2.observe("pippo", (data) => {
		console.log("client2", data)
	})

	myClient1.init("pippo")
	await delay(500)

	myClient1.command("pippo", "add")
	await delay(200)
	myClient2.init("pippo")
	myClient1.command("pippo", "add")

	await delay(200)
	myServer.update()
	await delay(500)
	myServer.update()
	await delay(1000)

	expect(myServer.objects["pippo"].value).toEqual([
		"add row version 1",
		"add row version 2",
	])
	expect(myClient1.objects["pippo"].value).toEqual([
		"add row version 1",
		"add row version 2",
	])
	expect(myClient2.objects["pippo"].value).toEqual([
		"add row version 1",
		"add row version 2",
	])
}, 100000)

test("init and fast update sync", async () => {
	const myServer = new ServerObjects()
	const myClient = new ClientObjects()
	myServer.onSend = async (client, message) => {
		(<ClientObjects>client).receive(JSON.stringify(message))
	}
	myClient.onSend = async (message) => {
		myServer.receive(JSON.stringify(message), myClient)
	}
	// const serverCom = new MemServerComunication(myServer)
	// const clientCom = new MemClientComunication(myClient, serverCom)

	await myClient.init("pippo")
	myClient.command("pippo", "add")

	await delay(500)
	myServer.update()
	await delay(500)

	expect(myClient.objects["pippo"].value).toEqual([
		"add row version 1",
	])
})

