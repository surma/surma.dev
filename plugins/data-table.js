// Would you like some race conditions with your wine?
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

  md.renderer.rules.datatable = (tokens, idx /*, options, env */) => {
    const rawTableDescriptor = tokens[idx].content.trim();
    const tableDescriptor = new Function(
      "table",
      `return (${rawTableDescriptor})`
    )();
    const data = fs.readFileSync(path.resolve(__dirname, '../', tableDescriptor.data));
    return data;
  };
};
