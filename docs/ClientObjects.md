
### ClientObjects

La classe `ClientObjects` gestisce la sincronizzazione lato client degli oggetti condivisi.
Mantiene copie locali degli oggetti e gestisce la comunicazione con il server.

**Metodi Pubblici:**

- `init(idObj: string, send?: boolean): Promise<void>`
  - Inizializza la sincronizzazione di un oggetto con il server.
    - **Parametri:**
      - `idObj`: Identificatore dell'oggetto da sincronizzare.
      - `send` (opzionale): Se `true`, invia immediatamente la richiesta di inizializzazione al servere e aspetta la risposta.

- `command(idObj: string, command: any): void`
  - Inserisce in buffer un comando per aggiornare un oggetto.
    - **Parametri:**
      - `idObj`: Identificatore dell'oggetto.
      - `command`: Comando da eseguire.

- `reset(): Promise<void>`
  - Reimposta lo stato del client e informa il server degli oggetti osservati e delle loro versioni.

- `update(): Promise<void>`
  - Invia tutti i messaggi bufferizzati al server.

- `receive(messageStr: string): void`
  - Riceve un messaggio dal server e lo elabora.

- `getObject(idObj: string): ClientObject`
  - Recupera il proxy di un oggetto sincronizzato.
    - **Parametri:**
      - `idObj`: Identificatore dell'oggetto.
    - **Ritorna:**
      - `ClientObject`: L'oggetto sincronizzato.

- `observe(idObj: string, callback: (data: any) => void): void`
  - Registra una funzione di callback che viene chiamata quando l'oggetto specificato cambia.
    - **Parametri:**
      - `idObj`: Identificatore dell'oggetto da osservare.
      - `callback`: Funzione da chiamare al cambiamento dell'oggetto.

- `unobserve(idObj: string, callback: (data: any) => void): void`
  - Rimuove una funzione di callback precedentemente registrata.
    - **Parametri:**
      - `idObj`: Identificatore dell'oggetto.
      - `callback`: Funzione da rimuovere.

**Proprietà Pubbliche:**

- `apply: ApplyCommandFunction`
  - Funzione utilizzata per applicare un comando a un oggetto.

- `onSend: (messages: ClientMessage[]) => Promise<any>`
  - Funzione chiamata per inviare messaggi al server.

---
