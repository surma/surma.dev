{
  "title": "Let’s build a web rendering engine",
  "date": "2017-07-03",
  "socialmediaimage": "logo.jpg",
  "live": "false"
}

Let’s build our own rendering engine. Because sure, why not? I found it very educational, and maybe so will you. Blaaaa

<!--more-->

## Tools

- TypeScript
- Canvas
- CSS2.2 spec: https://www.w3.org/TR/CSS22
- CSS3 sizing spec: https://drafts.csswg.org/css-sizing-3/
- WHATWG DOM Spec: https://dom.spec.whatwg.org
- Super-small subset of HTML
- Super-small subset of CSS

## HTML
### Data structures

To not waste too much time on parsing, we are going to implement a tiny HTML subset. We got tags. And text. That’s it. No attributes, no comments.


{{< highlight HTML >}}
<html>
  <body>
    <header>
      <h1>Ohai</h1>
      <h2>I am Web</h2>
    </header>
    <main>
      <p>Lorem ipsum?</p>
    </main>
  </body>
</html>
{{< /highlight >}}


I am gonna skip most of the DOM spec and just focus on their [`Node` type](https://dom.spec.whatwg.org/).DOM spec has a couple of [node types](https://dom.spec.whatwg.org/#dom-node-nodetype), we are going to limit ourselves to `ELEMENT_NODE`, `TEXT_NODE` and `DOCUMENT_NODE`.

{{< highlight TypeScript >}}
enum NodeType {
  ELEMENT_NODE,
  TEXT_NODE
}

class Node {
  private _type: NodeType;
  private _value: string;
  private _childNodes: Array<Node>;

  constructor(type: NodeType) {
    this._type = type;
    this._childNodes = [];
  }

  get value(): string {
    if(this._type === NodeType.ELEMENT_NODE)
      return null;
    return this._value;
  }

  set value(value: string) {
    if(this._type === NodeType.ELEMENT_NODE)
      return;
    this._value = value;
  }

  get type(): NodeType {
    return this._type;
  }

  get childNodes(): Array<Node> {
    return [...this._childNodes]; // Copy
  }

  appendChild(child: Node) {
    this._childNodes.push(child);
  }
}
{{< /highlight >}}

### Parser

The parser’s job is to take a string and turn it into a tree of `Node`s. Since HTML5, the [DOM parser has been standardized](https://html.spec.whatwg.org/multipage/parsing.html#parsing), meaning will that all browsers will generate the same DOM tree for ambiguous or malformed HTML input. Screw that, we’re keeping it simple! I am not going to write a proper LR(1) parser either – a simple recursive descent parser is more than sufficient here:

{{< highlight TypeScript >}}
  // parser here
{{< /highlight >}}

## CSS
### Data Structures

Looking at the [original grammar](https://www.w3.org/TR/CSS22/syndata.html#tokenization), we have the following structure:

The top-level stdructure is a stylesheet. A stylesheet consists of rulesets, each ruleset has a selector and a declarationlist constiting of declarations. Each declaration is a pair of a property name and a value.

We all know CSS has like a shitload of selectors, I am going to limit this to a few: tag names, '*' and the descandant selector, 'space'.



