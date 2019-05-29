---json
{
"title": "When should you be using Web Workers?",
"date": "2019-05-28",
"socialmediaimage": "social.png"
}

---

Always. You should always use Web Workers. Let me explain why.

<!--more-->

[Web Workers] can be seen as JavaScript’s take on threads. JavaScript has always been designed Engines have been built with the assumption that there is a single thread and no parallel access to the underlying memory. If regular threads with their shared memory model got added To JavaScript it would be disastrous to say the least. Instead we have Web Workers, which are basically an entire JavaScript scope running on a separate thread but without any shared memory or shared values with the _main_ thread.

[Web Workers]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API