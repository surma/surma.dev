---
title: "Coding interviews step-by-step: Optimize for iteration"
date: "2022-01-06"
live: false
socialmediaimage: "social.png"
---

A big part of interviews, I think, is development velocity and agility. And that can be optimized for.

<!-- more -->

I have done a bunch of interviews as an interviewer during my time at Google, and I recently went through a couple of interviews to eventually land my new gig at Shopify. I have spent some time thinking how I evaluated candidates as an interviewer, and how I approached my technical interview questions as a candidate. I realized that there’s probably some experience worth sharing, hence this blog post.

## The Coding Problem

A friend of mine told me about this interview question:

> Build a spreadsheet-like web app from scratch using React Hooks. Start simple, and add features like cell referencing as we go along.

This interview question seems fairly representative of the type of questions that I was tasked with. You have your editor of choice and your tech stack of choice, and it’s less of an exam and more of a pair programming session to create a fully working app. In this case, the tech stack is partly defined in the question, but often you’ll be left to choose whatever you are comfortable with. For the purpose of the blog post, I’ll use Preact and hooks. Because why not.

Let me be clear that I didn’t have this question in an interview. I’ll be pretending to go through a ~60 minute interview with an imaginary interviewer. And what you will read here are my reckons. **The most important part of an interview is communication**. Keep your interviewer in the loop not only on what you are _currently_ doing, but also what you are working towards. Think out loud and describe what your ideas are and how you plan to tackle them. Most interviewers want to help and will reinforce good ideas and try and prevent you from going down the wrong path. A coder that can’t articulate what they are doing is likely not going to do well in a team environment.

### Think Before You Code

Before starting to code, I analyze the task at hand. Coding problems are often _intentionally_ short and vague. Don’t let this frighten you. In my experience, you can use that to your advantage for multiple reasons:

- A short description can’t hide details and gotchas in a wall of text.
- Vagueness means more room to interpret the problem in way that plays to your strengths.
- You can show off that you can spot vagueness early on and are able to create clarity with well-phrased questions.

Most coding interviews are between 40 minutes and 2 hours long. Different people work at different paces, so in my experience interviewers start with a very minimal version of the problem and add constraints or feature requests over time. That also lets the interviewer see how the candiate adapts to a changing environment. While interviewers should strive to evaluate any given candidate to their strengths, I think that many interviewers use “how far” you got into a problem as an indicator for your engineering skill. If you make the interviewer run out of constraints to add, you probably did well.

However, even for the fastest of engineers, the time alloted to a coding problem is rarely enough to produce polished, production-ready code. Consequently, I believe that **coding interviews are about optimizing for iteration**.

### Optimizing for Iteration

Optimizing for Iteration, to me, means starting small, and doing many, small increments. Start with something basic and validate that it works. This actually takes a lot of self-discipline! Then build the next small step towards the larger goal. Each iteration should be runnable and allows you to verify that it works as expected. This way, if it doesn’t work, you only have to comb through a small amount of code changes to find where you went wrong. This also makes it easy for the interviewer to follow along. In fact, in my interviews I did actually create git repositories and made a commit for each iteration. That way I could inspect diffs or even reset to the previous iteration if I went down a fruitless path.

Optimizing for Iteration also means to write code in a way that allows you to switch out parts easily as new constraints come in. My general techniques for this are to not hard-code constants, to use many small, well-named functions and to keep code [DRY]. Keeping functions small makes it easier to verify just by reading that function does what it’s supposed to do. If constrainst change, it’s often a matter of augmenting or replacing a single function, without having to touch any of the other parts. Another nice side-effect is that a good function name is basically docmentation and helps the interviewer understand what you are doing.

When I think through the problem and how I want to structure my code, I think about those two things: Enabling me to move fast so I can go as far as possible into the problem and allow to build up the solution incrementally, keeping additions small and verifiable, switching out code bit by bit over time.

**My main mantra for any given coding task is “make it work, make it right, make it fast”.** In an interview, I don’t intend to get beyond the “make it work” phase. I actually double down on it by _taking shortcuts_ wherever possible. If I have an idea for a shortcut, I’d checked with the interviewer whether this is acceptable or not. Most of the time, the interviewers were completely fine with shortcuts, as their goal is not be about finding the solution that they had in mind, but rather observing how I solve the problem with my skills and strengths. I’ll talk more about shortcuts later.

Let’s put all of this into practice by working through the spreadsheet problem.

## Level 1: Scaffold

