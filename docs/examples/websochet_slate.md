# EXAMPLE WITH SLATE

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

### CLIENT-OBJECTS AND WEB-SOCKET
```typescript
import { ClientObjects, SlateApplicator } from "@priolo/jess"

// create the local repository of objects
export const clientObjects = new ClientObjects()
// apply text-based commands to this repository
clientObjects.apply = SlateApplicator.ApplyCommands

// create the socket
const socket = new WebSocket(`ws://${window.location.hostname}:${8080}/`);
// connection to the SERVER: observe the object with id = "doc"
socket.onopen = () => clientObjects.init("doc", true)
// receiving a message from the SERVER: send it to the local repository
socket.onmessage = (event) => {
	console.log("received:", event.data)
	clientObjects.receive(event.data)
}

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

### APP REACT
`App.tsx`
```tsx
function App() {

	const editor = useMemo(() => {
		const editor = withHistory(withReact(createEditor()))
		const { apply } = editor;
		editor.apply = (operation: Operation) => {
			 // synchronize everything that is NOT a selection operation
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