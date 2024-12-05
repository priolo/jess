# ESEMPIO CON SLATE

## SERVER

```typescript
import { ServerObjects, SlateApplicator } from '@priolo/jess';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 })
const server = new ServerObjects()
// Use the Slate-specific applicator
server.apply = SlateApplicator.ApplyCommands
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
```typescript
import { ClientObjects, SlateApplicator } from "@priolo/jess"

// creo il repository locale degli oggetti
export const clientObjects = new ClientObjects()
// a questo repository applico comandi di tipo testuale
clientObjects.apply = SlateApplicator.ApplyCommands

// creao il socket
const socket = new WebSocket(`ws://${window.location.hostname}:${8080}/`);
// connessione al SERVER: osservo l'oggetto con id = "doc"
socket.onopen = () => clientObjects.init("doc", true)
// ricezione di un messaggio da SERVER: lo invio al repsitory lcale
socket.onmessage = (event) => {
	console.log("received:", event.data)
	clientObjects.receive(event.data)
}

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
function App() {

	const editor = useMemo(() => {
		const editor = withHistory(withReact(createEditor()))
		const { apply } = editor;
		editor.apply = (operation: Operation) => {
			// sincronizza tutto quello che NON è un operazione di selezione
			if (!Operation.isSelectionOperation(operation)) {
				console.log("operation:", operation)
				sendCommands(operation)
			}
			apply(operation);
		}
		clientObjects.observe("doc", () => {
			const children = clientObjects.getObject("doc").valueTemp
			SlateApplicator.UpdateChildren(editor, children)
		})
		return editor
	}, [])


	return (
		<Slate
			editor={editor}
			initialValue={[{ children: [{ text: '' }] }]}

		>
			<Editable
				style={{ backgroundColor: "lightgray", width: 400, height: 400, padding: 5 }}
				renderElement={({ attributes, element, children }) =>
					<div {...attributes}>{children}</div>
				}
				renderLeaf={({ attributes, children, leaf }) =>
					<span {...attributes}>{children}</span>
				}
			/>
		</Slate>
	)
}

export default App
```