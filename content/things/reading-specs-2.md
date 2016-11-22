{
  "title": "How to read web specs Part IIa – Or: ECMAScript Symbols",
  "date": "2016-11-22",
  "socialmediaimage": "esnext.png",
  "live": "true"
}

Two browsers behave differently when given the same code. Which one is the buggy one? The spec is almost guaranteed to contain the answer, but it’s notoriously hard to read. Maybe this will help.

<!--more-->

> __Note:__ Before we start: The spec is not the only or maybe not even the best source to get this kind of information. Specs are hard to read, the ECMAScript spec especially so. While there is ongoing work on making specs more digestible for developers, more approachable articles can be found on third-party sites like [MDN][MDN Symbol]. You don’t _need_ to be comfortable with the spec to be a good web developer! 

The [ECMAScript 6 Standard][] (⚠️ 4MB!) – often abbreviated ES6, or now ES2015 – is a weird and big document. Originally, I wanted to write about Iterators, Generator and their respective asynchronous counterparts. While reading about one of the building block – “Iterables” – I was already lost:

![The definition of an interable](old-iterables.png)

`@@iterator`? Huh. That’s not a valid property name. So `[Cmd]+[F]`’ing through the spec, it turns out that `@@something` is a shorthand for a “Symbol” and there’s also a [list of well-known Symbols][Old section 6.1.5.1] in the spec. So what are Symbols? What do they do and how do I use them? I thought: Time to read the spec!


## Using the right spec document

The first document I found is a _snapshot_ of ESnext. Those snapshots are going to keep happening every year (hence ES2016, ES2017...). My colleague [Daniel Ehrenberg], an engineer on V8 and member of TC39, told me that developers should be looking at the spec draft rather than the snapshots. JavaScript engines like V8 have been trying to keep up with the spec draft rather than going from snapshot to snapshot. If you read my [previous post in this series], you’ll remember I said something similar about Web specs. Drafts – use them!

So where’s the ESnext’s draft spec? On the [TC39’s GitHub]! It’s much smaller (~700KB thanks to GZIP), has a sidenav and even a search bar so you don’t have to awkwardly `[Ctrl/Cmd]+[F]` through the website like I did.

![The ESnext spec draft](esnext.png)

## Definition

Let’s make use of the new found superpowers that is a searchable ToC and look for `Symbol`. [Section 6.1.5][Symbol 6.1.5] as well as [section 19.4][Symbol 19.4] show up:

### 6.1.5 The Symbol Type

> The Symbol type is the set of all non-String values that may be used as the key of an Object property (6.1.7).
>
> Each possible Symbol value is unique and immutable.
>
> Each Symbol value immutably holds an associated value called [[Description]] that is either undefined or a String value.

### 19.4.1 The Symbol Constructor

> The Symbol constructor is the `%Symbol%` intrinsic object and the initial value of the `Symbol` property of the global object. When `Symbol` is called as a function, it returns a new Symbol value.
>
> The `Symbol` constructor is not intended to be used with the `new` operator or to be subclassed. It may be used as the value of an `extends` clause of a class definition but a `super` call to the `Symbol` constructor will cause an exception.


#### 19.4.1.1 Symbol ( [ description ] )

> When `Symbol` is called with optional argument `description`, the following steps are taken:

> 1. If NewTarget is not `undefined`, throw a `TypeError` exception.
> 2. If `description` is `undefined`, let `descString` be `undefined`.
> 3. Else, let `descString` be ? `ToString(description)`.
> 4. Return a new unique Symbol value whose [[Description]] value is `descString`.

There’s _a lot_ in here, so let’s go through it bit by bit.

## DevTools Exploration

> __Note:__ I built a small Mini-DevTools thing to show you what steps I took when I tried to wrap my head around things. It runs the code in your browser. So if you don’t have good support for recent JavaScript features, you _might_ run into problems. You can also edit the code in place if you want to, but it will break the syntax highlighting. _Disclaimer:_ `console.logAndEval` is totally not real.

### Symbol Constructor

The first thing I did was to play around with the constructor a bit. According to [19.4.1][Symbol 19.4.1] “the Symbol constructor is [...] the [...] `Symbol` property of the global object.”. As defined in [19.4.1.1][Symbol 19.4.1.1], it takes an optional _description_ as argument and said argument will be turned into a string with `ToString()`. Furthermore, according to [6.1.5][Symbol 6.1.5], each Symbol is unique: 

{{< highlight JavaScript >}}
// So you can just create symbols. They look a little
// out of place in logs.
const sym = Symbol();

console.logAndEval('sym'); 
//!Step
// You can give them descriptions which show up
// in logs, too.
const sym = Symbol('some description');

console.logAndEval('sym'); 
//!Step
// They are meant to be unique, so no two symbols
// should ever return true when compared, even
// when the description is equal.
const symA = Symbol('A');
const symB = Symbol('B');
const symC = Symbol('B');

console.logAndEval('symA === symB');
console.logAndEval('symB === symC');
console.logAndEval('symC === symA');

