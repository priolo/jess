# JESS - WebSocket Slate Client Example

A structured real-time collaboration editor using **React**, **SlateJS**, and **JESS**.
This client connects to a WebSocket server to synchronize the document state between multiple users.

## Prerequisites

Before running the client, ensure the **Synchronization Server** is running.

```bash
cd ../server
npm install
npm start
```
The server will listen on `ws://localhost:8080`.

## Installation

Install the dependencies:

```bash
npm install
```

## Running the Client

Start the development server:

```bash
npm run dev
```

Open your browser at the address shown (usually `http://localhost:5173`).
To test synchronization, open multiple tabs or browsers at the same URL.

## How it works

-   **SlateJS**: Handles the rich text editor core.
-   **JESS ClientObjects**: Manages the local state and communication.
-   **JESS SlateApplicator**: Calculates differences (deltas) between Slate states and applies them efficiently.

See `src/App.tsx` (or main entry point) for the integration logic.
