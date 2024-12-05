Jess (JavaScript Easy Sync System) is a lightweight library that enables real-time synchronization of shared objects between clients and a server. While it can be used for any type of collaborative editing, it really shines when integrated with the Slate rich text editor.

### Core Concepts
Jess is built around two main classes:

- ClientObjects: Maintains local copies of shared objects on the client side and handles server communication
- ServerObjects: Manages the authoritative state on the server and broadcasts changes to connected clients

The library uses a command-based approach where clients send commands to modify objects, which are then synchronized across all connected clients.

### Basic Example with Slate Editor
Let's build a collaborative text editor using Jess and Slate.  
First, we'll set up the server:

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

On the client side, we need to set up the connection and Slate editor:

```typescript
import { ClientObjects, SlateApplicator } from "@priolo/jess"

// create the local repository of objects
export const clientObjects = new ClientObjects()
// apply text commands to this repository
clientObjects.apply = SlateApplicator.ApplyCommands

// create the socket
const socket = new WebSocket(`ws://${window.location.hostname}:${8080}/`);
// connection to the SERVER: observe the object with id = "doc"
socket.onopen = () => clientObjects.init("doc", true)
// receiving a message from SERVER: send it to the local repository
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

Finally, integrate with Slate in your React component:

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

### How It Works
1) When a user makes changes in Slate, operations are intercepted and sent as commands to the server via Jess
2) The server applies the commands and broadcasts updates to all connected clients
3) Clients receive updates and apply them to their local Slate editors
4) Changes are batched and synchronized with a delay to improve performance

### Try It Out
You can find a complete working example in the repository. Clone it and run:

```bash
# Start the server
cd examples/websocket_slate/server
npm install
npm start

# Start the client
cd examples/websocket_slate/client  
npm install
npm run dev
```

Open multiple browser tabs and start typing - you'll see changes sync across all instances in real-time!

Link to GitHub (Repository)[https://github.com/priolo/jess]