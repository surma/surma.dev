---json
{
  "title": "My most useful RegExp trick",
  "date": "2018-05-02",
  "socialmediaimage": "html.png"
}
---

I don’t often use RegExp. But when I do, it’s a variation of this pattern.

<!-- more -->

> **Note**: This blog post uses JavaScript as an example, but is not JavaScript-specific.

Every now and then you find yourself wanting to extract quoted strings, HTML tags or something in-between curly braces from a bigger string of text. While it would be more robust, maintainable and readable to write proper parser, regular expressions (or RegExp for short) are often chosen because you can just search for a ready-made RegExp and use it. The RegExp-based solutions you find on the internet are often suboptimal and it’s hard to understand _why_ they work.

## The naïve way
Let’s consider the quoted string example: Your input might be a piece of JavaScript where you are looking to extract a quoted string:

- Input: `console.log("Hello world!"); console.log("Hello back!");`
- Desired matches: `['"Hello world!"', '"Hello back!"']`

A person who’s new to RegExps might be thinking that `/".*"/gus` does the job. Let’s dissect what this RegExp means:

- `/…/gus` — In JavaScript (and many other languages) RegExp are delimited by slashes, followed by mode flags. `g` means that there may be multiple matches in the same string and we are interested in all of them. `u` enables Unicode mode which generally makes more sense and `s` allows `.` to also match `\n`.
- `"` — Expect a `"` character
- `.` — Expect any character
- `*` — Repeat the last operator 0 or more times
- `"` — Expect a `"` character (again)

> **Note**: In the context of JavaScript, both `s` and `u` are fairly new flags and might not be supported in all browsers.

![DevTools running regexp on the input string](wrong.png)

Running this RegExp on our input string gives an unexpected (or undesired) result:

```text
"Hello world!"); console.log("Hello back!"
```

This is one of those cases where the computer is “technically correct” — the string _does_ have quotes on either end and a series of arbitrary characters in-between — but not actually what we were trying to achieve.

The solution I see most often here is people switching to the “non-greedy” version of `*`:

```text
/".*?"/gus
```

This RegExp is the same one as above but tells the `*` operator from above to “consume” as little as possible, giving us the desired result.

![DevTools running regexp on the input string](nongreedy.png)

Personally I have trust issues when it comes to non-greedy matchers, but more critically: What happens when we run our RegExp on `console.log("Hello \\"world\\"!");`?

![DevTools running regexp on the input string](backslash.png)

Oh noes.

## The trick
The backslash has betrayed us! So what now? This is where the trick I promised comes in. Imma throw my RegExp at you and then I’ll tell you how I got there:

```text
/"([^"\\]|\\.)*"/gus
```

Yeah, we just made one of _those_ RegExps. Isn’t it beautiful?

The first realization to have is that while `/".*?"/gus` kinda works, it doesn’t really express what you _actually_ mean. We don’t want to accept _any_ character between our double quotes. We want _anything but a double quote_. How do we do that? In RegExps you can use character groups to match against an entire set of characters:

- `[abc]` — Expect the character `a`, `b` or `c`
- `[a-z]` — Expect any letter between `a` and `z`
- `[^abc]` — Expect any character _but_ `a`, `b` or `c`.

With this in mind, we can write our original RegExp without a non-greedy matcher:

```text
/"[^"]*"/gus
```

This, however, still doesn’t solve our backslash issue. For this we need to augment our statement above: Between our double quotes, we want to accept anything but double quotes but if it’s a backslash we don’t care what the next character is.

And that brings us back to the cryptic original RegExp (with some added spaces for grouping):

```text
/"   (   [^"\\]   |   \\.   )*   "/gus
```

- `(...|...)` – Expect any of the listed alternatives, delimited by `|` (there’s only 2 alternatives here).
- `[^"\\]` – Expect anything _but_ a double quote or a backslash.
- `\\.` – Expect a backslash and then any character.

The trick here is to offer alternatives that are mutually exclusive. The first alternative _cannot_ match a double quote. If a string with a double quote is supposed to match this RegExp the second alternative has to be the one matching it. And that can only happen, if it’s preceded by a backslash.

…and lo and behold, this RegExp matches strings even with escaped quotes!

![DevTools running regexp on the input string](escape.png)

Pretty cool, right?

## Bonus: HTML tags
HTML tags are a funny one because the (infinite number of) escape sequences for “`>`” don’t contain the character “`>`” (like `&gt;`). Because of this most simple RegExps like `/<[^>]*>/gus` work just fine.

...until you use “`>`” in an attribute value!

- Input: `<a href="javascript:alert('>');" target="_blank">lol</a>`
- Desired output: `<a href="javascript:alert('>');" target="_blank">`

To handle this case, we have to use our new trick _twice_. The only way a closing tag “`>`” can appear in an HTML tag is inside a string. So our first alternative will accept anything that is not a closing tag or a double quote. The second alternative is our string RegExp from before:

```text
/<([^>"]| string RegExp )*>/gus
```

or fully written out:

```text
/<([^>"]|"([^"\\]|\\.)*")*>/gus
```

Oof, quite the mouthful, isn’t it? But it works!

![DevTools running regexp on the input string](html.png)

## Parting advice
There’s a reason Jamie Zawinski’s quote is so famous:

> Some people, when confronted with a problem, think "I know, I'll use regular expressions." Now they have two problems.

RegExps tend to build into an unmaintainable mess of crypticism very quickly. Use them sparingly and with care. And remember that most [language grammars can’t be parsed with RegExp](https://stackoverflow.com/questions/1732348/regex-match-open-tags-except-xhtml-self-contained-tags/1732454#1732454). But most importantly: It’s often better to not try to look smart and rather just do string manipulation with simple method calls.


