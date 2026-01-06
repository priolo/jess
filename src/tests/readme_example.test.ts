import { ClientObjects } from '../ClientObjects';
import { ServerObjects } from '../ServerObjects';
import { ApplyCommands, TYPE_ARRAY_COMMAND } from '../applicators/ArrayApplicator';

describe('Readme Example', () => {
    it('should work as described in the LOCAL EXAMPLE', async () => {
		let timeoutId : any = null;
        // create CLIENT and SERVER
        const server = new ServerObjects()
        const client = new ClientObjects()

        // when the SERVER needs to send, write directly to the CLIENT's "receiver"
        server.onSend = async (client, message) => {
			console.log( "SERVER SENT:", message );
			client.receive(JSON.stringify(message))
		}
        // and vice versa
        client.onSend = async (messages) => {
			console.log( "CLIENT SENT:", messages );
			server.receive(JSON.stringify(messages), client)
			// debounce server update
			clearTimeout(timeoutId)
        	timeoutId = setTimeout(() => server.update(), 100)
		}

        /** use an "apply" on array */
        server.apply = ApplyCommands
        client.apply = ApplyCommands

        // set the commands locally
        await client.init("my-object", true)
        client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "first row" })
        client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "second row" })
        client.command("my-object", { type: TYPE_ARRAY_COMMAND.ADD, payload: "third row" })
        client.command("my-object", { type: TYPE_ARRAY_COMMAND.REMOVE, index: 1 })

        // situation before synchronizing
        expect(client.getObject("my-object").value).toEqual([])
        expect(client.getObject("my-object").valueTemp).toEqual(["first row", "third row"])
        
        // NOTE: server.getObject is private, so we access objects directly.
        // Also, the object is created on the server when client.init is called.
        expect(server.objects["my-object"].value).toEqual([])

        // send the request to synchronize the observed OBJECTS to the SERVER
        await client.update()
        // 
        //server.update()
		await new Promise((resolve) => setTimeout(resolve, 200)); // wait a tick for the server to process

        expect(client.getObject("my-object").value).toEqual(["first row", "third row"])
        expect(client.getObject("my-object").valueTemp).toEqual(["first row", "third row"])
        expect(server.objects["my-object"].value).toEqual(["first row", "third row"])
    })
})
