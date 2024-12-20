import { ApplyCommandFunction } from "../ClientObjects.types.js";

// Apply a series of COMMANDS to a string
export const ApplyCommands: ApplyCommandFunction = (data: string, commands: TextCommand[]) => {
	if (data == null) data = ""
	if (!commands || commands.length == 0) return data
	if (!Array.isArray(commands)) commands = [commands]
	for (const command of commands) {
		data = data.slice(0, command.index)
			.concat(command.text ?? "")
			.concat(data.slice(command.index + (command.toDelete ?? 0)))
	}
	return data
}

export interface TextCommand {
	text?: string
	index?: number
	toDelete?: number
}

// Normalize the commands
export function Normalize(commands: TextCommand[]): TextCommand[] {
	const newCommands: TextCommand[] = []
	let commandPrev: TextCommand = commands[0]

	for (let i = 1; i < commands.length; i++) {
		const command = commands[i]
		const prevText = commandPrev.text ?? ""
		const currText = command.text ?? ""

		if (commandPrev.index == command.index - prevText.length) {
			commandPrev = {
				text: prevText.concat(currText),
				index: commandPrev.index,
				toDelete: (commandPrev?.toDelete ?? 0) + (command?.toDelete ?? 0)
			}
		} else {
			newCommands.push(commandPrev)
			commandPrev = command

		}

	}
	newCommands.push(commandPrev)
	return newCommands
}


/**
 * Create a command from a key press
 */
export function CommandFromKey (keyCode:string, selectionStart:number, selectopnEnd:number): TextCommand {
	const range = selectopnEnd - selectionStart
	const visibleCharacters = /^[a-zA-Z0-9\s.,;:!?(){}[\]'"<>@#$%^&*+=_-]$/
	let command:TextCommand = null

	if (visibleCharacters.test(keyCode)) {
		command ={
			text: keyCode,
			index: selectionStart,
			toDelete: range
		}
	} else if (keyCode === 'Backspace') {
		command ={
			text: '',
			index: selectionStart + (range == 0 ? -1 : 0),
			toDelete: range == 0 ? 1 : range
		}
	} else if (keyCode === 'Delete') {
		command ={
			text: '',
			index: selectionStart,
			toDelete: range == 0 ? 1 : range
		}
	} else if (keyCode === 'Enter') {
		command ={
			text: '\n',
			index: selectionStart,
			toDelete: range,
		}
	}
	return command
}


/**
 * Returns a series of commands to transform text1 into text2
 * @param text1 
 * @param text2 
 * @returns 
 */
export function DiffText(text1: string, text2: string): any[] {
	if (text1 == text2) return []

	const diffs = []


	for (let i1 = 0, i2 = 0; ;) {

		const [io1, io2, l] = getEq(text1, text2, i1, i2)

		console.log(io1, io2, l)
		diffs.push({ io1, io2, l })
		if (io1 >= text1.length) {
			break
		}
		if (l == 0) {
			i1++

		} else {
			i1 = io1
			i2 = io2
		}
	}

	return diffs
}
export function getEq(text1: string, text2: string, ii1: number, ii2: number): [number, number, number] {
	let l = 0
	for (; ii1 < text1.length && ii2 < text2.length;) {
		const c1 = text1[ii1]
		const c2 = text2[ii2]
		if (c1 != c2) {
			if (l == 0) {
				ii2++
				continue
			} else {
				break
			}
		}
		ii1++; ii2++; l++
	}
	return [ii1, ii2, l]
}