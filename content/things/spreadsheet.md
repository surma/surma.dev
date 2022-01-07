---
title: "Optimizing for iteration in coding interviews"
date: "2022-01-06"
live: false
socialmediaimage: "social.png"
---

A big part of interviews, I think, is development velocity, and that can be optimized for.

<!-- more -->

I have done a bunch of interviews as an interviewer during my time at Google, and I recently went through a couple of interviews to eventually land my new gig at Shopify. I have spent some time thinking how I evaluated candidates and how I approached my technical interview questions. I realized that there’s probably some experience worth sharing. Hence this blog post.

## The Coding Problem

A friend of mine told me about an interview question:

> Build a spreadsheet-like web app from scratch using React Hooks. Start simple, and we can add features as we go along.

This interview question seems fairly representative of the questions that I have been tasked with, where you are (pair) programming a fully working app with an interesting core problem. In this case, your tech stack is part of the question, but often you’ll be left to choose whatever you are comfortable with. For the purpose of the blog post, I’ll use Preact and hooks. Because why not.

Note that I didn’t actually have this question in an actual interview, so I’ll be pretending to go through a 60 minute interview with an imaginary interviewer. However, whatever I say in this blog post, keep in mind that that **the most important aspect of an interview is communication**. A coder that doesn’t say a word while he codes is likely not going to do well in a team environment. Keep your interviewer in the loop not only on what you are _currently_ doing, but also what you are working towards. Think out loud and describe what your ideas are and how you plan to tackle them. Most interviewers want to help and will reinforce good ideas and try and prevent you from going down the wrong path.

### Think Before You Code

Before starting to code, it’s usually a good idea to think through the task at hand. Coding problems are often _intentionally_ short and vague. Don’t let this frighten you. In my experience, it’s actually for your advantage for multiple reasons:

- A short description has no room to hide details in a wall of text.
- Vagueness means more room to interpret the problem in way that plays to your strengths.
- You can show off that you can spot vagueness and ask questions that create clarity.

Most coding interviews are between 40 minutes and 2 hours long. Different people work at different paces, so in my experience interviewers start with a very minimal version of the problem and add constraints or feature requests over time. While interviewers should strive to evaluate any given candidate to their strengths, it seems to me that “how far” you get into a problem is often considered an indicator for your engineering skill. If the interviewer runs out of constraints to add, you probably did well.

However, even for the fastest of engineers, the time alloted to a coding problem is not enough to produce polished, production-ready code, unless the problem is trivial. Consequently, I believe that **coding interviews are about optimizing for iteration**. But I actually also think that this attitude does really well outside of interviews as well.

### Optimizing for Iteration

While planning and writing my code, I want to think about those two things: Enabling me to move fast so I can go as far as possible into the problem and allow to build up the solution incrementally, keeping additions small and verifiable, and switching out code bit by bit over time. My main mantra — also outside of coding interviews — is “make it work, make it right, make it fast”. In an interview, I don’t intend to get beyond the “make it work” phase. I actually double down on it by _taking shortcuts_ wherever possible. If I have an idea for a shortcut, I check with the interviewer whether this is acceptable or not. Most of the time, the interviewer is completely fine with my ideas as an interview should not be about finding the solution of the interviewer but rather allowing the interviewer to observe how _you_ solve the problem with _your_ skills and strengths. I’ll talk more about shortcuts later.

My general techniques to optimize for iteration are to not hard-code constants, to use many small, well-named functions and to keep code [DRY]. Having many small functions lets me build the app incrementally and refactoring as I go along. It also makes each function easier to verify visually with a very small amount of state that needs to be juggled in my head. Another nice side-effect is that it makes it easier for the interviewer to follow along as well. Function names are basically docmentation!

Let’s put this into practice by working through a problem.

## Level 1: Scaffold

Before we get to the core logic of the app, it’s a good idea to set everything up. As I said, time is crucial in an interview, so I don’t like messing around with a build system unless absolutely necessary. In most interviews I end up writing vanilla JavaScript. If I am building a dynamic UI, I often assemble HTML strings and assign them to `.innerHTML` properties. Remember: “Make it work”. “Right” and “fast” can come later.

Since I said I was going to use Preact, I do need _something_ to process the JSX. I could use [Jason]’s [htm], but that might come at the risk of losing the interviewer. For a quick dev setup that supports JSX, I’d currently go for [Vite]. It’s default config is sensible (to me), it compiles fast and has very little magic. Let’s set up the basic structure of the project.

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

