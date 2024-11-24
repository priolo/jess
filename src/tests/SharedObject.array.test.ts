import { ClientObjects } from "../ClientObjects"
import { ServerObjects } from "../ServerObjects"
import { delay } from "../utils"
import { ApplyAction, TYPE_ARRAY_COMMAND } from "../applicators/ArrayApplicator"



/**
 * Creo un CLIET e un SERVER legati localmente in modo che possano comunicare tra loro
 */
function buildClientAndServer() {
	const server = new ServerObjects()
	const client = new ClientObjects()
	/** quando devo inviare al server scrivo direttamente sul "receiver" */
	server.onSend = async (client, message) => client.receive(JSON.stringify(message))
	/** quando devo inviare al client scrivo direttamente sul "receiver" */
	client.onSend = async (messages) => server.receive(JSON.stringify(messages), client)
	/** uso un "apply" su array */
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
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })
	client.update()
	server.update()

	expect(server.objects["my-object"].value).toEqual([
		"first row",
		"third row",
	])
	expect(client.getObject("my-object").value).toEqual([
		"first row",
		"third row",
	])
})


test("send actions", async () => {
	const myServer = new ServerObjects()
	const myClient = new ClientObjects()
	myServer.onSend = async (client: ClientObjects, message) => client.receive(JSON.stringify(message))
	myServer.apply = ApplyAction
	myClient.onSend = async (message) => myServer.receive(JSON.stringify(message), myClient)
	myClient.apply = ApplyAction

	await myClient.init("my-doc", true)
	myClient.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
	myClient.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
	myClient.update()
	myClient.command("my-doc", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })
	myClient.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })

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

	expect(myServer.objects["my-doc"].value).toEqual(expected)
	expect(myClient.getObject("my-doc").value).toEqual(expected)
})


test("send actions 2 client", async () => {
	const myServer = new ServerObjects()
	myServer.apply = ApplyAction
	const myClient1 = new ClientObjects()
	myClient1.apply = ApplyAction
	myClient1["name"] = "client1"
	const myClient2 = new ClientObjects()
	myClient2.apply = ApplyAction
	myClient2["name"] = "client2"

	myServer.onSend = async (client: ClientObjects, message) => {
		client.receive(JSON.stringify(message))
	}
	myClient1.onSend = async (message) => {
		myServer.receive(JSON.stringify(message), myClient1)
	}
	myClient2.onSend = async (message) => {
		myServer.receive(JSON.stringify(message), myClient2)
	}

	myClient1.init("my-doc")

	myClient1.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row from 1" })
	myClient2.init("my-doc")
	myClient1.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row from 1" })

	myClient1.update()
	myClient2.update()

	myServer.update()
	myServer.update()

	const expected = [
		"first row from 1",
		"second row from 1",
	]

	expect(myServer.objects["my-doc"].value).toEqual(expected)
	expect(myClient1.getObject("my-doc").value).toEqual(expected)
	expect(myClient2.getObject("my-doc").value).toEqual(expected)
})


test("correct recostruction", async () => {
	const server = new ServerObjects()
	server.apply = ApplyAction
	server.onSend = async (client: ClientObjects, message) => client.receive(JSON.stringify(message))
	const client = new ClientObjects()
	client.apply = ApplyAction
	client.onSend = async (message) => server.receive(JSON.stringify(message), client)

	client.init("my-doc")
	client.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "A-1" })
	await client.update()
	server.update()
	client.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "A-2" })
	await client.update()
	client.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "A-3" })

	const expectedServer = ["A-1", "A-2"]
	const expectedClient = ["A-1"]
	const expectedClientTemp = ["A-1", "A-2", "A-3"]
	expect(server.objects["my-doc"].value).toEqual(expectedServer)
	expect(client.getObject("my-doc").value).toEqual(expectedClient)
	expect(client.getObject("my-doc").valueWait).toEqual(expectedClientTemp)
	expect(client.getWaitValue("my-doc")).toEqual(expectedClientTemp)
})

test("init recostruction", async () => {
	const client = new ClientObjects()
	client.apply = ApplyAction
	client.onSend = async (message) => {}

	client.init("my-doc", true)

	const expectedClient = []
	expect(client.getObject("my-doc").value).toEqual(expectedClient)
	expect(client.getObject("my-doc").valueWait).toEqual(expectedClient)
})


test("ottimizza il send ai client se c'e' solo un intervento", async () => {
	const myServer = new ServerObjects()
	myServer.apply = ApplyAction
	const myClientA = new ClientObjects()
	myClientA.apply = ApplyAction
	myClientA["name"] = "client1"
	const myClientB = new ClientObjects()
	myClientB.apply = ApplyAction
	myClientB["name"] = "client2"



	const expected = [
	]

	expect(myServer.objects["my-doc"].value).toEqual(expected)
	expect(myClientA.getObject("my-doc").value).toEqual(expected)
	expect(myClientB.getObject("my-doc").value).toEqual(expected)
})