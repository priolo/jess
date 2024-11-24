import { SlateApplicator } from "../index.js"


// beforeAll(async () => {
// })

// afterAll(async () => {
// })

// test("editazione in un punto non editabile", async () => {

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

test("editazione in un punto non editabile2", async () => {

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

	let value = SlateApplicator.ApplyActions()
	value = SlateApplicator.ApplyActions(value, actions)

	// actions.forEach(action => {
	// 	value = SlateApplicator.ApplyAction(value, action)
	// })

	expect(value).toEqual([
		{ children: [{ text: "1" }] },
		{ children: [{ text: "2" }] },
	])
})