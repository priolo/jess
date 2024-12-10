import { createEditor, Descendant, Editor, Node, NodeOperation, Operation, Point, SelectionOperation, Transforms, withoutNormalizing } from "slate";
import { ApplyCommandFunction } from "../ClientObjects.types.js";

/**
 * Applies one or more COMMANDS (which are SLATE OPERATIONS) to a CHILDREN-SLATE content
 * https://docs.slatejs.org/api/operations
 */
export const ApplyCommands: ApplyCommandFunction = (data: Descendant[], commands: Operation[]): any => {

	const editor = createEditor()

	// if it's empty then I need to set a default descendant
	if (!data || data.length === 0) data = [{ children: [{ text: '' }] }]
	editor.children = [...data]
	if (!commands) return editor.children
	commands = !Array.isArray(commands) ? [commands] : commands.flat(Infinity)

	withoutNormalizing(editor, () => {
		for (const command of commands) {

			if (command.type == 'set_selection' && !editor.selection) {
				// if there is no current selection, set a default selection otherwise it will throw an error
				editor.setSelection({
					anchor: { path: [0, 0], offset: 0 },
					focus: { path: [0, 0], offset: 0 }
				})
			}
			// if (command.type != 'set_selection' && !!command.path) {
			// 	if (!Node.has(editor, command.path)) return// editor.children
			// }
			editor.apply(command);

		}
	})

	return editor.children;
}

/**
 * Updates the content of an editor with a new array of children
 */
export function UpdateChildren(editor: Editor, newChildren: any[]) {
	Editor.withoutNormalizing(editor, () => {
		editor.children = newChildren;
		if (editor.selection) {
			const { anchor, focus } = editor.selection;
			Transforms.select(
				editor,
				{
					anchor: adjustPoint(editor, anchor),
					focus: adjustPoint(editor, focus)
				}
			)
		}
		editor.onChange()
	})
}

/**
 * Ensures that a Point does not go out of the content of an Editor
 */
function adjustPoint(editor: Editor, point: Point): Point {
	if (!point) return point
	const indexMax = editor.children.length -1
	const indexPoint = point.path[0]
	if (indexPoint > indexMax) return {
		offset: (editor.children[indexMax] as any)?.children[0]?.text?.length,
		path: [indexMax, 0]
	}
	const textLength = (editor.children[indexPoint] as any)?.children[0]?.text?.length
	return {
		path: point.path,
		offset: Math.min(point.offset, textLength)
	}
}

/**
 * Given an array of SLATE OPERATIONS, produces a simplified and compact version
 */
export function Normalize (actions: Operation[]): Operation[] {
	if (!actions) return []
	let normalized:Operation[] = []
	let indexLastSelection = -1

	for (let index = 0; index < actions.length; index++) {
		const action = actions[index]
		const prevAction: any = actions[index - 1]
		const lastNorm = normalized[normalized.length - 1]

		switch (action.type) {
			// if the previous one was also an "insert_text" then merge
			case "insert_text":
				if (lastNorm?.type == "insert_text" && action.path[0] == lastNorm?.path?.[0] /*&& action.offset+1 == lastNorm.offset*/) {
					lastNorm.text += action.text
					continue
				}
				break
			
			// if it's a "set_selection" then save it as the last one
			case "set_selection":
				indexLastSelection = normalized.length
				break

			// if the previous one was also a "remove_text" then merge
			case "remove_text":
				if (lastNorm?.type == "remove_text" && action.path[0] == prevAction?.path[0] /*&& action.offset+1 == lastNorm.offset*/) {
					// performing a backward deletion
					if (action.offset + 1 == prevAction.offset) {
						lastNorm.offset = action.offset
						lastNorm.text = action.text + lastNorm.text
						continue
					}
					if (action.offset == prevAction.offset) {
						lastNorm.text = lastNorm.text + action.text
						continue
					}
				}

				break
		}

		normalized.push({ ...action })
	}

	// simplify selections. keep only the last one
	if (indexLastSelection != -1) {
		(<SelectionOperation>normalized[indexLastSelection]).properties = null
		normalized = normalized.filter((action, index) => action.type != "set_selection" || index == indexLastSelection)
	}

	return normalized
}