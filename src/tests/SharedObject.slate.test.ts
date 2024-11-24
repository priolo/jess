import { ClientObjects } from "../ClientObjects.js"
import { ServerObjects } from "../ServerObjects.js"
import { ApplyActions } from "../applicators/SlateApplicator.js"



beforeAll(async () => {
})

afterAll(async () => {
})

test("send actions", async () => {
	const myServer = new ServerObjects()
	const myClient = new ClientObjects()

	myServer.apply = ApplyActions
	myServer.onSend = async (client, message) => {
		(<ClientObjects>client).receive(JSON.stringify(message))
	}
	myClient.apply = ApplyActions
	myClient.onSend = async (message) => {
		myServer.receive(JSON.stringify(message), myClient)
	}

	await myClient.init("my-doc")
	myClient.command("my-doc", {
		"type": "insert_text",
		"path": [0, 0], "offset": 0,
		"text": "pluto"
	})
	myClient.command("my-doc", {
		"type": "remove_text",
		"path": [0, 0], "offset": 2,
		"text": "ut"
	})
	myServer.update()
	myClient.update()
	myServer.update()

	const expected = [
		{ children: [{ text: "plo", }] },
	]

	expect(myServer.objects["my-doc"].value).toEqual(expected)
	expect(myClient.getObject("my-doc").value).toEqual(expected)
})

