import { createEditor, Descendant, Editor, Node, Point, Transforms, withoutNormalizing } from "slate";
import { ApplyCommandFunction } from "../ClientObjects.types.js";



/**
 * Applica uno o piu COMMANDS (srebbero degli OPERATION-SLETE) ad un contenuto CHILDREN-SLATE
 * https://docs.slatejs.org/api/operations
 */
export const ApplyCommands: ApplyCommandFunction = (data: Descendant[], commands: any): any => {

	const editor = createEditor()

	// se è vuoto allora devo mettergli un descendant di default
	if (!data || data.length === 0) data = [{ children: [{ text: '' }] }]
	editor.children = [...data]
	if (!commands) return editor.children
	if (!Array.isArray(commands)) commands = [commands]

	withoutNormalizing(editor, () => {
		for (const command of commands) {


			if (command.type === 'set_selection' && !editor.selection) {
				// se non c'è una selezione corrente imposta una selezione di default altrimenti da errore
				editor.setSelection({
					anchor: { path: [0, 0], offset: 0 },
					focus: { path: [0, 0], offset: 0 }
				})
			}
			if (!!command.path) {
				if (!Node.has(editor, command.path)) return// editor.children
			}
			editor.apply(command);

		}
	})

	return editor.children;
}

/**
 * Aggiorna il contenuto di un editor con un nuovo array di children
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
 * mi assicuro che un Point non esca fuori dal contenuto di un Editor
 */
function adjustPoint(editor: Editor, point: Point): Point {
	if (!point) return point
	const indexMax = editor.children.length -1
	const indexPoint = point.path[0]
	if (indexPoint > indexMax) return {
		offset: editor.children[indexMax]?.children[0]?.text?.length,
		path: [indexMax, 0]
	}
	const textLength = editor.children[indexPoint]?.children[0]?.text?.length
	return {
		path: point.path,
		offset: Math.min(point.offset, textLength)
	}
}
