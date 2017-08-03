import * as HTMLParser from './html_parser.js';

export function render(canvas: CanvasRenderingContext2D, markup: string, styles: string) {
  const htmlParser = new HTMLParser.Parser(markup);
  const dom = htmlParser.parseDocument();
  console.log(dom);
}