Before I start to write any code, it’s a good idea to set everything up. As I said, time is crucial in an interview, so I don’t like messing around with a build system unless absolutely necessary. In most interviews I end up writing vanilla JavaScript, CSS and HTML, and use something like `npx superstatic .` to spin up a web server. If I need to build any dynamic UI, I often assemble HTML strings and assign them to `.innerHTML`. Remember: “Make it work”. “Right” and “fast” can come later.

> **Note:** This is highly subjective. In the “make it work” stage, in my opinion, everything goes. Use whatever you know the best, what you are comfortable with and what allows you to move _fast_. For me, that’s vanilla JS and using the platform directly. If it’s React for you, use React. However, be mindful that the more you deviate from industry best practices, the harder it might be for the interviewer to follow you.

For this problem, I said I was going to use Preact, so I need something to process JSX. I love using [Jason]’s [htm] to avoid a build stage altogether, but in this case it might come at the risk of losing the interviewer. For a quick dev setup that supports JSX, I’d currently go for [Vite]. It’s default config is sensible (to me), it compiles fast and has very little magic. Let’s set up the basic structure of the project.

```
$ npm init -y
$ npm i -S preact vite
$ npx vite .
```

```html
<!DOCTYPE html>
<main></main>
<script type="module" src="./main.jsx"></script>
```

```jsx
// main.jsx

/* @jsx h */
import { render, h } from "preact";

import Spreadsheet from "./spreadsheet.jsx";

const main = document.querySelector("main");
render(<Spreadsheet rows={10} cols={10} />, main);
```

```jsx
// spreadsheet.jsx

/* @jsx h */
import { h } from "preact";

// Returns an array [0, 1, 2, ..., length-1]
function range(length) {
  return Array.from({ length }, (_, i) => i);
}

export default function Spreadsheet({ cols, rows }) {
  return (
    <table>
      {range(rows).map((y) => (
        <tr>
          {range(cols).map((x) => (
            <td>
              <Cell x={x} y={y} />
            </td>
          ))}
        </tr>
      ))}
    </table>
  );
}

function Cell({ x, y }) {
  return (
    <span>
      {x}/{y}
    </span>
  );
}
```

I chose to start with generating a table as a first iteration. There’s no business logic that could go wrong and it allow both me and the interviewer to see what part of our app is working correctly. Single-line functions like `range` are common utility functions that reduce noise in your code. Write and use them liberally.

<figure>
  <img loading="lazy" width="924" height="846" style="max-width: 900px" src="./step1.webp">
  <figcaption>Not pretty, but a <code>&lt;table&gt;</code> is a quick way to render a spreadsheet-style document.</figcaption>
</figure>

The plan is that the `<Spreadsheet>` component will handle the overall state and contain the logic for processing the formulas later on. The `<Cell>`’s job is mostly to be a toggle between showing a cell’s value and an `<input>` field so the user can edit the formula. I’ll implement that a bit later.

If, for some reason, you want to look at this demo, here’s the [live demo][step1 demo] and the [source code][step1 source].

### Visual aid

In interviews I usually ignore aesthetics. I am building a Proof Of Concept (POC), something even more crude than a Minimal Viable Product (MVP). The browser’s default styling will do just fine. However, the UI still needs to be _clear_; and this is not. Without labels for the rows and columns it will be hard to effectively communicate with the interviewer. So let’s fix that:

```diff
...
+ function spreadsheetColumn(idx) {
+   return String.fromCharCode("A".charCodeAt(0) + idx);
+ }

  export default function Spreadsheet({ cols, rows }) {
    return (
      <table>
+       <tr>
+         <td />
+         {range(cols).map((x) => (
+           <td>{spreadsheetColumn(x)}</td>
+         ))}
+       </tr>
        {range(rows).map((y) => (
          <tr>
+         <td>{y}</td>
            {range(cols).map((x) => (
              <td>
                <Cell x={x} y={y} />
              </td>
            ))}
          </tr>
        ))}
      </table>
    );
  }
...
```

```diff
  <!doctype html>
+ <style>
+   table {
+     border-collapse: collapse;
+   }
+   tr:first-child,
+   td:first-child {
+     background: #ddd;
+   }
+   td {
+     min-width: 50px;
+   }
+ </style>
  <main></main>
  <script type="module" src="./main.jsx"></script>
```

`spreadsheetColumn` turns a column _number_ into the letters we know and love from Excel & co. This is another example of a small shortcut. This function will create nonesense if it’s given a column index above 25, but the interviewer limited the columns to 10 for now, so that will work just fine. This way I can avoid spending time on the _slightly_ more complex code that returns `"AA"` for `idx = 26` and so on. If the interviewer decides they want a bigger spreadsheet, I only need to go back to this one function and fix it.

