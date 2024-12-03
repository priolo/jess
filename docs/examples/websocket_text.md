# ESEMPIO CON I WEB SOCKET

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

### CLIENT-OBJECTS E WEB-SOCKET
`jessService.ts`
```typescript
import { ClientObjects, TextApplicator } from "@priolo/jess"

// creo il repository locale degli oggetti
export const clientObjects = new ClientObjects()
// a questo repository applico comandi di tipo testuale
clientObjects.apply = TextApplicator.ApplyCommands

// creo il socket
const socket = new WebSocket(`ws://${window.location.hostname}:${8080}/`);
// connessione al SERVER: osservo l'oggetto con id = "doc"
socket.onopen = () => clientObjects.init("doc", true)
// ricezione di un messaggio da SERVER: lo invio al repsitory lcale
socket.onmessage = (event) => clientObjects.receive(event.data)

// funzione specifica per inviare dei essggi al SERVER (in questo caso uso il WEB SOCKET)
clientObjects.onSend = async (messages) => socket.send(JSON.stringify(messages))

// memorizzo dei COMMANDs e li invio quando tutto è calmo
let idTimeout: NodeJS.Timeout
export function sendCommands (command:any) {
	clientObjects.command("doc", command)
	clearTimeout(idTimeout)
	idTimeout = setTimeout(() => clientObjects.update(), 1000)
}
```

### APP REACT
`App.tsx`
```tsx
import { TextApplicator } from '@priolo/jess';
import { useEffect, useRef, useState } from 'react';
import { clientObjects, sendCommands } from './jessService';

function App() {

	const [text, setText] = useState('')
	// Opzionale. Memorizzo la selezione per evitare che il cursore si sposti
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