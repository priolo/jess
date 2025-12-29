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

function isPathEqual(path1: number[], path2: number[]) {
    if (!path1 || !path2) return false;
    if (path1.length !== path2.length) return false;
    for (let i = 0; i < path1.length; i++) {
        if (path1[i] !== path2[i]) return false;
    }
    return true;
}

/**
 * Given an array of SLATE OPERATIONS, produces a simplified and compact version
 */
export function Normalize (actions: Operation[]): Operation[] {
	if (!actions || actions.length === 0) return []

	// Filter out selections, but keep the last one
	const lastSelection = actions.reduce((last, action) => action.type === 'set_selection' ? action : last, null as Operation | null);
	const contentActions = actions.filter(action => action.type !== 'set_selection');

	let normalized:Operation[] = []

	for (let index = 0; index < contentActions.length; index++) {
		const action = contentActions[index]
		const prevAction: any = contentActions[index - 1]
		const lastNorm = normalized[normalized.length - 1]

		switch (action.type) {
			// if the previous one was also an "insert_text" then merge
			case "insert_text":
				if (lastNorm?.type == "insert_text" && 
					isPathEqual(action.path, lastNorm.path) && 
					action.offset === lastNorm.offset + lastNorm.text.length) {
					lastNorm.text += action.text
					continue
				}
				break

			// if the previous one was also a "remove_text" then merge
			case "remove_text":
				if (lastNorm?.type == "remove_text" && isPathEqual(action.path, prevAction?.path)) {
					// performing a backward deletion
					if (action.offset + 1 == prevAction.offset) {
						lastNorm.offset = action.offset
						lastNorm.text = action.text + lastNorm.text
						continue
					}
					// performing a forward deletion
					if (action.offset == prevAction.offset) {
						lastNorm.text = lastNorm.text + action.text
						continue
					}
				}
				break
		}

		normalized.push({ ...action })
	}

	if (lastSelection) {
		(<SelectionOperation>lastSelection).properties = null
		normalized.push({ ...lastSelection })
	}

	return normalized
}