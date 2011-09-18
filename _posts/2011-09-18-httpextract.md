---
layout: post
title: HTTPExtract
obituary: Extracting streamed files
categories: [project]
startdate: 2011-09-18
---
## The project
The code is hosted on [GitHub].

## The idea
I keep finding my self listening to songs on [Grooveshark] or [Deezer] which I like but do not own and therefore cannot have on my MP3 player. After [thinking][Wireshark] about Grooveshark for a while, I figured it would be the easiest approach to save the files to disk as they are being streamed.

To get all the data sent between browser and server, a simple HTTP proxy server suffices.

**Of course, I never tested or used this program!** - Because that would be against Grooveshark’s [Terms of Service][GroovesharkTerms]. And I don’t do that kind of stuff. Nope. I certainly wouldn’t.

## Decision for a technology
Since Go offers a HTTP [server and client][GoHTTPpkg] package in the default library, the choice was easy. I would only have to implement the `TeeWriter`, which takes input and writes it to two outputs (i.e. the file and the browser connection).

## Vision
### Core functionality
The user should be able to **define patterns**. **If a pattern matches** a filename in a request, the response is **saved** to a user defined folder. Saving the content with **different extension** should be possible.
A **configuration panel should be available via HTTP** to avoid forcing the user to write valid JSON or something similar.

### Expansion pack functionality
* The user can pipe the content to another program before it is being saved.
* Enable/Disable pass-thru

[GitHub]: http://github.com/surma/httpextract "HTTPExtract on GitHub"
[Grooveshark]: http://www.grooveshark.com "A music streaming service"
[Deezer]: http://www.deezer.com "Another music streaming service"
[Wireshark]: http://www.wireshark.org "Capturing packets going through a NIC"
[GroovesharkTerms]: http://www.grooveshark.com/terms "Grooveshark’s Terms of Service"
[GoHTTPpkg]: http://golang.org/pkg/http/ "Go’s HTTP package"
