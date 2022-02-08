const Prism = require('prismjs');

const BLOCK_NAME = "codediff"
const START_MARKER = "|||codediff";
const END_MARKER = "|||";

module.exports = (md, options) => {
  md.block.ruler.after("blockquote", BLOCK_NAME, (state, start) => {
    const startPos = state.bMarks[start] + state.tShift[start];
    if (!state.src.slice(startPos).startsWith(START_MARKER)) {
      return false;
    }
    const payloadStart = startPos + START_MARKER.length;
    const payloadLength = state.src.slice(payloadStart).indexOf(END_MARKER);
    if (payloadLength === -1) {
      return false;
    }
    const endPos = payloadStart + payloadLength + END_MARKER.length;
    const numLines = state.src.slice(startPos, endPos).split("\n").length;
    const token = state.push(BLOCK_NAME);
    token.block = true;
    token.content = state.src.substr(payloadStart, payloadLength);
    state.line += numLines;
    return true;
  });

  md.renderer.rules[BLOCK_NAME] = (tokens, idx /*, options, env */) => {
    const rawContent = tokens[idx].content.trim();
    const [language, ...lines] = rawContent.slice(1).split("\n");

    const codeToHighlight = lines
      .filter(line => !line.startsWith("-"))
      .map(line => line.startsWith("+") ? line.replace(/^\+/, ' ') : line)
      .map(line => line.slice(2))
      .join("\n");
      
    
    const highlighted = Prism.highlight(codeToHighlight, Prism.languages[language], language);
    const highlightedLines = highlighted.split("\n").map(line => line.replaceAll(">><", ">&gt;<"));
    
    function removeLeadingSpan(line) {
      if(!highlightedLines[line].trim().startsWith("</span>")) return "";
      highlightedLines[line] = highlightedLines[line].replace(/^(\s*)<\/span>/, "$1")
      return "</span>";
    }

    function injectAfterLastSpan(line, content) {
      line = highlightedLines[line];
      let idx = line.indexOf(`<span class="diff`);
      if(idx < 0 ) idx = 0;

      return line.slice(0, idx) + line.slice(idx).replace(/(?:(.*)<\/span>|$)/, "$1</span>" + content);
    }

    let currentOutputLine = 0;
    let mode = null;
    for(const line of lines) {
      const nextMode = line[0] ?? ' ';
     
      if(mode != nextMode) {
        // mode is null in the first line, so we shouldn’t try to
        // append anything to the previous line 🙄
        if(mode !== null) {
          highlightedLines[currentOutputLine-1] = injectAfterLastSpan(currentOutputLine-1, "</span>");
        }
        const leader = removeLeadingSpan(currentOutputLine);
        switch(nextMode) {
          case '+': 
            highlightedLines[currentOutputLine] = `${leader}<span class="diff added">${highlightedLines[currentOutputLine]}`;
          break;
          case '-': 
            highlightedLines.splice(currentOutputLine, 0,  `${leader}<span class="diff removed">${lines[currentOutputLine].slice(2).replaceAll("<", "&lt;").replaceAll(">", "&gt;")}`);
          break;
          default:
            highlightedLines[currentOutputLine] = `${leader}<span class="diff same">${highlightedLines[currentOutputLine]}`;
        }
      } else {
        if(nextMode === "-") {
            highlightedLines.splice(currentOutputLine, 0,  lines[currentOutputLine].slice(2).replaceAll("<", "&lt;").replace(">", "&gt;"));
        }
      }
      mode = nextMode;
      currentOutputLine++;
    }
    // const html = Prism.highlight(code, Prism.languages[language], language);
    return `<pre><code>${highlightedLines.join("\n")}</code></pre>`;
  };
};
