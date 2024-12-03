import { ServerObjects, TextApplicator, SlateApplicator } from '@priolo/jess';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 })
const server = new ServerObjects()
server.apply = TextApplicator.ApplyCommands
let timeoutId: any = null

wss.on('connection', (ws) => {
    console.log('New client connected')

	server.onSend = async (client:WebSocket, message) => client.send(JSON.stringify(message))
    
    ws.on('message', (message) => {
        console.log(`Received message => ${message}`)

		server.receive(message.toString(), ws)

        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => server.update(), 1000)
    })

    ws.on('close', () => server.disconnect(ws))
})

console.log('WebSocket server is running on ws://localhost:8080')