<figure>
  <img loading="lazy" width="1030" height="423" src="./step2.webp">
  <figcaption>Still not pretty, but the table headers make it visually easier to navigate.</figcaption>
</figure>

Again, here is the [live demo][step2 demo] and the [source code][step2 source].

Now that I have the visuals set up, I need to think what my next iteration is. While it is tempting to start with the core logic, the core logic will be hard to test without a UI that lets me input values. But even if my UI could take user input, there’s nowhere to store that input yet. So the next iteration is remove the rendering of a cell’s coordinates, add an underlying state object that contains all the cell values and render that instead. All the spreadsheet logic can then work on this state object, decoupled from the UI framework.

## State object

The state object is just a JSON object, and we will have our core logic work on that object later on. Controversly, I do think that OOP has a place when you want to tie data objects together with the logic that operates on them. But this is definitely a question of taste and there’s many roads that lead to Rome. For the purpose of this blog post, I wrote a class that will contain all the logic a spreadsheet needs.

```js
class SpreadsheetData {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = Array.from({ length: cols * rows }, () => ({
      value: 0,
    }));
  }

  getCell(x, y) {
    return this.cells[y * this.cols + x];
  }
}
```

Now I need to instantiate this class and use it as our data input for our components somehow. I could either use `useState` or `useReducer`. I know that later on, updating a cell’s value will be accompanied by additional logic will have to run, and that feels more natural to me with `useReducer`.

```js
function useSpreadsheetData(rows, cols) {
  const [{ data }, dispatch] = useReducer(
    ({ data }, { x, y, value }) => {
      const cell = data.getCell(x, y);
      cell.value = value;
      // Shallow copy to force a re-render.
      return { data };
    },
    { data: new SpreadsheetData(rows, cols) }
  );
  return [data, dispatch];
}
```

I am writing my own pseudo-hook here to keep the component function to be mostly about markup. It also will also allow me to hide some of the component-specific workarounds in a function, which can make future endeavours (like maybe I could even run the spreadsheet calculations in a worker later on 🤯) easier. Again: Lots of small functions make for easier refactoring!

> **Note:** I’m fairly new to hooks. If I’m being unidiomatic here, I apologize.

I can’t use an instance of the `SpreadsheetData` class as state directly. Preact checks for object equality to decide whether to rerender a component. Our class instance will always stay be same object and that means the component would never rerender. Wrapping the class instance in an object and create a new wrapper object on every `dispatch()` call forces object <em>in</em>equality and subsequently a rerender. The `dispatch()` function takes a cell’s coordinates and the new value and updates the spreadsheet data accordingly.

Now on to pipe the state object to our `<Cell>` components:

```diff
  export default function Spreadsheet({ rows, cols }) {
+   const [data, dispatch] = useSpreadsheetData(rows, cols);

    return (
      ...
        <td>
-         <Cell x={x} y={y} />
+         <Cell
+           x={x}
+           y={y}
+           cell={data.getCell(x, y)}
+           set={(value) => dispatch({ x, y, value })}
+         />
        </td>
      ...
    );
  }

- function Cell({ x, y }) {
-   return <span>{x}/{y}</span>
+ function Cell({ x, y, cell, set }) {
+   return <span onclick={() => set(cell.value + 1)}>{cell.value}</span>;
  }
```

This iteration is all about making sure that there’s an underlying state object, that it gets visualized correctly and that it reflects updates to the state object. To test and debug that, I need to be able to make changes to the state object, but I don’t want to lose time debugging functionality that I need for debugging. So my choice here is a simple `onClick` handler that just increments the cell’s value by $1$ — something I’m fairly certain I can write without error on the first try.

<figure>
  <video width="882" height="366" src="./step3.webm" type="video/webm" autoplay muted loop controls></video>
  <figcaption>The spreadsheet updates when values are changed.</figcaption>
</figure>

As before, here is the [live demo][step3 demo] and the [source code][step3 source].

Both the interviewer and I can see that the `SpreadsheetData` is visualized and responds to changes by the user. And if there was a bug, the small diff would help me isolate what went wrong really quickly. For the next iteration, my plan was to just allow the user to input any formula for a cell. That turned out to be such a small change that I actually forgot to make a commit and also implemented the logic to evaluate those expressions in the same iteration.

## Expression evaluation

My first thought when reading the problem description was that even a two hour time frame is not enough to write a full expression parser. Even without referencing the value of other cells, something as simple as `1+2*3` would need a parser that respects operator precedence. Instead, my immediate thought was to ask the interviewer if using `eval()` is acceptable, while pointing out that I am aware of the potential security impliciations.

