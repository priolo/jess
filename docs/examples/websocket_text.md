# EXAMPLE WITH WEB SOCKETS

## SERVER
```typescript
import { ServerObjects, TextApplicator } from '@priolo/jess';
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
```

## CLIENT

### CLIENT-OBJECTS AND WEB-SOCKET
`jessService.ts`
```typescript
import { ClientObjects, TextApplicator } from "@priolo/jess"

// create the local repository of objects
export const clientObjects = new ClientObjects()
// apply textual commands to this repository
clientObjects.apply = TextApplicator.ApplyCommands

// create the socket
const socket = new WebSocket(`ws://${window.location.hostname}:${8080}/`);
// connection to the SERVER: observe the object with id = "doc"
socket.onopen = () => clientObjects.init("doc", true)
// receiving a message from the SERVER: send it to the local repository
socket.onmessage = (event) => clientObjects.receive(event.data)

// specific function to send messages to the SERVER (in this case using the WEB SOCKET)
clientObjects.onSend = async (messages) => socket.send(JSON.stringify(messages))

// store COMMANDs and send them when everything is calm
let idTimeout: NodeJS.Timeout
export function sendCommands (command:any) {
	clientObjects.command("doc", command)
	clearTimeout(idTimeout)
	idTimeout = setTimeout(() => clientObjects.update(), 1000)
}
```

### REACT APP
`App.tsx`
```tsx
import { TextApplicator } from '@priolo/jess';
import { useEffect, useRef, useState } from 'react';
import { clientObjects, sendCommands } from './jessService';

function App() {

	const [text, setText] = useState('')
	// Optional. Store the selection to prevent the cursor from moving
	const lastSelection = useRef({ start: 0, end: 0 });
	const txtRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		clientObjects.observe("doc", (text) => {
			setText(text)
			setTimeout(() => {
				txtRef.current?.setSelectionRange(lastSelection.current.start, lastSelection.current.end)
			})
		})
	}, [])

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => sendCommands(
		TextApplicator.CommandFromKey(e.key, e.currentTarget.selectionStart, e.currentTarget.selectionEnd)
	)
	const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => lastSelection.current = {
		start: e.currentTarget.selectionStart,
		end: e.currentTarget.selectionEnd
	}

	return (
		<div>
			<textarea ref={txtRef}
				style={{ height: '400px' }}
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={handleKeyDown}
				onSelect={handleSelect}
			></textarea>
		</div>
	)
}

export default App
```