import {Node} from './node.js';
import {Stylesheet, Ruleset, Selector, Declaration} from './stylesheet.js';

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
