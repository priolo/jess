import { createEditor, Descendant, Node, withoutNormalizing } from "slate";
import { ApplyCommandFunction } from "../ClientObjects.types";


/**
 * Applica uno o piu COMMANDS (srebbero degli OPERATION-SLETE) ad un contenuto CHILDREN-SLATE
 * https://docs.slatejs.org/api/operations
 */
export const ApplyActions: ApplyCommandFunction = (data: Descendant[], commands: any): any => {

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
