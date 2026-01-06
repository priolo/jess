![logo](./docs/logo.png) 

## Installation

`npm install @priolo/jess`

Jess (JavaScript Easy Sync System) A lightweight synchronization system for shared objects between clients and server.

## Table of Contents
- [Core Components](#core-components)
- [How it Works](#how-it-works)
	- [CLIENT](#client)
	- [SERVER](#server)
- [LOCAL EXAMPLE](#local-example)
- [SLATE EXAMPLE](#slate-example)
- [LIMITATIONS](#limitations)

# Core Components

[ClientObjects](./docs/ServerObjects.md)  
[ServerObjects](./docs/ServerObjects.md)

# How it Works

## CLIENT

The `ClientObjects` class maintains local copies of objects  
and manages communication with the server to synchronize them.  
Typically used in the browser.

```typescript
// create the `ClientObjects` object to manage synchronization on the CLIENT side
export const clientObjects = new ClientObjects()

// Set the modification function (in this case for an array). 
// You can use a default one or define a custom one.
// Applies and updates the `value` of an OBJECT with an ACTION
clientObjects.apply = ArrayApplicator.ApplyCommands

// Callback of `ClientObjects` executed when messages need to be sent to the SERVER
// You can use WebSockets or any other transport method
clientObjects.onSend = async (messages: ClientMessage[]) => { 
	// for example with websockets...
	websocket.send(JSON.stringify(messages))
}

// Declare to the SERVER that the CLIENT wants to observe updates of `myObject`
// `true` = the request is sent immediately and waits for confirmation from the SERVER
await clientObjects.init('myObject', true)

// store two commands locally
clientObjects.command('myObject', { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
clientObjects.command('myObject', { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })

// send all stored commands to the SERVER to synchronize the observed OBJECTS
clientObjects.update()

// retrieve the value of an OBJECT
const myObject = clientObjects.getObject('myObject').value

// and its TEMPORARY value
const myObject = clientObjects.getObject('myObject').valueTemp
```

## SERVER

The `ServerObjects` class  
applies actions from CLIENTS to objects on the SERVER  
and sends updates to the CLIENTS themselves.  
Typically used on a Node.js server.

```typescript
// create the `ServerObjects` object to manage synchronization on the SERVER side
export const serverObjects = new ServerObjects()

// Set the modification function (in this case for an array).
// You can use a default one or define a custom one.
// Applies and updates the `value` of an OBJECT with an ACTION
serverObjects.apply = ArrayApplicator.ApplyCommands

// Callback of `ServerObjects` executed when messages need to be sent to the CLIENT
// You can use WebSockets or any other transport method
// In this case, send messages to the CLIENT via WebSocket
server.onSend = async (client: any , message: ServerMessage) => 
	(<WebSocket>client).send(JSON.stringify(message))

// to be called when the chosen transport system receives a message from a CLIENT
// for example with WebSockets...
wss.on('connection', (ws: WebSocket) => {
	ws.on('message', (data: string) => server.receive(data.toString(), ws))
	// when the CLIENT disconnects, remove it from the LISTENERS
	ws.on('close', () => server.disconnect(ws))
})

// update all CLIENTS in LISTENERS
server.update()
```

# LOCAL EXAMPLE

```typescript
// create CLIENT and SERVER
const server = new ServerObjects()
const client = new ClientObjects()

// when the SERVER needs to send, write directly to the CLIENT's "receiver"
server.onSend = async (client, message) => client.receive(JSON.stringify(message))
// and vice versa
client.onSend = async (messages) => server.receive(JSON.stringify(messages), client)

/** use an "apply" on array */
server.apply = ApplyCommands
client.apply = ApplyCommands

// set the commands locally
await client.init("my-object", true)
client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })
client.command("my-object", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })

// situation before synchronizing
console.log(client.getObject("my-object").value) 		// []
console.log(client.getObject("my-object").valueTemp) 	// ["first row", "third row"]
console.log(server.getObject("my-object").value) 		// []

// send the request to synchronize the observed OBJECTS to the SERVER
await client.update()
// il server aggiorna tutti i client a lui connessi
server.update()

console.log(client.getObject("my-object").value) 		// ["first row", "third row"]
console.log(client.getObject("my-object").valueTemp) 	// ["first row", "third row"]
console.log(server.getObject("my-object").value) 		// ["first row", "third row"]
```

# SLATE EXAMPLE

But what interests us most is making it work with SLATE for React!  
That's exactly why JESS was created.  
An example is inside this repository.

From the project root, run:
`cd examples/websocket_slate/server`  
`npm install`  
`npm run start`  
A websocket server should start on `localhost:8080`

Also from the project root, run:
`cd examples/websocket_slate/client`  
`npm install`  
`npm run dev`  
Open the browser at the address indicated by the prompt.

Duplicate the browser tab multiple times  
and try to write something.  
After the set delay time,  
all browser tabs should update.

# LIMITATIONS

This library is in ALPHA version.  
It has not been tested in production  
but it is intended to be used for a real system.  
So it will soon be optimized and tested.
