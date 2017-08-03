import * as HTMLParser from './html_parser.js';
import * as CSSParser from './css_parser.js';

export function render(canvas: CanvasRenderingContext2D, markup: string, styles: string) {
  const htmlParser = new HTMLParser.Parser(markup);
  const dom = htmlParser.parseDocument();
  const cssParser = new CSSParser.Parser(styles);
  const stylesheet = cssParser.parseStylesheet();
  console.log(dom);
  console.log(stylesheet);
}
