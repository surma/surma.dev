---json
{
"title": "React + Redux + Comlink = Off-main-thread",
"date": "2019-07-30",
"socialmediaimage": "social.png",
"live": true
}

---

[Redux] is state management. State management belongs off the main thread.

<!--more-->

[React] is a popular web framework.Some love React for its component abstraction, some because of its vast ecosystem and some for its meta-platform properties.

> **Note:** I use words like “popular” or “often” being very aware that I am under the influence of the Web Development Twitter Echo Chamber™️. Your mileage may vary, proceed with care, dont @ me. Also, if you are not conceptually familiar with React & Redux, this blog post might not only be of marginal interest to you.

The more I read up on React, the more I see React and [Redux] appearing together. That got met thinking: **My goal is to bring off-main-thread architectures to main-stream web development. Are React and Redux compatible with this philosophy?** Let’s give it a try!

## Architecture

To me, [React] — just like [Preact], [Svelte] or [lit-html] — provide mainly one feature of interest: Turning state into DOM, ideally in an efficient manner. Your business logic manipulates a state object and your UI framework consumes said object to update your UI accordingly. These frameworks enable you to have a clear separation between state and UI. Nonetheless, I often see people encapsulate their business logic into their (visual) components tied to component-internal state. This is where [Redux] can help. Redux is a popular “state container”, centralizing your state and all its mutations in one place, outside your components, reenforcing the aforementioned separation.

As I have said [before][when workers], my mantra is **“UI thread for UI work only”**. State management is not UI work and consequently **Redux should not be running on the UI thread!** Since I have not written React or Redux myself 😱, I figured I’d use _the_ canonical sample for pretty much every UI framework out there: TodoMVC. And of course, Redux has a [Todo MVC sample][redux todomvc]!

## CRArgh

The problem with Redux’s TodoMVC sample is that it uses [create-react-app]. I don’t mean that CRA is inherently bad. Not at all. But **CRA’s default build setup doesn’t support workers** [yet][cra worker pr], which is _kinda_ essential for this experiment. I did try and use the branch from that PR, but it doesn’t seem to be fully working yet.

Alternatively, you can “eject” from CRA and take matters into your own hands. Ejecting brings everything from under the hood to... well, over the hood, I guess. After doing so I found myself _way_ out of my depth. The [webpack] and [babel] configs are impenetrable to me, which is mostly due to my lack of experience with webpack and babel. The bottom line here is that I couldn’t easily adjust Redux’s TodoMVC sample to support workers.

> **Note**: **webpack is not optimal for workers**, as it cannot share chunks between main thread and workers. [I opened an issue][webpack worker issue] for this a while ago and talked to [Sean Larkin] about it quite recently. It seems webpack 5 will make solving this much easier. But let me be clear: **webpack is an acceptable choice for OMT**, as long as you keep an eye on the amount of double-loading that you are potentially causing. If you are using webpack and want to use workers, [Jason] wrote [`worker-plugin`][worker-plugin], which teaches webpack about the `new Worker()` constructor to make workers easy to use.

The bottom line is that I couldn’t really do this with CRA, so for the purpose of this blog post I used [Rollup], as I am familiar with that and even maintain an [off-main-thread plugin][rollup omt] for Rollup. **All in all it doesn’t really matter which build system you use.**

## Business as usual

To have a starting point, [I whipped up a useless counter app](step1). It has a counter. You can increment and decrement it. That’s it. No bells and whistles. It uses Redux for state management, React for the UI and [react-redux] as the glue between the two. Let’s look at some code: Our state is just a counter. We have two actions we can perform: Incrementing and decrementing that counter.

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

This `store` variable contains our state container. Through this store we can `subscribe()` to state changes or `dispatch()` actions to mutate the state. The (important parts of the) store’s interface looks like this:

```ts
interface Store {
  dispatch(action): void;
  getState(): State;
  subscribe(listener: () => void): UnsubscribeFunc;
}
```

For our main app component `CounterDemo`, we are going to write some vanilla HTML and `connect()` the resulting component to our state store:

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

As a last step, we need to render our main app component wrapped by `react-redux`’s `<Provider>` component:

```jsx
ReactDOM.render(
  <Provider store={store}>
    <CounterDemo />
  </Provider>,
  document.getElementById("root")
);
```

And violà, we have [a _beautiful_ counter app][counter live basic]. You can find the full code for this demo in a [gist][counter code basic].

## Comlinking it

As the app is fairly simple, so is our reducer. But even for bigger apps **state management is rarely bound to the main thread** in my experience. Everything we are doing can also be done in a worker as we are not using any main-thread-only API like the DOM. So let’s remove all of the Redux code from our main file and put it in a new file for our worker. Additionally, we are going to pull in [Comlink].

Comlink is a library to make web workers enjoyable. Instead of wrangling `postMessage()`, Comlink implements the (surprisingly old) concept of [RPC] with the help of proxies. Comlink will give you a proxy and that proxy will “record” any actions (like method invocations) performed on it. Comlink will send these records to the worker, replay them against the real object and send back the result. This way you can work on an object on the main thread even though the _real_ object lives in a worker.

With this in mind, we can move `store` to a worker and proxy it back to the main thread:

```js
// worker.js
import { createStore } from "redux";
import { expose } from "comlink";

const reducer = (state = 0, { type }) => {
  // ... same old ...
};

const store = createStore(reducer);
expose(store);
```

