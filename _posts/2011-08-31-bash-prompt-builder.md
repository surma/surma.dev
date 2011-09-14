---
layout: post
title: Bash Prompt Builder
obituary: Avoiding sucky bash syntax
categories: [project]
---
## The project
Not available.

## The idea
While I was trying to build my own customized bash prompt (or, as it is also known: `$PS1`), I (once again) realized how much I hate bash syntax. My [resulting prompt code][BashProfile] works as intended, it was no fun developing the code manually, though. I had to have the bash’s man page open at all times and encountered a few quirks of bash (of which there are *many*), like the handling and differences of `` ` `` and `$()` etc.

I wished for a some kind of tool where I could just “arrange” the items of my prompt via Drag’n’Drop – not unlike [Google’s App Inventor].

## Decision for a technology
I figured, a simple web based tool might do the trick. For Drag’n’Drop functionality (and also everyting else JavaScript-y) there is of course [jQuery].  The rest is just JavaScript infrastructure for the *“modules”*, the individual parts which make up a prompt like colors, username, hostname, etc.

## Vision
### Core functionality
A user should be able to place code fragments represented by blocks with the module’s configuration form inside.  Those blocks can be lined up, rearranged and reconfigured to the liking of the user.  A preview window shows a (approximate) view of the prompt in action.

The block type includes:
* Fixed string
* Fore- and background-colors
  + (Light) red
  + (Light) green
  + (Light) blue
  + (Light) cyan
  + (Light) purble
  + Yellow
  + Brown
  + Light and dark grey
  + Black and white
* Hostname
* Username
* Number of jobs managed by the current shell
* Bash command number
* Last exit code
* all other bash variables and flags
* if/then/else
* Current git branch
* Current git hash

When done, the user can obtain the bash-compatible code.

### Expansion pack functionality
* The user can upload the code he generated earlier to adjust properties at a later time
* The user can reload his configuration of blocks online (*online storage*), maybe coupled to [GitHub Gists]
* Users can rate other user’s prompts
* Users can write their own modules

[BashProfile]: https://gist.github.com/1216279 "My current bash prompt code"
[Google’s App Inventor]: http://www.appinventorbeta.com/ "Partly web based tool for building Android applications by connecting functionalty pieces"
[jQuery]: http://www.jquery.com "The de-facto standard library for any JavaScript application"
[GitHub Gists]: http://gist.github.com "In place editable files and repositories, version controlled by git"
