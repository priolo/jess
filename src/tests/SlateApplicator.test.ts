import { createEditor } from "slate"
import { SlateApplicator } from "../index.js"


// beforeAll(async () => {
// })

// afterAll(async () => {
// })

// test("editing at a non-editable point", async () => {

// 	const actions = [
// 		{
// 			"type": "insert_text",
// 			"path": [0, 0],
// 			"offset": 0,
// 			"text": "1"
// 		},
// 		{
// 			"type": "split_node",
// 			"path": [0, 0],
// 			"position": 1,
// 		},
// 		{
// 			"type": "split_node",
// 			"path": [0],
// 			"position": 1,
// 		},
// 		{
// 			"type": "merge_node",
// 			"path": [1],
// 			"position": 1,
// 		},
// 		{
// 			"type": "merge_node",
// 			"path": [0, 1],
// 			"position": 1,
// 		}
// 	]

// 	let value = SlateApplicator.ApplyAction()

// 	actions.forEach(action => {
// 		value = SlateApplicator.ApplyAction(value, action)
// 	})


// 	expect(value).toEqual([])
// })

test("editing at a non-editable point 2", async () => {

	const actions = [
		{
			"type": "insert_text",
			"path": [0, 0],
			"offset": 0,
			"text": "12"
		},
		{
			"type": "split_node",
			"path": [0, 0],
			"position": 1,
		},
		{
			"type": "split_node",
			"path": [0],
			"position": 1,
		},
	]

	let value = SlateApplicator.ApplyCommands()
	value = SlateApplicator.ApplyCommands(value, actions)

	// actions.forEach(action => {
	// 	value = SlateApplicator.ApplyAction(value, action)
	// })

	expect(value).toEqual([
		{ children: [{ text: "1" }] },
		{ children: [{ text: "2" }] },
	])
})

test("test selector overflow", async () => {
	const editor = createEditor()
	editor.children = [
		{ children: [{ text: "testo riga uno" }] },
		{ children: [{ text: "testo riga due" }] },
		{ children: [{ text: "testo riga tre" }] },
	]
	editor.setSelection({
		anchor: { path: [0, 0], offset: 6 },
		focus: { path: [1, 0], offset: 5 }
	})
	editor.onChange()
	editor.children = [
		{ children: [{ text: "testo riga uno" }] },
	]

	// console.log(editor.selection)
	// console.log(editor.end([]))
})

test("TEST DELETION AND INSERTION", async () => {
	const editor = createEditor()
	editor.children = [
		{ children: [{ text: "1" }] },
		{ children: [{ text: "2" }] },
	]

	editor.apply({
		"type": "remove_node",
		"path": [1],
		"node": {
			"children": [{ "text": "" }]
		}
	})
	editor.apply({
		"type": "insert_node",
		"path": [1],
		"node": {
			"children": [{ "text": "pippo" }]
		}
	})

	// console.log( editor.children)
})

test("TEST DELETION on a non-existent path", async () => {
	const editor = createEditor()
	editor.children = [
		{ children: [{ text: "1" }] },
		{ children: [{ text: "2" }] },
	]

	editor.apply({
		"type": "remove_node",
		"path": [2],
		"node": {
			"children": [{ "text": "" }]
		}
	})

	// console.log( editor.children)
})