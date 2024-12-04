# ServerObjects

The `ServerObjects` class manages the state of server-side OBJECTS and synchronization between multiple CLIENTS.

## Public Methods:

### `receive(messageStr: string, client: any): void`

Receives a message from a client and processes it.  
Called by the transport system when it receives a message.

- `messageStr`: Message received from the client in string format.
- `clientInstance`: Generic instance of the client that sent the message. This will be used in `onSend`.

### `update(): void`

Sends update changes to listening clients.  
It will probably call `onSend`.

**Public Properties:**

### `apply: (data?: any, command?: any) => any`

Function used to apply a command to an object.  
Use a predefined function:

- `ArrayApplicator.ApplyCommands`
- `SlateApplicator.ApplyCommands`
- `TextApplicator.ApplyCommands`

or define a custom one.

### `onSend: (client: any, message: ServerMessage) => Promise<any>`

Function called to send messages to a client.  
The implementation depends on the transport method used.
