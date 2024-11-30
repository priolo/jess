# Jess - JavaScript Easy Sync System

A lightweight synchronization system for shared objects between clients and server.

## Core Components

[ClientObjects](./docs/ServerObjects.md)
[ServerObjects](./docs/ServerObjects.md)

## How it Works


```typescript
// crea l'oggetto `ClientObjects` per gestire la sincronizzazione lato CLIENT
export const clientObjects = new ClientObjects()
// Imposto la funzione di modifica (in questo caso per un array). 
// Puoi usare una di defalt o definirne una personalizzata.
// Applica e aggiorna il `value` di un OBJECT con un ACTION
clientObjects.apply = ArrayApplicator.ApplyActions
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
```

1. **Inizializzazione:** I client inizializzano gli oggetti che desiderano osservare utilizzando `init`.
2. **Comandi dai Client:** I client inviano comandi al server usando `command`.
3. **Elaborazione sul Server:** Il server elabora i comandi e aggiorna il suo stato interno.
4. **Broadcast dal Server:** Il server trasmette le modifiche a tutti i client in ascolto.
5. **Aggiornamento dei Client:** I client aggiornano il loro stato locale e notificano gli osservatori registrati.

Il sistema utilizza il tracciamento delle versioni per garantire la coerenza e gestisce le disconnessioni di rete attraverso la ricostruzione dello stato.

## Applicators

Gli applicatori personalizzati possono essere definiti per gestire diversi tipi di oggetti condivisi:

- `ArrayApplicator` - Per array sincronizzati.
- `SlateApplicator` - Per documenti di testo ricchi.
- È possibile implementare applicatori personalizzati per altri tipi di dati.