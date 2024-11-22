import { ApplyActionFunction } from "../ClientObjects.types.js";



/**
 * Applica un'azione ad un array
 */
export const ApplyAction: ApplyActionFunction = (data, command) => {
	if (!data) data = []
	if (!command) return data

	switch (command?.type) {
		case TYPE_ARRAY_COMMAND.REMOVE: {
			if (command.index == null) {
				data.pop()
			} else {
				data.splice(command.index, 1)
			}
			break
		}
		case TYPE_ARRAY_COMMAND.ADD: {
			if (command.index == null) {
				data.push(command.payload)
			} else {
				data.splice(command.index, 0, command.payload)
			}
			break
		}
		case TYPE_ARRAY_COMMAND.UPDATE: {
			if (data.length == 0) break
			data[command.index ?? data.length - 1] = command.payload
		}
	}
	return data
}

export enum TYPE_ARRAY_COMMAND {
	ADD = "add",
	REMOVE = "remove",
	UPDATE = "update"
}

export interface ArrayCommand {
	type: TYPE_ARRAY_COMMAND
	payload: any
	index?: number
}
