---
layout: post
title: Tweetministrator
obituary: Abusing Twitter for administrative purposes
categories: [project]
---
## The project
Not available.

## The idea
For over two years now I have been logging into my backup server every night to make it shut down. Since a few days ago I have to do the same with my desktop machine. It’s incredibly annoying. There is however no proper way to automate this, since I don’t go to bed at a fixed time (which would make a cronjob perfect). The involved machines are not even in my line of sight. So this calls for some networking solution.

A simple client/server application would be just fine, but then I figured that - ideally - I wouldn’t be dependent on my laptop. So, mobile app it is.

## Decision for a technology
After a while it boiled down to this: [Google App Inventor] for the mobile side or [Twitter] client for the server side.

I’ve been looking for a reason to use Google’s App Inventor. I can’t really believe that I’m supposed to be able to build apps with full-blown logic behind them. But this is not the excuse I’ve been looking for for two simple reasons:

 * A server has to be written in both cases. If I were to use App Inventor, I’d even have to develop my own protocol or implement an existing one. So using the App Inventor is just extra work.
 * Twitter is cross-plattform. *Every* mobile plattform has a Twitter client. This way, the program is really reusable.

A daemon logging into Twitter to receive messages seems like a good idea.

Obviously, [Go] is my first choice for a server app. There seem to be a lot of [Twitter libraries for Go][twitterstream] floating around on GitHub. One of them will do.
## Vision
### Core functionality
With a Twitter App, a program can get access to a user’s stream. Via configuration, the user can choose **which Twitter users are allowed to issue commands**. Those **commands are tweet messages mapped to shell commands**. With the common @ notation, **one or more machines can be targeted simultaneously**.

### Expansion pack functionality
 * Commands take parameters
 * Per-user permissions for commands
 * Feedback from Servers

[Google App Inventor]: http://www.appinventorbeta.com/ "Google’s semi-web-app for developing Android apps via drag’n’drop"
[Twitter]: http://www.twitter.com "World famous micro-blogging and messaging service"
[Go]: http://www.golang.org "The Go programming language"
[twitterstream]: https://github.com/hoisie/twitterstream "A Twitter library for Go by the same guy who developed web.go and mustache.go"
