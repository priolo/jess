import { BaseOperation, Node } from 'slate';
import { SlateApplicator } from "../index.js"



describe('normalizeBuffActions', () => {

	it('insert_text: merge', () => {
		const actions: BaseOperation[] = [
			{
				type: "set_selection",
				properties: null,
				newProperties: { anchor: { path: [0, 0], offset: 2 }, focus: { path: [0, 0], offset: 2 } }
			},
			{
				type: "insert_text",
				path: [0, 0],
				offset: 2,
				text: "x"
			},
			{
				type: "insert_text",
				path: [0, 0],
				offset: 3,
				text: "y"
			},
			{
				type: "insert_text",
				path: [0, 0],
				offset: 4,
				text: "z"
			}
		]

		const children = SlateApplicator.ApplyCommands([
			{ children: [{ text: "prima riga molto lunga e appetitosa" }], },
			{ children: [{ text: "secondariga" }], },
			{ children: [{ text: "terza riga" }], },
		], actions)
		const norm = SlateApplicator.Normalize(actions)
		const childrenNorm = SlateApplicator.ApplyCommands([
			{ children: [{ text: "prima riga molto lunga e appetitosa" }], },
			{ children: [{ text: "secondariga" }], },
			{ children: [{ text: "terza riga" }], },
		], norm)

		expect(children).toEqual(childrenNorm)
	})

	it('set_selection: only last selection', () => {
		const actions: BaseOperation[] = [
			{
				type: "set_selection",
				properties: null,
				newProperties: { anchor: { path: [0, 0], offset: 2 }, focus: { path: [0, 0], offset: 2 } }
			},
			{
				type: "set_selection",
				properties: { anchor: { path: [0, 0], offset: 2 }, focus: { path: [0, 0], offset: 2 } },
				newProperties: { anchor: { path: [0, 0], offset: 3 }, focus: { path: [0, 0], offset: 3 } }
			},
			{
				type: "insert_text",
				path: [0, 0],
				offset: 2,
				text: "x"
			},
			{
				type: "set_selection",
				properties: { anchor: { path: [0, 0], offset: 2 }, focus: { path: [0, 0], offset: 2 } },
				newProperties: { anchor: { path: [0, 0], offset: 3 }, focus: { path: [0, 0], offset: 3 } }
			},
			{
				type: "insert_text",
				path: [0, 0],
				offset: 3,
				text: "y"
			}
		]
		const norm = SlateApplicator.Normalize(actions)

		expect(norm).toMatchObject([{ type: "insert_text", text: "xy" }, { type: "set_selection" }])
	})

	it('remove_text: simplify in back', () => {
		const actions: BaseOperation[] = [
			{
				type: "remove_text",
				path: [0, 0],
				offset: 4,
				text: "a"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 3,
				text: "m"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 2,
				text: "i"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 1,
				text: "r"
			}
		]

		const children = SlateApplicator.ApplyCommands([
			{ children: [{ text: "prima riga molto lunga e appetitosa" }], },
			{ children: [{ text: "secondariga" }], },
			{ children: [{ text: "terza riga" }], },
		], actions)
		const norm = SlateApplicator.Normalize(actions)
		const childrenNorm = SlateApplicator.ApplyCommands([
			{ children: [{ text: "prima riga molto lunga e appetitosa" }], },
			{ children: [{ text: "secondariga" }], },
			{ children: [{ text: "terza riga" }], },
		], norm)

		expect(norm).toHaveLength(1)
		expect(children).toEqual(childrenNorm)
	})

	it('remove_text: simplify in forward', () => {
		const actions: BaseOperation[] = [
			{
				type: "remove_text",
				path: [0, 0],
				offset: 1,
				text: "r"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 1,
				text: "i"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 1,
				text: "m"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 1,
				text: "a"
			}
		]

		const children = SlateApplicator.ApplyCommands([
			{ children: [{ text: "prima riga molto lunga e appetitosa" }], },
			{ children: [{ text: "secondariga" }], },
			{ children: [{ text: "terza riga" }], },
		], actions)
		const norm = SlateApplicator.Normalize(actions)
		const childrenNorm = SlateApplicator.ApplyCommands([
			{ children: [{ text: "prima riga molto lunga e appetitosa" }], },
			{ children: [{ text: "secondariga" }], },
			{ children: [{ text: "terza riga" }], },
		], norm)


		expect(norm).toHaveLength(1)
		expect(children).toEqual(childrenNorm)
	})

	it('remove_text: simplify in back and forward', () => {
		const actions: BaseOperation[] = [
			{
				type: "remove_text",
				path: [0, 0],
				offset: 4,
				text: "a"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 3,
				text: "m"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 2,
				text: "i"
			},
			{
				type: "remove_text",
				path: [0, 0],
				offset: 2,
				text: " "
			}
		]

		const children = SlateApplicator.ApplyCommands([
			{ children: [{ text: "prima riga molto lunga e appetitosa" }], },
			{ children: [{ text: "secondariga" }], },
			{ children: [{ text: "terza riga" }], },
		], actions)
		const norm = SlateApplicator.Normalize(actions)
		const childrenNorm = SlateApplicator.ApplyCommands([
			{ children: [{ text: "prima riga molto lunga e appetitosa" }], },
			{ children: [{ text: "secondariga" }], },
			{ children: [{ text: "terza riga" }], },
		], norm)

		expect(norm).toHaveLength(1)
		expect(children).toEqual(childrenNorm)
	})

	it('split_node: verify', () => {

		const original = [{ children: [{ text: "pippo inzaghi" }] }]
		const expected = [
			{ children: [{ text: "pippo" }] },
			{ type: "text", children: [{ text: " inzaghi" }] },
		]

		const actions1: BaseOperation[] = [
			{
				"type": "split_node",
				"path": [0, 0],
				"position": 5,
				"properties": {}
			},
			{
				"type": "split_node",
				"path": [0],
				"position": 1,
				"properties": {
					"type": "text"
				} as Partial<Node>
			}
		]
		const result1 = SlateApplicator.ApplyCommands(original, actions1)
		expect(result1).toEqual(expected)

		// const actions2 = [
		// 	{
		// 		"type": "split_node",
		// 		"path": [0,0],
		// 		"position": 5,
		// 		"properties": { "type": "text" }
		// 	},
		// ]
		// const result2 = SlateApplicator.ApplyCommands(original, actions2)
		// expect(result2).toEqual(expected)
	})

})

