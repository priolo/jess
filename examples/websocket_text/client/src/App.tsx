import { TextApplicator } from '@priolo/jess';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import { clientObjects, sendCommands } from './jessService';

function App() {

	const [text, setText] = useState('')
	// Opzionale. Memorizzo la selezione per evitare che il cursore si sposti
	const lastSelection = useRef({ start: 0, end: 0 });
	const txtRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		clientObjects.observe("doc", (text) => {
			setText(text)
			setTimeout(() => {
				txtRef.current?.setSelectionRange(lastSelection.current.start, lastSelection.current.end)
			})
		})
	}, [])

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => sendCommands(
		TextApplicator.CommandFromKey(e.key, e.currentTarget.selectionStart, e.currentTarget.selectionEnd)
	)
	const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => lastSelection.current = {
		start: e.currentTarget.selectionStart,
		end: e.currentTarget.selectionEnd
	}

	return (
		<div>
			<textarea ref={txtRef}
				style={{ height: '400px' }}
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={handleKeyDown}
				onSelect={handleSelect}
			></textarea>
		</div>
	)
}

export default App

