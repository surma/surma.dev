---
layout: post
title: ProConList Extended
obituary: Pro/Con-Lists with algorithmic evaluation
categories: [project]
---
## The project
Not available.

## The idea
Sometimes I make a Pro/Con list. However, when I’m done I notice that the list is rather useless.
If there’s a tie between pros and cons (i.e. they contain the same number of items) it’s kind of obvious
that some points are more important than other ones.

What I want to do is help with this problem. 

## Decision for a technology
This will probably be a simple webapp with all it’s functionality written in JavaScript an no backend. 
So I guess my technology will be [GitHub] and maybe I’ll give [backbone.js] a try.
## Vision
### Core functionality
A user enters his pro/con list into a table. After he is done pairs of those items are presented to the user
and he has to choose which one is more imporant to him. This is done as long as total order is achieved 
(If that is impossible due to conflicting answers of the user, a partial order is accepted).
Now the items will get weighted with different schemes according to that order. Usefull weightings might be:

* Uniform weighting
* Linear weighting
* Fibonacci weighting

[GitHub]: http://www.github.com/ "The Facebook of software development"
[backbone.js]: http://documentcloud.github.com/backbone/ "A MVC framework with eventhandling"
