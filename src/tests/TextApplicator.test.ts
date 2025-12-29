import { TextApplicator } from ".."
import { DiffText, getEq, Normalize, TextCommand } from "../applicators/TextApplicator"



beforeAll(async () => {
})

afterAll(async () => {
})

test("ApplyActions base", async () => {

	const actions: TextCommand[] = [
		{ text: "1234567890", index: 0 },
		{ text: "I", index: 2 },
		{ text: "v", index: 3 },
		{ text: "a", index: 4 },
		{ index: 8, toDelete: 2 },
	]

	const value = TextApplicator.ApplyCommands("", actions)

	expect(value).toEqual("12Iva345890")
})

test("Normalize base", async () => {

	const actions: TextCommand[] = [
		{ text: "1234567890", index: 0 },
		{ text: "I", index: 2 },
		{ text: "v", index: 3 },
		{ text: "a", index: 4 },
		{ index: 6, toDelete: 1 },
		{ index: 6, toDelete: 1 },
	]

	const normalized = Normalize(actions)

	const expected = [
		{ text: "1234567890", index: 0 },
		{ text: "Iva", index: 2, toDelete: 0 },
		{ text: "", index: 6, toDelete: 2 },
	]

	expect(normalized).toEqual(expected)

	const value = TextApplicator.ApplyCommands("", actions)
	const valueNorm = TextApplicator.ApplyCommands("", normalized)

	expect(value).toEqual(valueNorm)
})

test("equality who has more", async () => {
	const text1 = "pipplon1g"
	const text2 = "pi123lon1go"

	let diff = getEq(text1, text2, 0, 0)
	// 2,2,2

	diff = getEq(text1, text2, 2, 2)
	// 2, 11, 0

	diff = getEq(text1, text2, 3, 2)
	// 3, 11, 0

	diff = getEq(text1, text2, 4, 2)
	// 9, 10, 5

})

test("piruli and piruletti", async () => {
	const text1 = "pipplon1g"
	const text2 = "pi123lon1go"

	let diffs = DiffText(text1, text2)
	// 2,2,2
	const expected = [
		{ io1: 2, io2: 2, l: 2, },
		{ io1: 2, io2: 11, l: 0, },
		{ io1: 3, io2: 11, l: 0, },
		{ io1: 9, io2: 10, l: 5, },
	]

})