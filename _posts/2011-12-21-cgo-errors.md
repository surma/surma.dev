---
layout: social
title: Cgo and insufficient error reporting
categories: [note]
---

Journey
-------
I’m trying to port [udis86] to Go. There were 2 major problems along the way:

* You *need* a dynamic/shared library.  
  Apparently, you cannot compile a whole bunch of .c-Files and like them all into the executable. Even more excruciating is, that it will compile, and it will even link, but at start there’s going to be problems. Global variables on the C side seem to be the cause, but I haven’t looked into it.
* Callbacks are a bitch!  
  If you get some weird error like `unrecognized Go type *ast.StructType` you probably have an exported Go function which takes a struct as an argument (or whatever type it is complaining about). Make it something else. I haven’t found a consistency yet, but I just went with `uintptr`.

[udis86]: http://udis86.sourceforge.net/ "A x86/x86_64 disassembler library. Very nice interface."
