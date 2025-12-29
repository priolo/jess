# GitHub Copilot Instructions for @priolo/jess

This repository contains **Jess (JavaScript Easy Sync System)**, a lightweight synchronization system for shared objects between clients and server.

## 🏗 Architecture Overview

The system is built around two main components that synchronize state via a command-based approach:

- **`ClientObjects`** (`src/ClientObjects.ts`): Manages local state on the client side. It buffers commands, applies them optimistically, and synchronizes with the server.
- **`ServerObjects`** (`src/ServerObjects.ts`): Manages the authoritative state on the server. It receives commands from clients, applies them, and broadcasts updates to all subscribed clients.

### Key Concepts

- **Applicators**: Logic for applying updates is decoupled from the core sync engine. An "Applicator" is a pure function that takes the current state and a command (or list of commands) and returns the new state.
  - Examples: `ArrayApplicator`, `TextApplicator`, `SlateApplicator`.
  - Location: `src/applicators/`
- **Transport Agnostic**: The library does not enforce a specific transport layer (like WebSockets). Instead, it exposes hooks (`onSend`) and methods (`receive`) to integrate with any transport.
- **Synchronization**:
  - Clients send **Commands** (Actions) to the server.
  - Server maintains a history of **Actions** and a version number.
  - Server sends **Updates** (missing actions) to clients to bring them up to date.
  - Server performs **Garbage Collection** (`gc`) to remove actions that have been acknowledged by all listeners.

## 💻 Development Workflows

### Build & Run
- **Build**: `npm run build` (uses `tsc`).
- **Watch Mode**: `npm run build:watch`.
- **Tests**: `npm test` (uses `jest`).

### Testing Pattern
Tests typically simulate the client-server connection in-memory without a real network layer.
- **Pattern**: Create `ClientObjects` and `ServerObjects` instances and wire their `onSend` to the other's `receive`.
- **Example**: See `src/tests/SharedObject.array.test.ts`.

```typescript
const server = new ServerObjects()
const client = new ClientObjects()
// Wire client to server
client.onSend = async (messages) => server.receive(JSON.stringify(messages), client)
// Wire server to client
server.onSend = async (client, message) => client.receive(JSON.stringify(message))
```

## 🧩 Coding Conventions

### Applicator Pattern
When creating a new data type to sync, implement an Applicator.
- **Signature**: `(data: T, commands: Command[]) => T`
- **Usage**: Assign to `client.apply` and `server.apply`.

### Client Integration
1. **Initialize**: `const client = new ClientObjects()`
2. **Set Applicator**: `client.apply = MyApplicator.ApplyCommands`
3. **Define Transport**: Implement `client.onSend`.
4. **Handle Incoming**: Call `client.receive(data)` when data arrives from the server.
5. **Debounce Updates**: It is common practice to debounce calls to `client.update()` or `server.update()` to batch commands.

### Server Integration
1. **Initialize**: `const server = new ServerObjects()`
2. **Set Applicator**: `server.apply = MyApplicator.ApplyCommands`
3. **Handle Connections**:
   - On connection: `server.onSend` (per client or global).
   - On message: `server.receive(message, clientContext)`.
   - On disconnect: `server.disconnect(clientContext)`.

## 📂 Key Files
- `src/ClientObjects.ts`: Client-side sync logic.
- `src/ServerObjects.ts`: Server-side sync logic.
- `src/applicators/`: Domain-specific logic (e.g., `SlateApplicator.ts` for SlateJS).
- `examples/`: Reference implementations for WebSocket integration.