I’ll have to build some form of UI at some point, so I might as well start with a very crude UI to make it easy to see what part of our app is working and where things are going wrong. Again, I am trying to take the interviewer along with me.

<figure>
  <img loading="lazy" width="924" height="846" style="max-width: 900px" src="./step1.webp">
  <figcaption>Not pretty, but a <code>&lt;table&gt;</code> is a quick way to render a spreadsheet-style document.</figcaption>
</figure>

The `<Spreadsheet>` component will handle the overall state and contain the logic for processing the formulas later on. The `<Cell>`’s job is mostly to be a toggle between showing a cell’s value and an `<input>` field so the user can edit the formula. I’ll implement that a bit later.

### Visual aid

In intervies I minimize spending time on aesthetics. We are building a Proof Of Concept (POC), something even more crude than a Minimal Viable Product (MVP). The browser’s default styling will do just fine. However, the UI needs to be _clear_, which this is not. Without labels for the rows and columns it will be hard to effectively communicate with the interviewer. So let’s fix that:

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
+     min-height: 2em;
+   }
+ </style>
  <main></main>
  <script type="module" src="./main.jsx"></script>
```

`spreadsheetColumn` turns a column _number_ into the letters we know and love from Excel & co. This is another example of a shortcut. This function will create nonesense if it’s given a column index above 25, but the interviewer limited the columns to 10 for now. I can avoid spending time on the _slightly_ more complex code that return `"AA"` for `idx = 26` and so on. If the interviewer decides they want a bigger spreadsheet, I only need to go back to this one function for the labels to be correct.

<figure>
  <img loading="lazy" width="1030" height="423" src="./step2.webp">
  <figcaption>Still not pretty, but the table headers make it visually easier to navigate.</figcaption>
</figure>

Now that I have the visuals set up, the next step is to not render cell coordinates but rather have an underlying state object that contains all the cell values that is visualized by this table. All the computational logic that implements the core functionality can then work on this state object, decoupled from any UI framework.

## The core logic

The state object is generated and maintained by the core logic of our app. Controversly, I do think that OOP sometimes has a place to tie data objects together with the logic that operates on them. But this is definitely a question of taste and there’s many ways that lead to Rome. For the purpose of this blog post, I wrote a class that will contain all the logic a spreadsheet needs.

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

Now I need to instantiate this class and use it as our data input for our components somehow. I could either use `useState` or `useReducer`. I suspect I will have to run some more code when a cell’s value gets changed, and that feels more natural with `useReducer`.

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

I am writing a pseudo-hook here in case I need to switch to a different hook later or maybe even allow the reducer function to run asynchronously (maybe I could even run the spreadsheet calculations in a worker later on 🤯). Again: Lots of small functions make for easier refactoring!

> **Note:** I’m fairly new to hooks. If I’m being unidiomatic here, I apologize.

I can’t use an instance of the `SpreadsheetData` class as state directly. Preact checkes for object equality to decide whether to rerender a component. Our class instance will always stay the same and the component would never rerender. Wrapping the class instance in an object and create a new wrapper object on every `dispatch()` call forces object \_in_equality and subsequently a rerender. The `dispatch()` function takes a cell’s coordinates and the new value and updates the spreadsheet data accordingly.

Now on to pipe the state object to our UI components:

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

Of course, incrementing a cell’s value by $1$ is hardly useful, but shows that the state object gets updated and that Preact picks up the change and updates the UI accordingly.

<figure>
  <video width="882" height="366" src="./step3.webm" type="video/webm" autoplay muted loop controls></video>
  <figcaption>The spreadsheet updates when values are changed.</figcaption>
</figure>

This way the interviewer and I can easily see that the `SpreadsheetData` is visualized and responds to changes by the user. And if there was a bug, the UI (or DevTools) would probably help us narrow it down really quickly. With this in place, we can now get to the juicy part.

## Core Logic

My first thought when reading the problem description was that even a two hour time frame is not enough to write a full expression parser. Even without referencing the value of other cells, something as simple as `1+2*3` would need a parser that respects operator precedence. Instead, my immediate thought was to ask the interviewer if using `eval()` is acceptable, while pointing out that I am aware of the potential security impliciations. I’d expect that the interviewer to reply with “that’s fine!”, unless you are interviewing to work as a compiler engineer.

> **Note:** If writing parsers is your strength, go for it! Use the amiguity of the problem to bend it in a way that makes you look good!

### Formulas

Currently, the cells have a `value` property. But now a cell needs to have a formula and a _computed_ value. To that extent, I need to augment our cell data structure:

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

Of course, if I want to `eval()` an expression, the user needs to be able to input expressions somehow. As I mentioned earlier, that’s the job of the `<Cell>` component, but I hadn’t implemented that yet.

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

I don’t know if using `ev.target.value` is idiomatic, but it works like a charm! Notice how I _display_ `cell.computedValue` when the user is not editing, but use `cell.value` as the value for the input field.

## eval

I am taking another shortcut here: I expect that the interviewer doesn’t care for an _exact_ implementation of the syntax that Excel uses. By using `eval()`, the user gets access to all of JS, including `Math.sqrt()`, `Math.pow()` and even `if` statements. Now that is not without problems. The user also gets access to `while(true)`, which can freeze the entire app indefinitely. But again, this is acceptable in an interview context as long as you point it out!

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

I decided to generate the code I pass to `eval()` in a separate function, as code-as-a-string is often harder to read, and this encapsualtes that grossness. I also made that code generation function generate an IIFE wrapper, mostly as a primitive safe-guard against any unintended side-effects of the formula. If `eval()` throws, I catch the exception and show the oh-so-familiar `#ERROR` flag. Since I expect the interviewer to ask me to add cell referencing later, I also know that a change to one cell can affect other cells in the future. So I’ll just recompute every cell’s `computedValue`. That’s inefficient, but keeps things simple.

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

