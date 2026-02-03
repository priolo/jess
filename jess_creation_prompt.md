# Prompt for Generating JESS (JavaScript Easy Sync System)

**Project Title:** JESS (JavaScript Easy Sync System)

**Goal:** Create a lightweight, transport-agnostic synchronization library in TypeScript for real-time state sharing between clients and a server. The library should be capable of handling various data types (JSON objects, Arrays, Text) and specifically support rich-text collaboration (like SlateJS).

**Core Architecture:**

1.  **Client-Server Model**:
    *   **Server**: Acts as the single source of truth. It receives actions, orders them, applies them to the master state, and broadcasts updates to all listening clients.
    *   **Client**: Maintains a local replica of the state. It supports "Optimistic UI" by applying actions locally immediately to a temporary state (`valueTemp`) while buffering them to be sent to the server.

2.  **Components**:
    *   **`ServerObjects` (Class)**:
        *   Manages a collection of objects by ID.
        *   Handles client subscriptions (listeners).
        *   Implements a `receive` method to process incomfing client messages.
        *   Implements an `update` method to broadcast changes to clients.
        *   **Garbage Collection**: Maintains a history of actions but periodically removes old actions that all clients have acknowledged to free up memory.
    *   **`ClientObjects` (Class)**:
        *   Manages local objects.
        *   Implements `init` to subscribe to an object.
        *   Implements `command` to perform an action (e.g., insert text, add to array).
        *   Implements `update` to flush the command buffer to the server.
        *   Must handle "Optimistic Updates": When a command is issued, it is applied immediately to a `valueTemp` property for instant feedback, then reconciled when the server confirms the action.
    *   **`Applicators` (Concept)**:
        *   Decouple the sync logic from the data mutation logic.
        *   The library should accept a generic `apply(currentState, action)` function.
        *   Provide built-in applicators for:
            *   **Arrays**: Add/Remove items.
            *   **Text**: Insert/Delete characters (string manipulation).
            *   **SlateJS**: Handle Slate operations for rich text editing.

3.  **Communication Protocol** (Transport Agnostic):
    *   The library should *not* contain WebSocket code directly but provide hooks (`onSend`) so the developer can plug in any transport (WebSocket, HTTP-Polling, etc.).
    *   **Messages**: Define clear JSON schemas for `INIT`, `UPDATE`, and `RESET` messages.

4.  **Key Features**:
    *   **TypeScript**: Fully typed.
    *   **Zero-Dependency Core**: The core logic should represent a small bundle size.
    *   **Conflict Resolution**: Basic handling merged via the "Applicator" logic (server order prevails).
    *   **Resilience**: Clients should be able to reconnect and "reset" their state if they drift too far.

**Example Usage Specification**:
Provide a simple example where a client connects, initializes a list `['a']`, sends an `ADD 'b'` command, and sees `['a', 'b']` immediately (optimistic), which is then confirmed by the server.
