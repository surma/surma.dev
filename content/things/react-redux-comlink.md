---json
{
  "title": "React + Redux + Comlink = Off-main-thread",
  "date": "2019-07-22",
  "socialmediaimage": "",
  "live": false
}
---

[Redux] is state management. State management belongs off the main thread. 

<!--more-->

[React] is a popular web framework.

> **Note:** I use words like “popular” or “often” being very aware that I am under the influence of the Web Development Twitter Echo Chamber™️. Your mileage may vary, proceed with care. Also, if you are not conceptually familiar with React, this blog post might not be of interest for you.

Some love React for its component system, some because of its vast ecosystem and some for its meta-platform properties. The more I read up on React, the more I see React and Redux appearing together. May that be in the description of a job offer, a stack overflow post or a library. Since **my goal is to bring off-main-thread architectures to main-stream web development. How much React or Redux are compatible with this philosophy?** Yes, I admit it. I have never written React code before, only Preact.

## Architecture

To me, [React] — just like [Preact], [Svelte] or [lit-html] — provides mainly one feature of interest: Turning state into DOM, ideally in an efficient manner. Your business logic manipulates a state object and your UI framework consumes said object to update your UI accordingly. Like any architectural choice, this has pros and cons.**` One the one hand, this architecture allows or even enforces a clear separation between business logic and presentation logic. The shape (or schema) of your state object is your interface between these two responsibilities. 

Now while with these frameworks you _can_ have that clear separation, it can often feel easier to encapsualte logic into components tied to component-internal state. 


Over time, your components contain parts of your business logic, reducing reusability and testability. This is where [Redux] comes into play, a popular “state container”. It centralizes your state and all its mutations in a single place, outside your components, reenforcing the aforementioned separation.

I mentioned [before][when workers], that only UI work should be on the UI thread. State in itself is not UI work, only translating state into DOM is. With React/Redux being a seemingly popular combination, I set off to try and move Redux to a worker.

## CRAargh

I wanted to start with [Redux’s TodoMVC][Redux TodoMVC] sample. The problem is that this samples uses [create-react-app]. Now CRA is not inherently bad, not at all, but I did run into problems. Firstly, **CRA’s default build setup doesn’t support workers** [yet.][CRA worker PR] I did try and use the branch from that PR, but it doesn’t seem to be fully working yet.

The alternative approach is “ejecting” from CRA and taking matters into your own hands. Ejecting brings everything from under the hood to... well, over the hood, I guess. But now, I admit, I am _way_ out of my depth. The [webpack] and [babel] configs are impenetrable to me, which is mostly due to my lack of experience with webpack and babel. The bottom line here is that I couldn’t easily use Redux’s TodoMVC sample.

## Fine, I’ll do it myself

For the goal of this blog post, it’s not really that important to use a fully fledged sample app. So I thought I’d write one myself. As with every project, the first big question is: What build tool am I going to use?

### Build system

When chosing a build system, I was tempted to use webpack as it is arguably the most popular build system in connection with React. However, webpack can currently _not_ share chunks between the main thread and a worker. This means that shared dependencies will have to be double-loaded — once for the main thread and once for the worker. I opened an [issue][webpack worker issue] about this, but it has not been addressed yet. Now the relevancy of this issue depends on the size of your shared dependencies. If you only have a few, then **webpack is not optimbal, but an acceptable choice for OMT apps**. [Jason] even wrote [`worker-plugin`][worker-plugin], which teaches webpack about the `new Worker()` constructor to make workers easy to use.

At the same time, most people interested in this blog post will most likely know webpack and how to add a plugin to their. config. So I decided to use [Rollup] instead. I totally did not choose Rollup so I can show off [my off-main-thread plugin][rollup omt]. That all being said, **the details of the build system setup are not relevant**, so I will skip over the details. Take a look at [the code of the demo app][counter basic] if you want to see more.

### A normal React/Redux app

To have a starting point, [I whipped a useless counter app][counter code basic]. It has a counter. You can increment and decrement it. That’s it. No bells and whistles. It uses Redux for state management, React for the UI and [react-redux] as the glue between the two.

Let’s start with the state: Our state is just a counter. We have to actions we can perform. Incrementing and decrementing that counter. 

```js
const reducer = (state = 0, { type }) => {
  switch (type) {
    case "INCREMENT":
      return state + 1;
    case "DECREMENT":
      return state - 1;
    default:
      return state;
  }
};

const store = createStore(reducer);
```

For our main app component `CounterDemo`, we are going write some vanilla HTML and `connect()` the resulting component to our state store:

```js
const CounterDemo = connect(counter => ({ counter }))(
  ({ counter, dispatch }) => (
    <div>
      <h1>Welcome</h1>
      <p>The current counter is: {counter}</p>
      <button onClick={() => dispatch({ type: "INCREMENT" })}>+</button>
      <button onClick={() => dispatch({ type: "DECREMENT" })}>-</button>
    </div>
  )
);
```

For the final finish, we need to render our main app component surrended by the `react-redux`’s `<Provider>` component:

```jsx
ReactDOM.render(
  <Provider store={store}> <CounterDemo /> <//>,
  document.getElementById("root")
);
```

And violá, we have [a _beautiful_ counter app][counter live basic].


[React]: https://reactjs.org
[Preact]: https://preactjs.com
[Svelte]: https://svelte.dev
[lit-html]: https://lit-html.polymer-project.org
[Redux]: https://redux.js.org
[Redux TodoMVC]: https://github.com/reduxjs/redux/tree/master/examples/todomvc
[when workers]: /things/when-workers
[create-react-app]: https://facebook.github.io/create-react-app/
[CRA worker PR]: https://github.com/facebook/create-react-app/pull/5886
[webpack]: https://webpack.js.org
[babel]: https://babeljs.io
[webpack worker issue]: https://github.com/webpack/webpack/issues/6472
[worker-plugin]: https://github.com/GoogleChromeLabs/worker-plugin
[react-redux]: https://redux.js.org/basics/usage-with-react
[Rollup]: https://rollupjs.org
[rollup omt]: https://github.com/surma/rollup-plugin-off-main-thread
[counter code basic]: https://gist.github.com/surma/64d137ee5548b7d2f978cb59d20b604d/77196c570b6b61b256963043fe338429ce824187
[counter live basic]: step1/index.html
[Jason]: https://twitter.com/_developit