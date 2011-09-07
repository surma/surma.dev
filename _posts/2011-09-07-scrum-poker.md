---
layout: post
title: Scrum Poker
obituary: 21<sup>st</sup> century scrum poker
categories: [project]
---
## The project
Not available.

## The idea
In the past few weeks I have been investigatin a lot of web-based Scrum tools. I do not want to go into the details of Scrum, but one aspect of it is the so call *Scrum poker*.

When trying to determine the complexity of a feature of a project, each team member gives that feature a certain number of (unitless) points representing the effort necessary to implement that feature. If the individual points diverge too much, the person who gave the highest and the one who gave the lowest rating have to justify their choice. Then everyone votes again and the average is taken.

Most of the webservices I looked into were pretty and very usable, but did not provide anything to simplify this part of scrumming.

Having seen [webpages which react to other user’s actions in realtime][Wandercircus], I thought this could be a great project to get to know [Websockets] and or [Google AppEngine].

## Decision for a technology
It cannot be both! Or at least, it should not be. The AppEngine API has something called *“channels”* which have the same functionality as websockets, but with automatic fallback to AJAX or similar if the browser does not have support for websockets (I am looking at you, IE!). So that is a plus for AppEngine. And here are some other plusses:

 * I do not want to write a backend in PHP, **I want to write Go**. That forces me to configure my own webserver, because Go can only be used as a (F)CGI application. I do not think the generic web hoster allows this kind of stuff.
 * With AppEngine, I do not have to worry about **session and database management**. AppEngine has all this neatly packaged into some Go library.
 * I am a **efficiency nazi and wannabe-professional**. Although not necessary for a low-profile app like this, I like my apps speedy, functional and available. AppEngine natively provides [MemCached], automatic horizontal scaling and guaranteed availability.

The minusses:

 * I still will not know how websockets are used. But that is just 1 hour of reading or so.
 * *If* this app is used by more than my team of 4 people, it could happen that I leave the “for-free” pricing area of Google Apps.

But all in all it obvious that Google Apps wins.

## Vision
### Core functionality
I want people to be able to create **“poker rooms”** which are **secured by a simple password**. Every team member participating in a Scrum poker pulls out their **mobile or laptop**, joins that room and **enters their name and the password**.  The Scrum master has a separate screen where he can **configure the scale of points** as well as **lock and unlock the voting**.  When unlocked, the **participants can enter their vote**. When everyone voted, **the highest, the lowest and the average number of points are shown** to every participant.

### Expansion pack functionality
 * The master can pass his mastery to someone else.

[Wandercircus]: http://www.wandercircus.com "Sending bots to IRC channels to reenact a part of a movie"
[Websockets]: http://en.wikipedia.org/wiki/WebSocket "A permanent connection to the webserver allows real-time events"
[Google AppEngine]: http://code.google.com/appengine/ "Deploying apps which scale automatically"
[MemCached]: http://memcached.org/ "A distributed memory object caching system"