// But of course
console.logAndEval('symA === symA');
//!Step
// And according to spec, `toString()` is
// used for the given description.
const nonStringDescription = {
  toString() {
    return "value of toString()";
  }
};
const sym = Symbol(nonStringDescription);

console.logAndEval('sym');
//!Step
// As per spec, `toString()` should be called
// in the constructor. 
const nonStringDescription = {
  toString() {
    throw new Error('lol')
  }
};
console.log('Before constructor');
const sym = Symbol(nonStringDescription);
console.log('After constructor');
console.log('Before logging');
console.logAndEval('sym');
console.log('After logging');
{{< /highlight >}}

Seems like Chrome is behaving to spec. Shocking.

### NewTarget

I was a little confused by step one of the implementation spec of the `Symbol` constructor:

> 1. If NewTarget is not `undefined`, throw a `TypeError` exception.

What is _NewTarget_? After Cmd+F’ing through the spec (and, admittedly, googling it), I found something `new` I didn’t know about JavaScript (can you see what I did there?): The _NewTarget_ tells you what the target of the `new` keyword was. That means inside functions `new.target` is a way to figure out if the function has been called with `new` keyword or not. 

{{< highlight JavaScript >}}
// In A normal function call, `new.target` 
// will be undefined.
// As a constructor, it will be a reference to the
// function you are currently in.
function myThing () {
  console.log(new.target);
}
myThing();
new myThing();

//!Step
// In class constructors, it will give you
// the name of the class being constructed.
class A {
  constructor() {
    console.log(new.target.name);
  }
}
class B extends A {
  constructor() {
    super();
  }
}
new A();
new B();
{{< /highlight >}}

So step 1 in the `Symbol()` implementation prevents it from being called as a constructor (i.e. with `new`).

But now back to Symbols. 

### Objects as property keys

[4.3.25][Symbol 4.3.25] states:

> primitive value that represents a unique, non-String Object property key

This is something I never really thought about. It is implied here that up to this point objects can _only_ have strings as property keys. Again, I had to verify this in DevTools because I thought: What about arrays?!

{{< highlight JavaScript >}}
// I CAN USE WHATEVER I WANT AS KEY!
const myKey = {};
const myObject = {
  [myKey]: 'see?'
};

console.logAndEval('myObject[myKey]');
//!Step
// Uuh, what happens when I do this...
const keyA = {};
const keyB = {};
const myObject = {
  [keyA]: 'valueA',
  [keyB]: 'valueB'
};

console.logAndEval('myObject[keyA]');
console.logAndEval('myObject[keyB]');
//!Step
// Wait... 
const keyA = {a: 1};
const keyB = {b: 2};
const myObject = {
  [keyA]: 'valueA',
  [keyB]: 'valueB'
};

console.logAndEval('myObject[keyA]');
console.logAndEval('myObject[keyB]');
console.logAndEval('Object.keys(myObject).length');
//!Step
// They call `toString()`, don’t they...  
const keyA = {a: 1};
const keyB = {b: 2};
const myObject = {
  [keyA]: 'valueA',
  [keyB]: 'valueB'
};

// ... yup
console.logAndEval('Object.keys(myObject)');
//!Step
// But seriously, what about arrays?
const myArray = [1, 2, 3, 4];
const keyTypes = 
  Object.keys(myArray)
    .map(key => typeof(key));

// ... also strings
console.logAndEval('keyTypes');
{{< /highlight >}}

Alright, so all property keys in objects are strings. And now there’s symbols, which are the exception to this rule.

### Symbols as property keys

Let’s play with this!

{{< highlight JavaScript >}}
// The old access method still works
const mySymbol = Symbol('ohai');
const myObject = {
  a: 1,
  b: 2,
  [mySymbol]: 3
}
console.logAndEval('myObject.a');
console.logAndEval('myObject["b"]');
console.logAndEval('myObject[mySymbol]');
//!Step
// But symbols seem to be more for hidden properties
const mySymbol = Symbol('ohai');
const myObject = {
  a: 1,
  b: 2,
  [mySymbol]: 3
}
console.logAndEval('JSON.stringify(myObject)');
console.logAndEval('Object.getOwnPropertyNames(myObject)');
console.logAndEval('Object.keys(myObject)');
//!Step
// Only Reflect and explicit Symbol listings list symbols
const mySymbol = Symbol('ohai');
const myObject = {
  a: 1,
  b: 2,
  [mySymbol]: 3
}
console.logAndEval('Object.getOwnPropertySymbols(myObject)');
console.logAndEval('Reflect.ownKeys(myObject)');
{{< /highlight >}}

The fact that `JSON.stringify()` makes sense as Symbols are unique and can’t be serialized, but why does `Object.keys()` not list them? The main use-case for Symbols is to have a way to specify properties and methods that are guaranteed to not name-clash with anything else in the scope. They are also supposed to give you a way to hook into existing algorithms. [Section 6.1.5.1][Symbol 6.1.5.1] lists “well-known Symbols” that you can set on an object to make existing algorithms treat your object appropriately.

These well-known Symbols are exposed as properties on the global `Symbol` object.

