
import { ServerObjects } from "../ServerObjects.js";
import { truncate } from "../utils.js";

describe("Garbage Collection", () => {
	test("should truncate actions based on listener versions", () => {
		const server = new ServerObjects();
		server.apply = (v: any) => v || {};
		const objId = "test_obj";
		const client1: any = { id: "c1" };
		const client2: any = { id: "c2" };

		// Setup object manually
		const obj = (server as any).getObject(objId, client1);
		(server as any).getObject(objId, client2);

		// Add actions
		const actions = [];
		for (let i = 1; i <= 20; i++) {
			actions.push({ idClient: "c1", counter: i, command: {}, version: i });
		}
		obj.actions = actions;
		obj.version = 20;

		// Set listeners versions
		// Client 1 is at version 20
		obj.listeners.find((l: any) => l.client == client1).lastVersion = 20;
		// Client 2 is at version 10
		obj.listeners.find((l: any) => l.client == client2).lastVersion = 10;

		// server.bufferMin is 1000 by default, let's lower it to force GC
		server.bufferMin = 5;

		// Call GC
		(server as any).gc(obj);

		// Min version is 10. Buffer min is 5.
		// truncate(actions, 10, 5, a => a.version)
		// actions versions are 1..20.
		// keep >= 10: 10..20 (11 items)

		expect(obj.actions.some((a: any) => a.version < 10)).toBe(false);
		expect(obj.actions.find((a: any) => a.version == 10)).toBeDefined();
		expect(obj.actions.length).toBeGreaterThanOrEqual(11);
	});

	test("should not remove actions if not sent to all listeners", () => {
		const server = new ServerObjects();
		server.apply = (v: any) => v || {};
		const objId = "test_obj_2";
		const client1: any = { id: "c1" };

		const obj = (server as any).getObject(objId, client1);

		// Add actions
		const actions = [];
		for (let i = 1; i <= 20; i++) {
			actions.push({ idClient: "c1", counter: i, command: {}, version: i });
		}
		obj.actions = actions;
		obj.version = 20;

		// Listener at version 0 (never received anything)
		obj.listeners[0].lastVersion = 0;

		server.bufferMin = 5;
		(server as any).gc(obj);

		// Min version is 0.
		// Should keep all.

		expect(obj.actions.length).toBe(20);
	});
});
