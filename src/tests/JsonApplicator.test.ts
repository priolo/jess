import { JsonApplicator } from ".."
import { TYPE_JSON_COMMAND } from "../applicators/JsonApplicator"

beforeAll(async () => {
})

afterAll(async () => {
})

test("ApplyCommands set nested and create containers", async () => {
	const commands = [
		{ type: TYPE_JSON_COMMAND.SET, path: "profile.name", value: "Ada" },
		{ type: TYPE_JSON_COMMAND.SET, path: "items.0.title", value: "First" },
	]

	const value = JsonApplicator.ApplyCommands({}, commands)

	expect(value).toEqual({
		profile: { name: "Ada" },
		items: [{ title: "First" }],
	})
})

test("ApplyCommands delete array index and object key", async () => {
	const data = {
		items: ["a", "b", "c"],
		meta: { active: true, count: 3 },
	}

	const commands = [
		{ type: TYPE_JSON_COMMAND.DELETE, path: "items.1" },
		{ type: TYPE_JSON_COMMAND.DELETE, path: ["meta", "active"] },
	]

	const value = JsonApplicator.ApplyCommands(data, commands)

	expect(value).toEqual({
		items: ["a", "c"],
		meta: { count: 3 },
	})
})

test("ApplyCommands merge at path and root", async () => {
	const data = { profile: { name: "Ada", age: 30 } }

	const commands = [
		{ type: TYPE_JSON_COMMAND.MERGE, path: "profile", value: { age: 31, city: "LA" } },
		{ type: TYPE_JSON_COMMAND.MERGE, path: "", value: { version: 1 } },
	]

	const value = JsonApplicator.ApplyCommands(data, commands)

	expect(value).toEqual({
		profile: { name: "Ada", age: 31, city: "LA" },
		version: 1,
	})
})

test("ApplyCommands set and delete root", async () => {
	const valueSet = JsonApplicator.ApplyCommands({ a: 1 }, {
		type: TYPE_JSON_COMMAND.SET,
		path: "",
		value: { ok: true },
	})

	expect(valueSet).toEqual({ ok: true })

	const valueDelete = JsonApplicator.ApplyCommands({ a: 1 }, {
		type: TYPE_JSON_COMMAND.DELETE,
		path: "",
	})

	expect(valueDelete).toEqual({})
})