> **Note:** If writing parsers is your strength, go for it! Use the ambiguous phrasing to interpret the problem in a way that makes you look good!

I’d expect that the interviewer to reply with “that’s fine!”, unless you are interviewing to work as a compiler engineer.

### Formulas

Currently, each cell has a `value` property in the state object. But now a cell needs to have a formula and a _computed_ value. So I added a second property to each cell:

```diff
  class SpreadsheetData {
    constructor(rows, cols) {
      this.rows = rows;
      this.cols = cols;
      this.cells = Array.from({ length: cols * rows }, () => ({
        value: 0,
+       computedValue: 0,
      }));
    }
```

Of course, if I need to allow the user to input expressions somehow:

```js
function Cell({ x, y, cell, set }) {
  const [isEditing, setEditing] = useState(false);

  if (isEditing) {
    return (
      <input
        type="text"
        value={cell.value}
        onblur={(ev) => {
          setEditing(false);
          set(ev.target.value);
        }}
      />
    );
  }

  return <span onclick={() => setEditing(true)}>{cell.computedValue}</span>;
}
```

I don’t know if drilling down to a DOM element using `ev.target.value` is idiomatic, but it works like a charm! Notice how I display `cell.computedValue` when the user is not editing, but use `cell.value` as the value for the input field.

### eval

In Excel, formulas are only evaluated when you start with `=`. In this context, I expect that the interviewer doesn’t care for an _exact_ implementation of the syntax that Excel uses. So that’s a shortcut that saves a tiny amount of code, but I still took it because any branching can potentially cause unexpected complications in the future. By using `eval()`, the user gets access to all of JS, including `Math.sqrt()`, `Math.pow()` and even `if` statements. That’s pretty great, but is not without problems: The user also gets access to `while(true)`, which can freeze the entire app indefinitely. The user could also register a ServiceWorker. Whether or not those are bad things requires careful consideration, something I don’t have time for in an interview. But that should be acceptable in an interview as long as you point it out!

```diff
  class SpreadsheetData {
    ...
+   generateCode(x, y) {
+     const cell = this.getCell(x, y);
+     return `(function () {
+       return ${cell.value};
+     })();`;
+   }

+   computeCell(x, y) {
+     const cell = this.getCell(x, y);
+     let result;
+     try {
+       result = eval(this.generateCode(x, y));
+     } catch(e) {
+       result = `#ERROR ${e.message}`;
+     }
+     cell.computedValue = result;
+   }
  }
```

I decided to generate the code I pass to `eval()` in a separate function. Code-as-a-string is often hard to read, due to the lack of syntax highlighting and the injected variables. Putting it in a function encapsualtes that grossness and also lets me easily log the generated code to the console to check that it’s correct. I also generate an IIFE wrapper, mostly as a primitive safe-guard against any unintended side-effects of the formula. A formula like `Math.sin(123) + 1` would generate the following code:

```js
(function() {
  return Math.sin(123) + 1;
})();
```

If `eval()` throws, I catch the exception and show the oh-so-familiar `#ERROR` symbol. Since I know the interviewer will ask me to add cell referencing later, I also know that a change to one cell can affect other cells in the future. So I’ll just recompute every cell’s `computedValue` every time. That’s inefficient, but keeps things simple.

```diff
  class SpreadsheetData {
    ...
+   computeAllCells() {
+     for(const y of range(this.rows)) {
+       for(const x of range(this.cols)) {
+         this.computeCell(x, y);
+       }
+     }
+   }
  }

  function useSpreadsheetData(rows, cols) {
    const [{ data }, dispatch] = useReducer(
      ({ data }, { x, y, value }) => {
        const cell = data.getCell(x, y);
        cell.value = value;
+       data.computeAllCells();
        // Shallow copy so that preact doesn’t skip rendering.
        return { data };
      },
      { data: new SpreadsheetData(rows, cols) }
    );
    return [data, dispatch];
  }
```

I have to say, a spreadsheet app that just uses JavaScript actually seems very desirabel to me. And since it doesn’t store user data or cookies, I actually don’t really know what there would be to exploit with evil `eval()`.

<figure>
  <video width="882" height="366" src="./step4.webm" type="video/webm" autoplay muted loop controls></video>
  <figcaption>Any expression that is valid in JS works in this spreadsheet.</figcaption>
</figure>

Here is the [live demo][step4 demo] and the [source code][step4 source].

