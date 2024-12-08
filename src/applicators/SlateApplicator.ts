import { createEditor, Descendant, Editor, Node, NodeOperation, Operation, Point, SelectionOperation, Transforms, withoutNormalizing } from "slate";
import { ApplyCommandFunction } from "../ClientObjects.types.js";



/**
 * Applica uno o piu COMMANDS (srebbero degli OPERATION-SLETE) ad un contenuto CHILDREN-SLATE
 * https://docs.slatejs.org/api/operations
 */
export const ApplyCommands: ApplyCommandFunction = (data: Descendant[], commands: Operation[]): any => {

	const editor = createEditor()

	// se è vuoto allora devo mettergli un descendant di default
	if (!data || data.length === 0) data = [{ children: [{ text: '' }] }]
	editor.children = [...data]
	if (!commands) return editor.children
	commands = !Array.isArray(commands) ? [commands] : commands.flat(Infinity)

	withoutNormalizing(editor, () => {
		for (const command of commands) {


			if (command.type == 'set_selection' && !editor.selection) {
				// se non c'è una selezione corrente imposta una selezione di default altrimenti da errore
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
 * Dato un array di OPERATION-SLATE produco una versione semplificata e compatta
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
			// se anche il precedente era un "insert_text" allora mergio
			case "insert_text":
				if (lastNorm?.type == "insert_text" && action.path[0] == lastNorm?.path?.[0] /*&& action.offset+1 == lastNorm.offset*/) {
					lastNorm.text += action.text
					continue
				}
				break
			
			// se è una "set_selection" allora la salvo come ultima
			case "set_selection":
				indexLastSelection = normalized.length
				break

			// se anche il precedente era un "remove_text" allora mergio
			case "remove_text":
				if (lastNorm?.type == "remove_text" && action.path[0] == prevAction?.path[0] /*&& action.offset+1 == lastNorm.offset*/) {
					// sto effettuando una cancellazione all'indietro
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

	// semplifico le selezioni. mantengo solo l'ultima
	if (indexLastSelection != -1) {
		(<SelectionOperation>normalized[indexLastSelection]).properties = null
		normalized = normalized.filter((action, index) => action.type != "set_selection" || index == indexLastSelection)
	}

	return normalized
}