---json
{
  "title": "DIY Web Animations: Promises + rAF + Transitions",
  "date": "2017-02-14",
  "socialmediaimage": "title.jpg",
  "live": "true"
}
---

The Web Animations API is great. Except that support is mediocre at best. I keep finding myself re-creating them using Promises, rAF and CSS Transitions, which turned out to be pretty ergonomic.

## Web Animations
With Web Animations, you can grab any element and have it play entire [sequences of animations]:

{{< highlight JavaScript >}}
element.animate([
  {transform: 'translateX(0px)', backgroundColor: 'red'},
  {transform: 'translateX(100px)', backgroundColor: 'blue'},
  {transform: 'translateX(50px)', backgroundColor: 'green'},
  {transform: 'translateX(0px)', backgroundColor: 'red'},
  //...
], {
    duration: 3000,
    iterations: 3,
    delay: 0
}).finish.then(_ => console.log('I’m done animating!'));
{{< /highlight >}}

Pretty nice, right? And this is only the tip of the iceberg when it comes to Web Animations. The spec has many more features like composited animations, working with multiple timelines and an event infrastructure. If you want to know more, take a look at the [Web Animations spec]. But alas, as of now only Firefox and Chrome have support – and that’s _partial_ support. So slim pickens if you would like to use this in production.

## DIY
For daily life, however, all I really want is something like the code snippet above: A declarative way of defining sequences of animations. To get that I could just use the [Web Animations Polyfill], but that contains way more capabilities (and therefore code) than what I actually need.

{{< highlight JavaScript >}}
Object.assign(element.style,
  {
    transition: 'transform 1s, background-color 1s',
    backgroundColor: 'red',
    transform: 'translateX(0px)',
  }
);

requestAnimationFramePromise()
  .then(_ => animate(element,
    {transform: 'translateX(100px)', backgroundColor: 'blue'}))
  .then(_ => animate(element,
    {transform: 'translateX(50px)', backgroundColor: 'green'}))
  .then(_ => animate(element,
    {transform: 'translateX(0px)', backgroundColor: 'red'}))
  .then(_ => console.log('I’m done animating!'));
{{< /highlight >}}

Not _as_ nice, but [works in all browsers] and certainly “good enough”, don’t you think? The weirdest thing is probably that you have to define the first keyframe somewhat differently to the rest of the keyframes. If you dare to transpile [ES2017 async/await], you’ll have even less indentation to deal with.

So how did I implement this? If you talk about chains in JavaScript, you inevitably end up with Promises. Hence why I am wrapping `requestAnimationFrame` and CSS Transitions in them. Maybe somewhat surprisingly, that’s all you gonna need.

## Wrapping CSS Transitions
CSS Transitions emit an `transitionend` event whenever when an element is done with the animation.

{{< highlight JavaScript >}}
function transitionEndPromise(element) {
  return new Promise(resolve => {
    element.addEventListener('transitionend', function f() {
      element.removeEventListener('transitionend', f);
      resolve();
    });
  });
}
{{< /highlight >}}

I am of course good citizens and un-register our listeners after use to not leak memory! With this I can wait on an animation to finish using promises instead of callbacks.

## Wrapping rAF
Our wrapper around `requestAnimationFrame` is even shorter:

{{< highlight JavaScript >}}
function requestAnimationFramePromise() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}
{{< /highlight >}}

With this I can wait on the next frame using promises instead of callbacks.

## My own `animate()`
Now I have my primitives that I can combine into my own version of `element.animate()`.

{{< highlight JavaScript >}}
function animate(element, stylz) {
  Object.assign(element.style, stylz);
  return transitionEndPromise(element)
    .then(_ => requestAnimationFramePromise());
}
{{< /highlight >}}

And that’s it! That’s all that’s going on behind the scenes to make my code snippet above work. I think this extremely lightweight abstraction yields _a lot_ of developer convenience when working with animations and transitions. Don’t forget that all the tooling around Promises like [`Promise.all()`] is available to you to do things like running multiple animations in parallel. The concept can easily be applied to all other kinds of event-emiting constructs in the JavaScript ecosystem, as well.

## Trip wires

Apparently, [I needed to be reminded](https://twitter.com/kdzwinel/status/831888961320734724) that events bubble. Come on, Surma!

This means that if you use this technique on two elements while one element is an ancestor of the other, the `transitionend` event from the successor will make the animation chain of predecessor advance forward. Luckily, this can easily be accommodated for by checking `event.target` like this:

{{< highlight JavaScript >}}
function transitionEndPromise(element) {
  return new Promise(resolve => {
    element.addEventListener('transitionend', function f(event) {
      if (event.target !== element) return;
      element.removeEventListener('transitionend', f);
      resolve();
    });
  });
}
{{< /highlight >}}

[sequences of animations]: http://jsbin.com/zadibes/4/edit?js,output
[works in all browsers]: http://jsbin.com/lazetol/7/edit?js,output
[Web Animations Spec]: http://w3c.github.io/web-animations/#the-animatable-interface
[Web Animations Polyfill]: https://github.com/web-animations/web-animations-js
[ES2017 async/await]: http://babeljs.io/docs/plugins/transform-async-to-generator/
[`Promise.all()`]: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
