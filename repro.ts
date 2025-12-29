
import * as SlateApplicator from "./src/applicators/SlateApplicator.ts";

const actions = [
    {
        type: "set_selection",
        properties: null,
        newProperties: { anchor: { path: [0, 0], offset: 2 }, focus: { path: [0, 0], offset: 2 } }
    },
    {
        type: "insert_text",
        path: [0, 0],
        offset: 2,
        text: "x"
    },
    {
        type: "insert_text",
        path: [0, 0],
        offset: 3,
        text: "y"
    },
    {
        type: "insert_text",
        path: [0, 0],
        offset: 4,
        text: "z"
    }
];

const normalized = SlateApplicator.Normalize(actions as any);
console.log(JSON.stringify(normalized, null, 2));
