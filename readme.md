![logo](./docs/logo.png)

# JESS (JavaScript Easy Sync System)

**JESS** is a lightweight, framework-agnostic library for synchronizing shared objects between clients and a server. It creates a seamless real-time experience by managing state distribution, updates, and conflict resolution efficiently.

## Features

-   **Agnostic**: Works with any transport layer (WebSocket, HTTP polling, etc.) and any data structure (Arrays, Objects, Text, SlateJS).
-   **Optimized**: Efficient delta updates and garbage collection to minimize bandwidth and memory usage.
-   **Conflict Resolution**: Built-in mechanisms to handle concurrent updates.
-   **Plug & Play**: Easy integration with existing projects.

---

## Installation

```bash
npm install @priolo/jess
```

---

## Quick Start

Here is a minimal example of how to set up JESS locally (client and server in the same process) to understand the flow.

```typescript
import { ClientObjects, ServerObjects, ArrayApplicator } from "@priolo/jess";

// 1. Create Server and Client instances
const server = new ServerObjects();
const client = new ClientObjects();

// 2. Define the "transport layer" (connecting them directly for this demo)
server.onSend = async (clientRef, message) => client.receive(JSON.stringify(message));
client.onSend = async (messages) => server.receive(JSON.stringify(messages), client);

// 3. Define the applicator (how to apply changes to the data)
// JESS comes with deep diffing for arrays and objects, text, and SlateJS calculators.
server.apply = ArrayApplicator.ApplyCommands;
client.apply = ArrayApplicator.ApplyCommands;

// 4. Initialize synchronization
// Client asks to observe "my-list"
await client.init("my-list", true);

// 5. Make changes
// Client adds items locally
client.command("my-list", { type: "ADD", payload: "Item 1" });
client.command("my-list", { type: "ADD", payload: "Item 2" });

console.log("Client (Temporary):", client.getObject("my-list").valueTemp); 
// Output: ["Item 1", "Item 2"]

// 6. Sync
// Client sends changes to Server
await client.update();
// Server processes and notifies all clients (including this one)
server.update();

console.log("Client (Final):", client.getObject("my-list").value); 
// Output: ["Item 1", "Item 2"]
```

---

## Core Concepts

### ClientObjects
The `ClientObjects` class runs on the client-side (browser or mobile). It:
-   Maintains a local copy of the shared state (`value`).
-   Calculates a temporary optimistic state (`valueTemp`) for immediate UI feedback.
-   Buffers actions and sends them to the server.

### ServerObjects
The `ServerObjects` class runs on the backend (Node.js). It:
-   Acts as the single source of truth.
-   Receives actions from clients, orders them, and applies them.
-   Broadcasts updates to all connected clients listening to that object.
-   Manages Garbage Collection (GC) of old actions.

### Applicators
JESS separates the *synchronization logic* from the *domain logic*. An **Applicator** defines how an action changes the state.
-   `ArrayApplicator`: For lists and arrays.
-   `TextApplicator`: For collaborative text editing.
-   `SlateApplicator`: For [SlateJS](https://docs.slatejs.org/) rich text editors.

---

## Architecture

1.  **Action**: User performs an action (e.g., types a character).
2.  **Optimistic UI**: Client applies the action to `valueTemp` immediately.
3.  **Buffer**: The action is stored in an outgoing buffer.
4.  **Sync**: `client.update()` sends buffered actions to the Server.
5.  **Server Resolve**: Server receives actions, assigns versions, and updates its master `value`.
6.  **Broadcast**: Server sends the accepted actions back to all clients.
7.  **Confirm**: Client receives the server message, updates its authoritative `value`, and re-calculates `valueTemp` if there are new pending actions.

---

## Examples

You can find full working examples in the `examples` directory:

-   [**WebSocket with SlateJS**](./examples/websocket_slate): A real-time rich text editor using React and SlateJS.
-   [**WebSocket Text**](./examples/websocket_text): A simple collaborative text area.

To run the SlateJS example:

1.  **Server**:
    ```bash
    cd examples/websocket_slate/server
    npm install
    npm start
    ```
2.  **Client** (in a new terminal):
    ```bash
    cd examples/websocket_slate/client
    npm install
    npm run dev
    ```

---

## API Reference

### ClientObjects API

-   `init(idObj: string, send?: boolean)`: Start tracking an object.
-   `command(idObj: string, command: any)`: Queue a command/change.
-   `update()`: Send queued commands to the server.
-   `receive(messageStr: string)`: Process incoming messages from the server.
-   `observe(idObj: string, callback)`: Subscribe to changes.

### ServerObjects API

-   `receive(messageStr: string, clientRef)`: Process incoming messages from a client.
-   `update()`: Broadcast pending updates to clients.
-   `gc(object)`: Clean up old history (automatically called).

---

## License

MIT
