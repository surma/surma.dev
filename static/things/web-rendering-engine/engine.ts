import * as HTMLParser from './html_parser.js';
import * as CSSParser from './css_parser.js';
// import * as RenderTree from './rendertree'

export function render(context: CanvasRenderingContext2D, markup: string, styles: string) {
  const htmlParser = new HTMLParser.Parser(markup);
  const dom = htmlParser.parseDocument();
  const cssParser = new CSSParser.Parser(styles);
  const stylesheet = cssParser.parseStylesheet();

  for(const node of dom.nodes()) {
    node.applyStyles(stylesheet);
  }

  console.log('done');
  window.dom = dom;
  window.stylesheet = stylesheet;
}

