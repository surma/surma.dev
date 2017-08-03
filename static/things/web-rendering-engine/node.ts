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

  constructor(type: NodeType, parentNode: Node|null = null, data: string = '') {
    this.type = type;
    this.parentNode = parentNode;
    this._data = data;
    this.childNodes = [];
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
}
