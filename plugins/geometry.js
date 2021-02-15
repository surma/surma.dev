// Would you like some race conditions with your wine?
let geometry;
import("../static/lab/diagram/geometry.mjs").then((m) => (geometry = m));

const startMarker = "|||geometry";
const endMarker = "|||";

module.exports = (md, options) => {
  md.block.ruler.after("blockquote", "geometry", (state, start) => {
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
    const token = state.push("geometry");
    token.block = true;
    token.content = state.src.substr(payloadStart, payloadLength);
    state.line += numLines;
    return true;
  });

  md.renderer.rules.geometry = (tokens, idx /*, options, env */) => {
    const rawGeometryDescriptor = tokens[idx].content.trim();
    const geometryDescriptor = new Function(
      "geometry",
      `return (${rawGeometryDescriptor})`
    )(geometry);
    const uid = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16)
    ).join("");
    return `
      <div id="${uid}" class="geometrycontainer">
      ${geometry.renderToString(geometryDescriptor)}
      </div>
      <script type="module">
        import * as geometry from "/lab/diagram/geometry.mjs";
        import * as lit from "lit1.3.0/lit-html.js";
        import {unsafeSVG} from "lit1.3.0/directives/unsafe-svg.js";
        import {unsafeHTML} from "lit1.3.0/directives/unsafe-html.js";
        const descriptor = ${rawGeometryDescriptor};
        geometry.instantiateDiagram(descriptor, document.getElementById("${uid}"), {render: lit.render, html: lit.html, svg: lit.svg, unsafeSVG, unsafeHTML} );
      </script>
    `;
  };
};
