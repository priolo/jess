import { ApplyCommands, TYPE_ARRAY_COMMAND } from "../applicators/ArrayApplicator"
import { ClientObjects } from "../ClientObjects"
import { ServerObjects } from "../ServerObjects"
import { ServerUpdateMessage } from "../ServerObjects.types"
import { delay } from "../utils"



/**
 * Create a CLIENT and a SERVER locally connected so they can communicate with each other
 */
function buildClientAndServer() {
	const server = new ServerObjects()
	const client = new ClientObjects()
	/** when I need to send to the server, I write directly to the "receiver" */
	server.onSend = async (client, message) => client.receive(JSON.stringify(message))
	/** when I need to send to the client, I write directly to the "receiver" */
	client.onSend = async (messages) => server.receive(JSON.stringify(messages), client)
	/** use an "apply" on array */
	server.apply = ApplyCommands
	client.apply = ApplyCommands
	return { server, client }
}


beforeAll(async () => {
})

afterAll(async () => {
})

test("synchronization of an array between CLIENT and SERVER", async () => {
	const { server, client } = buildClientAndServer()

	await client.init("my-object", true)
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })
	client.command("my-object", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })
	await client.update()
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
	myServer.apply = ApplyCommands
	myClient.onSend = async (message) => myServer.receive(JSON.stringify(message), myClient)
	myClient.apply = ApplyCommands

	await myClient.init("my-doc", true)
	myClient.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
	myClient.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
	myClient.update()
	myClient.command("my-doc", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })
	myClient.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })

	// simulate disconnection
	myServer.disconnect(myClient)
	await delay(200)

	// simulate reconnection
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
	myServer.apply = ApplyCommands
	const myClient1 = new ClientObjects()
	myClient1.apply = ApplyCommands
	myClient1["name"] = "client1"
	const myClient2 = new ClientObjects()
	myClient2.apply = ApplyCommands
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

	await myClient1.update()
	await myClient2.update()

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


test("correct reconstruction", async () => {
	const server = new ServerObjects()
	server.apply = ApplyCommands
	server.onSend = async (client: ClientObjects, message) => client.receive(JSON.stringify(message))
	const client = new ClientObjects()
	client.apply = ApplyCommands
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
	expect(client.getObject("my-doc").valueTemp).toEqual(expectedClientTemp)
})

test("init reconstruction", async () => {
	const client = new ClientObjects()
	client.apply = ApplyCommands
	client.onSend = async (message) => {}

	client.init("my-doc", true)

	const expectedClient = []
	expect(client.getObject("my-doc").value).toEqual(expectedClient)
	expect(client.getObject("my-doc").valueTemp).toEqual(expectedClient)
})


test("optimize send to clients if there is only one intervention", async () => {
	let serverMsgToSend:ServerUpdateMessage | null = null
	const server = new ServerObjects()
	server.apply = ApplyCommands
	server.onSend = async (client: ClientObjects, message) => {
		if ( message.type == "s:update" ) serverMsgToSend = message
		client.receive(JSON.stringify(message))
	}
	const client = new ClientObjects()
	client.apply = ApplyCommands
	client.onSend = async (message) => server.receive(JSON.stringify(message), client)

	client.init("my-doc")
	client.command("my-doc", { type: TYPE_ARRAY_COMMAND.ADD, payload: "A-1" })
	await client.update()

	server.update()

	if (serverMsgToSend != null) {
		expect((serverMsgToSend as ServerUpdateMessage).actions[0].command).toBeNull();
	}
})