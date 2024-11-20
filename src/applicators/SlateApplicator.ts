import { createEditor, Descendant, Transforms, withoutNormalizing } from "slate";
import { ApplyActionFunction } from "../ClientObjects.types";



export const ApplyAction: ApplyActionFunction = (data: Descendant[], command: any) => {

	const editor = createEditor()
	// se è vuoto allora devo mettergli un descendant di default
	if (!data || data.length === 0) data = [{ children: [{ text: '' }] }];

	editor.children = data;
	if (!command) return editor.children;

	withoutNormalizing(editor, () => {
		//actions.forEach(op => {
		if (command.type === 'set_selection' && !editor.selection) {
			// se non c'è una selezione corrente imposta una selezione di default altrimenti da errore
			Transforms.select(editor, { anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 0 } })

		}
		editor.apply(command);
		//})
	})
	return editor.children;
}