I have to say, a spreadsheet app that just uses JavaScript actually seems very desirabel to me. And since it doesn’t store user data or cookies, I don’t really know what there would be to exploit with evil `eval()`.

<figure>
  <video width="882" height="366" src="./step4.webm" type="video/webm" autoplay muted loop controls></video>
  <figcaption>Any expression that is valid in JS works in this spreadsheet.</figcaption>
</figure>

## Cell referencing

The app is now able to evaluate almost arbitrary mathematical expressions. The real power, however, comes from being able to reference the value of other cells in your formula. This very likely what the interviewer would request at this point.

Spreadsheet formulas can reference the value of another by using the cell’s name. For example `A0 * 2` would show the value of cell A0 doubled. Since the cell’s formula is evaluated as plain JavaScript, I can make the other cell values available by declaring a variables with the cell names beforehand.

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

With this in place, I can now reference the value of another cell and get the right result. However, if I had a reference _chain_ — like A0 references B1, B1 reference C2 and C2 references D3 — and I changed the value in the last chain member, only the immediately previous chain member would get updated. In a polished version of this app I’d expect to find a proper parser that explicitly maintains the dependencies of each cell. That would allow me to figure out which cells needed recomputing in response to a value change and also let me detect cyclic dependencies. But I don’t have that here. Instead, I can just keep recomputing all cells until no more changes are happening. That will break in the case of two cells referencing each other, but — once again — I’d say that’s acceptable in the context of an interview.

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
+       while(true) {
+         let hasChanged = false;
          for (const y of range(this.rows)) {
            for (const x of range(this.cols)) {
-             this.computeCell(x, y);
+             hasChanged = hasChanged || this.computeCell(x, y);
            }
          }
+         if(!hasChanged) {
+           break;
+         }
        }
      }
```

`while(true)` loops can be scary, but there is a break condition. And this works as a proper spreadsheet:

<figure>
  <video width="882" height="366" src="./step5.webm" type="video/webm" autoplay muted loop controls></video>
  <figcaption>A fully functional spreadsheet. I guess?</figcaption>
</figure>

## Conclusion

Sadly, I didn’t exactly time when I was done, but I do know that I was under the 60 minute time limit. And that was mostly thanks to some cheeky shortcuts and optimizing my code towards building it up incrementally. I also used this opportunity to get to know `useReducer`, which I hadn’t used that much before.

I did play around afterwards a bit and moved the spreadsheet logic to a worker (of course I did) and added cycle detection, but both would make this blog post prohibitively long and are not _that_ interesting. I guess I’m leaving those as an exercise for the reader.

[dry]: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
[vite]: https://vitejs.dev/
[htm]: https://npm.im/htm
[jason]: https://twitter.com/_developit
