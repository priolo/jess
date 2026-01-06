# JESS - WebSocket Text Client Example

A simple collaborative text area using **React** and **JESS**.
Synchronizes a plain text field across multiple clients in real-time.

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
Type in the text area in one tab and watch it update instantly in others!

## How it works

-   **JESS ClientObjects**: Manages the text state.
-   **JESS TextApplicator**: Handles text insertions and deletions to merge concurrent edits.

Check the source code to see how easy it is to plug JESS into a React component.
