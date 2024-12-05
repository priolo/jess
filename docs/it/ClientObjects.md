
# ClientObjects

La classe `ClientObjects` gestisce la sincronizzazione lato client degli oggetti condivisi.
Mantiene copie locali degli oggetti e gestisce la comunicazione con il server.

## Metodi Pubblici:

### `init(idObj: string, send?: boolean): Promise<void>`
Inizializza la sincronizzazione di un oggetto con il server.  
la prima cosa da fare!

- `idObj`: Identificatore dell'oggetto da sincronizzare.
- `send` (opzionale): Se `true`, invia immediatamente la richiesta di inizializzazione al servere e aspetta la risposta.


#### `command(idObj: string, command: any): void`

Inserisce in buffer un comando per aggiornare un oggetto.  
I comandi non vengono inviati ma solo memorizzati.  
Per inviarli chiamare `update()`

- `idObj`: Identificatore dell'oggetto.
- `command`: Comando da eseguire.


#### `reset(): Promise<void>`

Informa il SERVER degli oggetti osservati dal CLIENT e a che versione sono sincronizzati.


#### `update(): Promise<void>`

Invia tutti i messaggi bufferizzati al server.   
Probabilmente questo chiamerà `onSend`


#### `receive(messageStr: string): void`

Riceve un messaggio dal server.
Chiamata dal sistema di trasporto quando riceve un messaggio.
- `messageStr`: Messaggio ricevuto dal server in formato stringa.


#### `getObject(idObj: string): ClientObject`

Recupera il proxy di un oggetto sincronizzato.
- `idObj`: Identificatore dell'oggetto.  

**Ritorna:**
- `ClientObject`: L'oggetto sincronizzato.


#### `observe(idObj: string, callback: (data: any) => void): void`

Registra una funzione di callback che viene chiamata quando l'oggetto specificato cambia.
- `idObj`: Identificatore dell'oggetto da osservare.
- `callback`: Funzione da chiamare al cambiamento dell'oggetto.


#### `unobserve(idObj: string, callback: (data: any) => void): void`

Rimuove una funzione di callback precedentemente registrata.
- `idObj`: Identificatore dell'oggetto.
- `callback`: Funzione da rimuovere.


## Proprietà Pubbliche:

#### `apply: (data?: any, command?: any) => any`

Funzione utilizzata per applicare un comando a un oggetto.
Puoi usare una funzione predefinita:   

- `ArrayApplicator.ApplyCommands`
- `SlateApplicator.ApplyCommands`
- `TextApplicator.ApplyCommands`

oppure definirne una personalizzata.


#### `onSend: (messages: ClientMessage[]) => Promise<any>`

Funzione chiamata per inviare messaggi al server.
L'implementazione dipende dal metodo di trasporto utilizzato.
