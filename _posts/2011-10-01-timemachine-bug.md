---
layout: social
title: The god-awful TimeMachine bug
categories: [note]
---

Journey
-------
Well, this is going to be a short one: One day, my MacBook became incredibly unresponsive. As it turned out, my RAM was fully occupied and the swap file had grown to over 10 GBs and rising. The memory was allocated to `backupd`.

Solution
--------
It was the day I configured [Unison] to synchronize a folder with the internal data of [my company][asdf-systems].
Our bookkeeper put some old files in there, the names of which contained [umlauts]. That alone isn’t lethal, but the filename being encoded with Latin-1 instead of UTF-8 is – and apparently `backupd`, which is the TimeMachine backup daemon, doesn’t handle that encoding very gracefully (i.e. at all).

So killing `backupd`, unplugging my backup disk and renaming the files solved everything.

[Unison]: http://www.cis.upenn.edu/~bcpierce/unison/ "Remote folder synchronization with conflict handling"
[asdf-systems]: http://www.asdf-systems.de "My company’s webpage"
[umlauts]: http://en.wikipedia.org/wiki/Germanic_umlaut "Weird, german characters"
