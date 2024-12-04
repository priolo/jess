# ClientObjects

The `ClientObjects` class manages client-side synchronization of shared objects.
It maintains local copies of the objects and handles communication with the server.

## Public Methods:

### `init(idObj: string, send?: boolean): Promise<void>`
Initializes the synchronization of an object with the server.  
The first thing to do!

- `idObj`: Identifier of the object to synchronize.
- `send` (optional): If `true`, immediately sends the initialization request to the server and waits for the response.

#### `command(idObj: string, command: any): void`

Buffers a command to update an object.  
Commands are not sent but only stored.  
To send them, call `update()`

- `idObj`: Identifier of the object.
- `command`: Command to execute.

#### `reset(): Promise<void>`

Informs the SERVER about the objects observed by the CLIENT and their synchronized versions.

#### `update(): Promise<void>`

Sends all buffered messages to the server.  
This will likely call `onSend`.

#### `receive(messageStr: string): void`

Receives a message from the server.
Called by the transport system when a message is received.
- `messageStr`: Message received from the server as a string.

#### `getObject(idObj: string): ClientObject`

Retrieves the proxy of a synchronized object.
- `idObj`: Identifier of the object.

**Returns:**
- `ClientObject`: The synchronized object.

#### `observe(idObj: string, callback: (data: any) => void): void`

Registers a callback function that is called when the specified object changes.
- `idObj`: Identifier of the object to observe.
- `callback`: Function to call upon the object's change.

#### `unobserve(idObj: string, callback: (data: any) => void): void`

Removes a previously registered callback function.
- `idObj`: Identifier of the object.
- `callback`: Function to remove.

## Public Properties:

#### `apply: (data?: any, command?: any) => any`

Function used to apply a command to an object.
You can use a predefined function:

- `ArrayApplicator.ApplyCommands`
- `SlateApplicator.ApplyCommands`
- `TextApplicator.ApplyCommands`

or define a custom one.

#### `onSend: (messages: ClientMessage[]) => Promise<any>`

Function called to send messages to the server.
The implementation depends on the transport method used.
