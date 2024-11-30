
### ServerObjects

La classe `ServerObjects` gestisce la gestione dello stato lato server e la sincronizzazione tra più client.

**Metodi Pubblici:**

- `receive(messageStr: string, clientInstance: any): void`
  - Riceve un messaggio da un client e lo elabora.
    - **Parametri:**
      - `messageStr`: Messaggio ricevuto dal client in formato stringa.
      - `clientInstance`: Istanza del client che ha inviato il messaggio.

- `update(): void`
  - Processa gli aggiornamenti e invia le modifiche ai client in ascolto.

**Proprietà Pubbliche:**

- `apply: ApplyCommandFunction`
  - Funzione utilizzata per applicare un comando a un oggetto.

- `onSend: (client: any, message: ServerMessage) => Promise<any>`
  - Funzione chiamata per inviare messaggi a un client specifico.

---
