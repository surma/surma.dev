export enum NodeType {
  DOCUMENT_NODE,
  ELEMENT_NODE,
  TEXT_NODE,
}

export class Node {
  private _type: NodeType;
  private _data: string;
  private _childNodes: Array<Node>;

  constructor(type: NodeType, data: string = '') {
    this._type = type;
    this._data = data;
    this._childNodes = [];
  }

  get value(): string {
    if(this._type !== NodeType.TEXT_NODE)
      return null;
    return this._data;
  }

  get name(): string {
    switch(this._type) {
      case NodeType.DOCUMENT_NODE:
        return '#document';
      case NodeType.TEXT_NODE:
        return '#text';
      default:
        return this._data;
    }
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
