import { createEditor, Descendant, Node, Transforms, withoutNormalizing } from "slate";
import { ApplyActionFunction } from "../ClientObjects.types.js";


/**
 * Applica ad un contenuto CHILDRE SLATE ina OPERATION
 * https://docs.slatejs.org/api/operations
 */
export const ApplyAction: ApplyActionFunction = (data: Descendant[], command: any) => {

	const editor = createEditor()
	// se è vuoto allora devo mettergli un descendant di default
	if (!data || data.length === 0) data = [{ children: [{ text: '' }] }];

	editor.children = [...data];
	if (!command) return editor.children;

	withoutNormalizing(editor, () => {
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
	})
	return editor.children;
}

export const ApplyActions: ApplyActionFunction = (data: Descendant[], commands: any[]) => {

	const editor = createEditor()
	// se è vuoto allora devo mettergli un descendant di default
	if (!data || data.length === 0) data = [{ children: [{ text: '' }] }]

	editor.children = [...data]
	if (!commands || commands.length == 0) return editor.children

	withoutNormalizing(editor, () => {
		for ( const command of commands ) {


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
