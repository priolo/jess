
# ServerObjects

La classe `ServerObjects` lo stato degli OBJECTS lato SERVER e la sincronizzazione tra più CLIENT.


## Metodi Pubblici:

### `receive(messageStr: string, client: any): void`

Riceve un messaggio da un client e lo elabora.  
Chiamata dal sistema di trasporto quando riceve un messaggio.

- `messageStr`: Messaggio ricevuto dal client in formato stringa.
- `clientInstance`: Istanza generica del client che ha inviato il messaggio. Questa verrà usata in `onSend`.


### `update(): void`

Invia le modifiche di aggiornamento ai client in ascolto.  
Probabilmente chiamerà `onSend`.


**Proprietà Pubbliche:**

### `apply: (data?: any, command?: any) => any`

Funzione utilizzata per applicare un comando a un oggetto.
Usare una funzione predefinita:   

- `ArrayApplicator.ApplyCommands`
- `SlateApplicator.ApplyCommands`
- `TextApplicator.ApplyCommands`

oppure definirne una personalizzata.


### `onSend: (client: any, message: ServerMessage) => Promise<any>`

Funzione chiamata per inviare messaggi a un client.  
L'implementazione dipende dal metodo di trasporto utilizzato.
