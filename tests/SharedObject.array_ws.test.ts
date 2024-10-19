import WebSocket, { WebSocketServer } from 'ws';
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


/**
 * Crea un server WebSocket
 */
function WSServer() {
	const wss = new WebSocketServer({ port: 8080 });
	wss.on('connection', (ws: WebSocket) => {
		console.log('Client connesso');

		// Invia un messaggio al client quando si connette
		ws.send(JSON.stringify({ message: 'Benvenuto al server WebSocket!' }));

		// Gestisci i messaggi ricevuti dal client
		ws.on('message', (data: string) => {
			console.log(`Messaggio ricevuto dal client: ${data}`);

			// Rispondi al client
			ws.send(JSON.stringify({ message: 'Messaggio ricevuto!' }));
		});

		ws.on('close', () => {
			console.log('Client disconnesso');
		});
	});
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

