import {Node} from './node.js';

export class Stylesheet {
  rules: Array<Ruleset>;

  constructor() {
    this.rules = [];
  }
}

export class Ruleset {
  selector: Selector;
  declarations: Array<Declaration>;

  constructor() {
    this.declarations = [];
  }
}

export class Selector {
  tags: Array<string>;

  constructor(selector: string) {
    this.tags =
      selector.split(' ')
        .map(e => e.trim())
        .filter(e => e.length > 0);
  }

  matches(node: Node): boolean {
    return this.tags.reverse().reduce((ok, tag) => {
      // If the selector is already not matching anymore, it stays non-matching.
      if(!ok) return false;

      // * always matches. Advance to the parent and continue.
      if(tag === '*') {
        node = node.parentNode;
        return true;
      }
      // Go up the tree until we run out of nodes or the next tag matches.
      while(node && tag !== node.name) {
        node = node.parentNode;
      }
      // If we ran out of nodes, no match.
      if(!node) return false;
      // Otherwise continue matching.
      return true;
    }, true);
  }

  get specificity() {
    return this.tags.reduce((spec, tag) => spec + tag === '*' ? 0 : 1, 0);
  }
}

export class Declaration {
  propertyName: string;
  value: string;

  constructor(propertyName, value: string) {
    this.propertyName = propertyName;
    this.value = value;
  }
}

export class Parser {
  private _input: string;

  constructor(input: string) {
    this._input = input.trimLeft();
  }

  private advanceAndTrim(n: number): string {
    const r = this._input.slice(0, n).trim();
    this._input = this._input.slice(n).trimLeft();
    return r;
  }

  parseStylesheet(): Stylesheet {
    const stylesheet = new Stylesheet();
    while(this._input.length > 0) {
      stylesheet.rules.push(this.parseRuleset());
    }
    return stylesheet;
  }

  private parseRuleset(): Ruleset {
    const idx = this._input.indexOf('{');
    if(idx === -1)
      throw new Error('Invalid Ruleset');
    const ruleset = new Ruleset();
    ruleset.selector = new Selector(this.advanceAndTrim(idx));
    // Consume '{'
    this.advanceAndTrim(1);
    while(this._input[0] !== '}') {
      ruleset.declarations.push(this.parseDeclaration());
    }
    // Slice off '}'
    this.advanceAndTrim(1);
    return ruleset;
  }

  private parseDeclaration(): Declaration {
    let idx = this._input.indexOf(':');
    if(idx === -1)
      throw new Error('Invalid property definition');
    const propertyName = this.advanceAndTrim(idx);
    // Consume ':'
    this.advanceAndTrim(1);
    idx = this._input.indexOf(';');
    if(idx === -1)
      throw new Error('Invalid value definition');
    const value = this.advanceAndTrim(idx);
    // Consume ';'
    this.advanceAndTrim(1);
    return new Declaration(propertyName, value);
  }
}
