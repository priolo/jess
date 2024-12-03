import { SlateApplicator } from "@priolo/jess";
import { useMemo } from 'react';
import { createEditor, Operation } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, Slate, withReact } from 'slate-react';
import { clientObjects, sendCommands } from './jessService';



function App() {

	const editor = useMemo(() => {
		const editor = withHistory(withReact(createEditor()))
		const { apply } = editor;
		editor.apply = (operation: Operation) => {
			// sincronizza tutto quello che NON è un operazione di selezione
			if (!Operation.isSelectionOperation(operation)) {
				console.log("operation:", operation)
				sendCommands(operation)
			}
			apply(operation);
		}
		clientObjects.observe("doc", () => {
			const children = clientObjects.getObject("doc").valueTemp
			SlateApplicator.UpdateChildren(editor, children)
		})
		return editor
	}, [])


	return (
		<Slate
			editor={editor}
			initialValue={[{ children: [{ text: '' }] }]}

		>
			<Editable
				style={{ backgroundColor: "lightgray", width: 400, height: 400, padding: 5 }}
				renderElement={({ attributes, element, children }) =>
					<div {...attributes}>{children}</div>
				}
				renderLeaf={({ attributes, children, leaf }) =>
					<span {...attributes}>{children}</span>
				}
			/>
		</Slate>
	)
}

export default App


