// Would you like some race conditions with your wine?
let DataTable;
import("../static/things/js-to-asc/data-table.mjs").then((m) => ({DataTable} = m));

const fs = require('fs');
const path = require('path');

const startMarker = "|||datatable";
const endMarker = "|||";

module.exports = (md, options) => {
  md.block.ruler.after("blockquote", "datatable", (state, start) => {
    const startPos = state.bMarks[start] + state.tShift[start];
    if (!state.src.slice(startPos).startsWith(startMarker)) {
      return false;
    }
    const payloadStart = startPos + startMarker.length;
    const payloadLength = state.src.slice(payloadStart).indexOf(endMarker);
    if (payloadLength === -1) {
      return false;
    }
    const endPos = payloadStart + payloadLength + endMarker.length;
    const numLines = state.src.slice(startPos, endPos).split("\n").length;
    const token = state.push("datatable");
    token.block = true;
    token.content = state.src.substr(payloadStart, payloadLength);
    state.line += numLines;
    return true;
  });

  md.renderer.rules.datatable = (tokens, idx, options, env ) => {
    const rawTableDescriptor = tokens[idx].content.trim();
    const tableDescriptor = new Function(
      "table",
      `return (${rawTableDescriptor})`
    )();
    let requires = [];
    if(Array.isArray(tableDescriptor.requires)) {
      requires = tableDescriptor.requires.map(r => require(path.resolve(__dirname, '../', r)));
    }
    const dataTable = DataTable.fromCSV(fs.readFileSync(path.resolve(__dirname, '../', tableDescriptor.data), "utf8"));
    const newDataTable = tableDescriptor.mangle(dataTable, ...requires);
    const uid = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16)
    ).join("");
    let markup = newDataTable.toHTML(uid);
    if(tableDescriptor?.interactive) {
      markup += `
        <script type="module">
          import {interactive} from "/things/js-to-asc/data-table.mjs";

          const table = document.getElementById("${uid}").children[0];
          interactive(table);
        </script>
      `
    }
    return markup;
  };
};
