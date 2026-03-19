![logo](./docs/logo.png)

# JESS (JavaScript Easy Sync System)

**JESS** is a lightweight, framework-agnostic library for synchronizing shared objects between clients and a server. It manages state distribution, optimistic updates, and conflict resolution so real-time apps stay responsive and consistent.

## Features

- **Transport-agnostic**: Works with WebSocket, HTTP polling, or any custom transport.
- **Data-agnostic**: Arrays, objects, plain text, and SlateJS structures.
- **Optimized**: Delta updates plus garbage collection to reduce bandwidth and memory.
- **Conflict-aware**: Built-in ordering and reconciliation of concurrent updates.
- **Plug & play**: Drop into existing apps with minimal integration.

## Installation

```bash
npm install @priolo/jess
```

## How It Works (Operating Method)

JESS separates **sync** from **domain logic**:

- You describe changes as commands.
- An applicator applies those commands to data.
- The client keeps a temporary optimistic state.
- The server is the authoritative source of truth.

Flow overview:

1. A client issues a `command(...)`.
2. The client immediately updates `valueTemp` for UI responsiveness.
3. Buffered commands are sent with `client.update()`.
4. The server applies commands to `value` and assigns versions.
5. The server broadcasts accepted commands.
6. Clients reconcile and update `value`, then re-derive `valueTemp`.

## Quick Start (Single Process Demo)

This example wires client and server together directly so the flow is easy to see.

```typescript
import { ClientObjects, ServerObjects, ArrayApplicator } from "@priolo/jess";

const server = new ServerObjects();
const client = new ClientObjects();

// Transport: direct in-memory bridge for this demo.
server.onSend = async (clientRef, message) => client.receive(JSON.stringify(message));
client.onSend = async (messages) => server.receive(JSON.stringify(messages), client);

// Applicator: how to apply commands to the data structure.
server.apply = ArrayApplicator.ApplyCommands;
client.apply = ArrayApplicator.ApplyCommands;

// Start observing an object.
await client.init("my-list", true);

// Issue commands locally (optimistic).
client.command("my-list", { type: "ADD", payload: "Item 1" });
client.command("my-list", { type: "ADD", payload: "Item 2" });

console.log("Optimistic:", client.getObject("my-list").valueTemp);
// ["Item 1", "Item 2"]
console.log("Authoritative (before sync):", client.getObject("my-list").value);
// []

// Sync round-trip.
await client.update();
server.update();

console.log("Authoritative (after sync):", client.getObject("my-list").value);
// ["Item 1", "Item 2"]
```

## Real Transport Example (WebSocket Shape)

Plug JESS into any transport by forwarding messages through `onSend`.

```typescript
import { ClientObjects, ServerObjects, TextApplicator } from "@priolo/jess";

const server = new ServerObjects();
server.apply = TextApplicator.ApplyCommands;

// Pseudo-server WebSocket handler.
ws.on("message", (payload) => server.receive(payload.toString(), ws));
server.onSend = async (clientRef, message) => clientRef.send(JSON.stringify(message));

// Pseudo-client WebSocket handler.
const client = new ClientObjects();
client.apply = TextApplicator.ApplyCommands;
socket.onmessage = (evt) => client.receive(evt.data);
client.onSend = async (messages) => socket.send(JSON.stringify(messages));

await client.init("doc-1", true);
client.command("doc-1", { type: "INSERT", index: 0, text: "Hello" });
await client.update();
```

## Core Concepts

**ClientObjects**

- Runs on the client (browser, mobile, or Node).
- Holds `value` (authoritative) and `valueTemp` (optimistic).
- Buffers commands and sends them to the server.

**ServerObjects**

- Runs on the backend.
- Acts as the source of truth for each object.
- Orders commands, applies them, and broadcasts updates.
- Performs garbage collection of old history.

**Applicators**

Applicators map commands to actual state changes:

- `ArrayApplicator` for lists and arrays.
- `TextApplicator` for collaborative text editing.
- `SlateApplicator` for SlateJS documents.

## Examples

Full working examples are in `examples`:

- `examples/websocket_slate` React + SlateJS collaborative editor.
- `examples/websocket_text` Collaborative text area.

Run the SlateJS example:

1. Server
```bash
cd examples/websocket_slate/server
npm install
npm start
```

2. Client (new terminal)
```bash
cd examples/websocket_slate/client
npm install
npm run dev
```

## API Reference

**ClientObjects**

- `init(idObj: string, send?: boolean)` Start tracking an object.
- `command(idObj: string, command: any)` Queue a command/change.
- `update()` Send queued commands to the server.
- `receive(messageStr: string)` Process incoming messages from the server.
- `observe(idObj: string, callback)` Subscribe to changes.

**ServerObjects**

- `receive(messageStr: string, clientRef)` Process incoming messages from a client.
- `update()` Broadcast pending updates to clients.
- `gc(object)` Clean up old history.

## License

MIT
