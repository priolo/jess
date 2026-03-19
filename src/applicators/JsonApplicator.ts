import { ApplyCommandFunction } from "../ClientObjects.types.js";

/**
 * Applies a series of COMMANDS to a JSON object.
 * Supports path-based updates with array or dot-separated paths.
 */
export const ApplyCommands: ApplyCommandFunction = (data, commands) => {
	if (data == null || typeof data !== "object") data = {}
	if (!commands || commands.length == 0) return data
	if (!Array.isArray(commands)) commands = [commands]

	for (const command of commands) {
		data = ApplyCommand(data, command)
	}
	return data
}

const ApplyCommand: ApplyCommandFunction = (data, command: JsonCommand) => {
	switch (command?.type) {
		case TYPE_JSON_COMMAND.SET: {
			const path = normalizePath(command.path)
			if (!path || path.length == 0) return command.value
			const { parent, key } = ensureParent(data, path)
			if (parent == null) return data
			setValue(parent, key, command.value)
			break
		}
		case TYPE_JSON_COMMAND.DELETE: {
			const path = normalizePath(command.path)
			if (!path || path.length == 0) return {}
			const { parent, key } = getParent(data, path)
			if (parent == null) return data
			deleteValue(parent, key)
			break
		}
		case TYPE_JSON_COMMAND.MERGE: {
			const path = normalizePath(command.path)
			if (!path || path.length == 0) {
				if (!isPlainObject(data)) data = {}
				if (isPlainObject(command.value)) {
					Object.assign(data, command.value)
				} else if (command.value != null) {
					data = command.value
				}
				return data
			}
			const { parent, key } = ensureParent(data, path)
			if (parent == null) return data
			const current = getValue(parent, key)
			if (isPlainObject(current) && isPlainObject(command.value)) {
				Object.assign(current, command.value)
			} else {
				setValue(parent, key, command.value)
			}
			break
		}
	}
	return data
}

export enum TYPE_JSON_COMMAND {
	SET = "set",
	DELETE = "delete",
	MERGE = "merge",
}

export type JsonPath = Array<string | number> | string

export interface JsonCommand {
	type: TYPE_JSON_COMMAND
	path?: JsonPath
	value?: any
}

function normalizePath(path: JsonPath | undefined): Array<string | number> | null {
	if (path == null) return null
	if (Array.isArray(path)) return path
	if (typeof path === "string") {
		if (path === "") return []
		// support both "a.b.0.c" and "/a/b/0/c"
		if (path.startsWith("/")) {
			return path
				.split("/")
				.filter(Boolean)
				.map(segment => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
				.map(toPathKey)
		}
		return path.split(".").filter(Boolean).map(toPathKey)
	}
	return null
}

function toPathKey(segment: string): string | number {
	const n = Number(segment)
	return Number.isInteger(n) && segment.trim() !== "" ? n : segment
}

function isPlainObject(value: any): value is Record<string, any> {
	return !!value && typeof value === "object" && !Array.isArray(value)
}

function ensureParent(root: any, path: Array<string | number>) {
	return walkPath(root, path, true)
}

function getParent(root: any, path: Array<string | number>) {
	return walkPath(root, path, false)
}

function walkPath(root: any, path: Array<string | number>, create: boolean) {
	if (!root || typeof root !== "object") return { parent: null, key: null }
	let current = root
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i]
		let next = getValue(current, key)
		if (next == null || typeof next !== "object") {
			if (!create) return { parent: null, key: null }
			const nextKey = path[i + 1]
			next = typeof nextKey === "number" ? [] : {}
			setValue(current, key, next)
		}
		current = next
	}
	return { parent: current, key: path[path.length - 1] }
}

function getValue(target: any, key: string | number) {
	if (Array.isArray(target) && typeof key === "number") return target[key]
	if (target && typeof target === "object") return target[key]
	return undefined
}

function setValue(target: any, key: string | number, value: any) {
	if (Array.isArray(target) && typeof key === "number") {
		target[key] = value
		return
	}
	if (target && typeof target === "object") {
		target[key] = value
	}
}

function deleteValue(target: any, key: string | number) {
	if (Array.isArray(target) && typeof key === "number") {
		target.splice(key, 1)
		return
	}
	if (target && typeof target === "object") {
		delete target[key]
	}
}