Only one more iteration left! Referencing the values of other cells.

## Cell referencing

Formulas in Excel can reference the value of another cell by using the cell’s name. For example `=A0 * 2` in Excel would show the value of cell A0 doubled. Since our app evaluates the cell’s formula as plain JavaScript, I can make the other cell values available by declaring variables with the cell names:

```diff
  class SpreadsheetData {
    ...
+   idxToCoords(idx) {
+     return [idx % this.cols, Math.floor(idx / this.cols)];
+   }

    generateCode(x, y) {
      const cell = this.getCell(x, y);
      return `(function () {
+       ${this.cells
+         .map((cell, idx) => {
+           const [x, y] = this.idxToCoords(idx);
+           const cellName = `${spreadsheetColumn(x)}${y}`;
+           return `const ${cellName} = ${cell.value};`;
+         })
+         .join("\n")}
        return ${cell.value};
      })();`;
    }
```

This augmented `generateCode()` function injects the values of _all_ cells into the “prelude” of the IIFE. A formula like `Math.sin(A0) + A1` would generate the following code:

```js
(function () {
  const A0 = 123;
  const A1 = 0.5;
  ...
  const J9 = 0;
  return Math.sin(A0) + A1;
})();
```

This code will grow substantially with the size of the spreadsheet. Again, not every efficient, but good enough for a prototype written during an interview. With the ability to reference the value of another cell, I can now write more complex formulas and get the right result. However, if I had a reference _chain_ — like A0 references A1, A1 reference A2 and A2 references A3 — and I changed the value in the last chain member, only the immediately previous chain member would get updated. In a polished version of this app I’d expect to find a proper parser that explicitly maintains the dependencies of each cell. That would allow me to figure out which cells needed recomputing in response to a value update and also let me detect cyclic dependencies. But I don’t have that here. Instead, I can just keep recomputing all cells until no more updates are happening. That will break in the case of two cells referencing each other, but — once again — I’d say that’s acceptable in the context of an interview.

```diff
  class SpreadsheetData {
    ...
    computeCell(x, y) {
        ...
+       const hasChanged = result != cell.computedValue;
        cell.computedValue = result;
+       return hasChanged;
      }

      computeAllCells() {
+       let hasChanged = false;
        for (const y of range(this.rows)) {
          for (const x of range(this.cols)) {
-           this.computeCell(x, y);
+           hasChanged = hasChanged || this.computeCell(x, y);
          }
        }
+       return hasChanged
      }

+     propagateAllUpdates() {
+       while(this.computeAllCells());
+     }
      ...
  }

  function useSpreadsheetData(rows, cols) {
    ...
-   data.computeAllCells();
+   data.propagateAllUpdates();
    ...
  }
```

And now for the grand reveal/proof that this is actually a functioning spreadsheet:

<figure>
  <video width="882" height="366" src="./step5.webm" type="video/webm" autoplay muted loop controls></video>
  <figcaption>A fully functional spreadsheet. I guess?</figcaption>
</figure>

And for one last time, here’s [live demo][step5 demo] and the [source code][step5 source].

## Conclusion

Sadly, I didn’t exactly time when I was done, but I do know that I was under the 60 minute time limit. And that was mostly thanks to some cheeky shortcuts and optimizing for iteration. Of course, this is a very opinionated take on how to tackle coding interviews, but I have fared quite well with “Make it work, make it right, make it fast” both inside and outside of interviews.

I did play around afterwards a bit and moved the spreadsheet logic to a worker (because of course I did) and added cycle detection, but both would make this blog post prohibitively long and are, quite honestly, not _that_ interesting. I guess I’m leaving those as an exercise for the reader.

[dry]: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
[vite]: https://vitejs.dev/
[htm]: https://npm.im/htm
[jason]: https://twitter.com/_developit
[step1 demo]: ./step1/dist/index.html
[step1 source]: https://github.com/surma/surma.dev/tree/master/static/things/spreadsheet/step1/
[step2 demo]: ./step2/dist/index.html
[step2 source]: https://github.com/surma/surma.dev/tree/master/static/things/spreadsheet/step2/
[step3 demo]: ./step3/dist/index.html
[step3 source]: https://github.com/surma/surma.dev/tree/master/static/things/spreadsheet/step3/
[step4 demo]: ./step4/dist/index.html
[step4 source]: https://github.com/surma/surma.dev/tree/master/static/things/spreadsheet/step4/
[step5 demo]: ./step5/dist/index.html
[step5 source]: https://github.com/surma/surma.dev/tree/master/static/things/spreadsheet/step5/
