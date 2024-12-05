# Jess - JavaScript Easy Sync System

A lightweight synchronization system for shared objects between clients and server.

## Table of Contents
- [Core Components](#core-components)
- [How it Works](#how-it-works)
- [ESEMPIO LOCALE](#esempio-locale)
- [ESEMPIO SLATE](#esempio-slate)
- [LIMITAZIONI](#limitazioni)

# Core Components

[ClientObjects](./docs/ServerObjects.md)  
[ServerObjects](./docs/ServerObjects.md)

# How it Works

## CLIENT

La classe `ClientObjects` mantiene copie locali degli oggetti   
e gestisce la comunicazione con il server per sincronizzarli.  
Tipicamente si utilizza nel browser

```typescript
// crea l'oggetto `ClientObjects` per gestire la sincronizzazione lato CLIENT
export const clientObjects = new ClientObjects()

// Imposto la funzione di modifica (in questo caso per un array). 
// Puoi usare una di defalt o definirne una personalizzata.
// Applica e aggiorna il `value` di un OBJECT con un ACTION
clientObjects.apply = ArrayApplicator.ApplyCommands

// Callback di `ClientObjects` eseguita quando bisogna inviare i messaggi al SERVER
// Puoi usare i WebSocket o qualunque altro metodo di trasporto
clientObjects.onSend = async (messages: ClientMessage[]) => { 
	// per esempio con i websocket...
	websocket.send(JSON.stringify(messages))
}

// Dichiara al SERVER che il CIENT vuole osservare gli aggiornamenti di `myObject`
// `true` = la richiesta è inviata immediatamente e aspetta la conferma dal SERVER
await clientObjects.init('myObject', true)

// memorizza localmente due comandi
clientObjects.command('myObject', { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
clientObjects.command('myObject', { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })

// invia tutti i comandi memorizzati al SERVER per sincronizzare gli OBJECT osservati
clisntObjects.update()

// prelevo il valore di un OBJECT
const myObject = clientObjects.getObject('myObject').value

// e il suo valore TEMPORANEO
const myObject = clientObjects.getObject('myObject').valueTemp
```

## SERVER

La classe `ServerObjects`  
applica agli oggetti sul SERVER le azioni dai CLIENT  
e invia gli aggiornamenti ai CLIENTs stessi.  
Tipicamente si utilizza su un server Node.js.  

```typescript
// crea l'oggetto `ServerObjects` per gestire la sincronizzazione lato SERVER
export const serverObjects = new ServerObjects()

// Imposto la funzione di modifica (in questo caso per un array).
// Puoi usare una di defalt o definirne una personalizzata.
// Applica e aggiorna il `value` di un OBJECT con un ACTION
serverObjects.apply = ArrayApplicator.ApplyCommands

// Callback di `ServerObjects` eseguita quando bisogna inviare i messaggi al CLIENT
// Puoi usare i WebSocket o qualunque altro metodo di trasporto
// In questo caso invia i messaggi al CLIENT tramite WebSocket
server.onSend = async (client: any , message: ServerMessage) => 
	(<WebSocket>client).send(JSON.stringify(message))

// da chiamare quando il sistema di trasporto scelto riceve un messaggio da un CLIENT
// per esempio con i WebSockets...
wss.on('connection', (ws: WebSocket) => {
	ws.on('message', (data: string) => server.receive(data.toString(), ws))
	// quando il CLIENT si disconnette lo rimuovo dai LISTENERs
	ws.on('close', () => server.disconnect(ws))
})

//aggiorno tutti i CLIENTs in LISTENER
server.update()
```

# ESEMPIO LOCALE

```typescript
// creo CLIENT e SERVER
const server = new ServerObjects()
const client = new ClientObjects()

// quando il SERVER deve inviare scrivo direttamente sul "receiver" del CLIENT 
server.onSend = async (client, message) => client.receive(JSON.stringify(message))
// e il contrario
client.onSend = async (messages) => server.receive(JSON.stringify(messages), client)

/** uso un "apply" su array */
server.apply = ApplyCommands
client.apply = ApplyCommands

// impsto i commands localmente
await client.init("my-object", true)
client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })
client.command("my-object", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })

// situazione prima di sincronizzare
console.log(client.getObject("my-object").value) 		// []
console.log(client.getObject("my-object").valueTemp) 	// ["first row", "third row"]
console.log(server.getObject("my-object").value) 		// []

// mando la richiesta di sincronizzare gli OBJECT osservati al SERVER
await client.update()
// 
server.update()

console.log(client.getObject("my-object").value) 		// ["first row", "third row"]
console.log(client.getObject("my-object").valueTemp) 	// ["first row", "third row"]
console.log(server.getObject("my-object").value) 		// ["first row", "third row"]
```

# ESEMPIO SLATE

Ma la cosa che ci interessa di piu' è farlo funzionare con SLATE per React!  
E' proprio per quello che è stato creato JESS.  
Un esempio è dentro questo repository

Dalla root del progetto esegui:
`cd examples/websocket_slate/server`  
`npm install`  
`npm run start`  
Dovrebbe partire un server websocket su `localhost:8080`  

Sempre dalla root del progetto esegui  
`cd examples/websocket_slate/client`  
`npm install`  
`npm run dev`  
Apri il browser all'indirizzo che ti indica il prompt.  

Duplica piu' volte il tab del browser  
e prova a scrivere qualcosa.  
Dopoo il tempo di delay settato  
si dovrebbero aggiornare tutti i tab del browser.

# LIMITAZIONI

Questa libreria è in versione ALFA.  
Non è stata testata in produzione  
ma deve essere utilizzata per un sistema reale.  
Quindi a breve verrà ottimizzata e testata.