{{< highlight JavaScript >}}
// We can make our object become a “replacer”
// for `String.replace()`
const x = {};
x[Symbol.replace] = (...s) => console.log(s);

'IWonder'.replace(x, 'WhatParametersIGet');
//!Step
// We can give our object a String tag
// so it looks nicer when being console.log’d
const x = {
  [Symbol.toStringTag]: 'myGreatObject'
}

console.logAndEval('x');
{{< /highlight >}}

One consequence of using Symbols is that we need some way to distribute our symbols so we (or others) can use them. Well-known symbols attach themselves to the global `Symbol` object, `Symbol` also offers a registry. The only way I know about this is because [section 19.4][Symbol 19.4] lists all properties of the `Symbol` object. In-between all those well-known symbols are two convenince methods: `Symbol.for()` and `Symbol.keyFor()`. `Symbol.for()` is like a factory. If a symbol for the given key exists it will be returned, if not it will be created, appended to the registry and then returned.

You might be asking why to use the provided registry over just attaching Symbols yourself to the global `Symbol` object, and the spec has a hint as to why:

> The GlobalSymbolRegistry is a List that is globally available. __It is shared by all realms.__

Let’s try that out!

{{< highlight JavaScript >}}
// Let’s try not using the registry.
const mySymbol = Symbol('mySymbol');
const myObject =  {
  [mySymbol]: 'hai'
};

// And share it by attaching it to 
// the global `Symbol` object
Symbol.mySymbol = mySymbol;

console.logAndEval('myObject[Symbol.mySymbol]');
//!Step
// But what about that “realms” thing?
const mySymbol = Symbol('mySymbol');
Symbol.mySymbol = mySymbol;

// iframes are a different realm
const iframe = document.createElement('iframe')
document.body.appendChild(iframe);
iframe.contentWindow.console.log = console.log.bind(console);
iframe.contentDocument.write(`
  <script>
    (function() {
      console.log(Symbol.mySymbol);
    })();
  </script>`);
// I honestly did never expect this to 
// work in the first place.
document.body.removeChild(iframe);
//!Step
// ... and this where the registry comes into play!
const mySymbol = Symbol.for('mySymbol');

// iframes are a different realm
const iframe = document.createElement('iframe')
document.body.appendChild(iframe);
iframe.contentWindow.console.log = console.log.bind(console);
iframe.contentDocument.write(`
  <script>
    function compareSymbols(otherSymbol) {
      console.log(otherSymbol === Symbol.for('mySymbol'));
    }
  </script>`);
iframe.contentWindow.compareSymbols(mySymbol);
document.body.removeChild(iframe);

{{< /highlight >}}

## Iterables

So coming back to my original question: `@@iterator` is a well-known symbol I can use to make my object iterable. 

![The definition of an interable](new-iterables.png)

[Section 25.1.1.1] to 25.1.1.3 explain that an “Iterable” has function under `@@iterator` that returns an object implementing the “Iterator” interface. The “Iterator” interface only has a `next()` method returning an “IteratorResult”. The “IteratorResult” interface has two properties `done` and `value`.

{{< highlight JavaScript >}}
const myIterable = {
  [Symbol.iterator]: _ => {
    let counter = 0;
    return {
      next: _ => ({
          value: `Step ${++counter}`,
          done: counter > 3
      })
    };
  }
};

for (let i of myIterable) {
  console.log(i);
}
//!Step
{{< /highlight >}}

We made our object iterable using Symbols. Wohooo! Honestly, I am just scratching the surface of Iterables & Co here and will talk about this in more detail when I am done with Part IIb of this series. I _think_ I should be able to cover Generators and their asynchronous version in the next post now.

Even though the spec is unwieldy, the engineers are working on making it more accessible and approachable. In the mean time I hope this blog post can guide you to find the things you are looking for.

[ECMAScript 6 Standard]: http://www.ecma-international.org/ecma-262/6.0/index.html
[Old Section 6.1.5.1]: http://www.ecma-international.org/ecma-262/6.0/index.html#sec-well-known-symbols
[MDN Symbol]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
[MDN Symbol.iterator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator
[Daniel Ehrenberg]: https://twitter.com/littledan
[previous post in this series]: /things/reading-specs/
[TC39’s GitHub]: https://tc39.github.io/ecma262/
[Symbol 4.3]: https://tc39.github.io/ecma262/#sec-symbol-value
[Symbol 4.3.25]: https://tc39.github.io/ecma262/#sec-symbol-value
[Symbol 6.1.5]: https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
[Symbol 6.1.5.1]: https://tc39.github.io/ecma262/#sec-well-known-symbols
[Symbol 19.4]: https://tc39.github.io/ecma262/#sec-symbol-objects
[Symbol 19.4.1]: https://tc39.github.io/ecma262/#sec-symbol-constructor
[Symbol 19.4.1.1]: https://tc39.github.io/ecma262/#sec-symbol-description
[Section 25.1.1.1]: https://tc39.github.io/ecma262/#sec-iterable-interface
[MDN Symbol]: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Symbol