import {Stylesheet, Declaration} from './stylesheet.js';

export enum NodeType {
  DOCUMENT_NODE,
  ELEMENT_NODE,
  TEXT_NODE,
}

export class Node {
  type: NodeType;
  childNodes: Array<Node>;
  parentNode: Node;
  private _data: string;
  specifiedStyles: Map<string,string>;

  constructor(type: NodeType, parentNode: Node|null = null, data: string = '') {
    this.type = type;
    this.parentNode = parentNode;
    this._data = data;
    this.childNodes = [];
    this.specifiedStyles = new Map();
  }

  get value(): string {
    if(this.type !== NodeType.TEXT_NODE)
      return null;
    return this._data;
  }

  get name(): string {
    switch(this.type) {
      case NodeType.DOCUMENT_NODE:
        return '#document';
      case NodeType.TEXT_NODE:
        return '#text';
      default:
        return this._data;
    }
  }

  appendChild(child: Node) {
    this.childNodes.push(child);
  }

  findNodes(tag: string): Array<Node> {
    return Array.from(this.nodes()).filter(node => node.name === tag);
  }

  *nodes(): IterableIterator<Node> {
    yield this;
    for(const child of this.childNodes) {
      yield* child.nodes();
    }
  }

  applyStyles(sheet: Stylesheet) {
    // This is “the cascade”
    this.specifiedStyles =
      sheet.matchingRules(this)
        .sort((a, b) => a.selector.specificity - b.selector.specificity)
        .reduce((styles, rule) => {
          for(const declaration of rule.declarations) {
            styles.set(declaration.propertyName, declaration.value);
          }
          return styles;
        }, new Map<string, string>());

    this.inheritStyles();
  }

  private inheritStyles() {
    for(const [propertyName, value] of this.specifiedStyles) {
      if(value !== 'inherit')
        continue;
      let node = this.parentNode;
      while(node && (!node.specifiedStyles.has(propertyName) || node.specifiedStyles.get(propertyName) === 'inherit'))
        node = node.parentNode;
      if(!node)
        continue;
      this.specifiedStyles.set(propertyName, node.specifiedStyles.get(propertyName));
    }
  }
}
