import {Node} from './node.js';

export class Stylesheet {
  rules: Array<Ruleset>;

  constructor() {
    this.rules = [];
  }

  private matchingRules(n: Node): Array<Ruleset> {
    return this.rules.filter(rule => rule.selector.matches(n));
  }

  applyTo(node: Node) {
    // This is “the cascade”
    node.specifiedStyles =
      this.matchingRules(node)
        .sort((a, b) => a.selector.specificity - b.selector.specificity)
        .reduce((styles, rule) => {
          for(const declaration of rule.declarations) {
            styles.set(declaration.propertyName, declaration.value);
          }
          return styles;
        }, new Map<string, string>());
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
    const tags = this.tags.slice().reverse();
    const start = tags[0] === '*' || tags[0] === node.name;
    return tags.slice(1).reverse().reduce((ok, tag) => {
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
    }, start);
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