On the main thread, we’ll create a worker using this file and use Comlink to create the proxy:

```js
// main.js
import { wrap } from "comlink";

const remoteStore = wrap(new Worker("./worker.js"));
const store = remoteStore;

ReactDOM.render(
  <Provider store={store}> <CounterDemo /> <//>,
  document.getElementById("root")
);
// ... same old ...
```

**`remoteStore` has all the methods and properties that the `store` has**, but _everything is async_. More concretely that means that `remoteStore`’s interface looks like this:

```ts
interface RemoteStore {
  dispatch(action): Promise<void>;
  getState(): Promise<State>;
  subscribe(listener: () => void): Promise<UnsubscribeFunc>;
}
```

The reason for this is the nature of RPC. **Every method invocation is turned into a `postMessage()`** by Comlink and it has to wait for the worker to come back with a reply. This process is inherently asynchronous. The advantage is that we just moved all processing into the worker, away from the main thread. We can use the `remoteStore` the same way we would `store`. We just have to remember to use `await` whenever we call a method.

### Problems

As the interface shows, `subscribe()` expects a callback as a parameter. But functions can’t be sent via `postMessage()`, so this would throw. For this reason Comlink provides `proxy()`. Wrapping a value in **`proxy()` will cause Comlink to not send the value itself but a proxy instead**. So it’s like Comlink using itself.

Another problem is that `getState()` is expected to return a value synchronously, but Comlink has made it asynchronous. To solve this we’ll have to get our hands dirty and keep a local copy of the most recent state value we have received.

Let’s put all these two fixes in a wrapper for `remoteStore`:

```js
export default async function remoteStoreWrapper(remoteStore) {
  const subscribers = new Set();

  let latestState = await remoteStore.getState();
  remoteStore.subscribe(
    proxy(async () => {
      latestState = await remoteStore.getState();
      subscribers.forEach(f => f());
    })
  );
  return {
    dispatch: action => remoteStore.dispatch(action),
    getState: () => latestState,
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
}
```

> **Note:** You might have noticed that I re-implemented `subscribe()` here rather than just calling `remoteStore.subscribe()`. The reason is that there is a long-standing issue with Comlink: When one end of a [`MessageChannel`][messagechannel] gets garbage collected, most browsers are _not_ able to garbage collect the other end, permanently leaking memory. Considering that `proxy()` creates a `MessageChannel` and that `subscribe()` might get called quite a lot, I opted to re-implement the subscription mechanism to avoid building up leaked memory. In the future, [WeakRefs] will help Comlink address this problem.

In our main file, we have to use this wrapper to turn our `RemoteStore` into something that is fully compatible to `Store`:

```diff
- const store = remoteStore;
+ const store = await remoteStoreWrapper(remoteStore);
```

With all of that in place, [we can run our app](step2). Everything should look and behave the same, but **Redux is now running off-main-thread.**

You can find the full code in a [gist].

## Conclusion

**[Comlink] can help you move logic to a worker without buying into a massive refactor.** I did take some shortcuts here (like ignoring the return value of `remoteStore.subscribe()`), but all-in-all this is a web app that makes good use of a worker. Not only is the business logic separated from the view, but the processing of state is not costing us any precious main thread budget. Additionally, moving your state management to a worker means that **all the parsing for the worker’s dependencies is happening off-main-thread** as well.

> **Note:** It was [pointed out to me on Twitter][twitter ref eq] that by moving Redux to a worker every state change will cause the creation of a new copy due to structured cloning. This can be bad as it will cause React to rerender the entire app instead of just the elements whose state properties that have changed. While I didn’t solve this problem in _this_ blog post, I did talk about a solution in my [previous blog post][is postmessage slow] in the “Patching” section.

[react]: https://reactjs.org
[preact]: https://preactjs.com
[svelte]: https://svelte.dev
[lit-html]: https://lit-html.polymer-project.org
[redux]: https://redux.js.org
[redux todomvc]: https://github.com/reduxjs/redux/tree/master/examples/todomvc
[when workers]: /things/when-workers/
[create-react-app]: https://facebook.github.io/create-react-app/
[cra worker pr]: https://github.com/facebook/create-react-app/pull/5886
[webpack]: https://webpack.js.org
[babel]: https://babeljs.io
[webpack worker issue]: https://github.com/webpack/webpack/issues/6472
[worker-plugin]: https://github.com/GoogleChromeLabs/worker-plugin
[react-redux]: https://redux.js.org/basics/usage-with-react
[rollup]: https://rollupjs.org
[rollup omt]: https://github.com/surma/rollup-plugin-off-main-thread
[counter code basic]: https://gist.github.com/surma/64d137ee5548b7d2f978cb59d20b604d/77196c570b6b61b256963043fe338429ce824187
[counter live basic]: step1/index.html
[jason]: https://twitter.com/_developit
[sean larkin]: https://twitter.com/thelarkinn
[comlink]: https://github.com/GoogleChromeLabs/comlink
[messagechannel]: https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel
[gist]: https://gist.github.com/surma/64d137ee5548b7d2f978cb59d20b604d
[stockroom]: https://github.com/developit/stockroom
[weakrefs]: https://github.com/tc39/proposal-weakrefs
[RPC]: https://en.wikipedia.org/wiki/Remote_procedure_call
[twitter ref eq]: https://twitter.com/nejcramovs/status/1156234576093687813
[is postmessage slow]: /things/is-postmessage-slow/
