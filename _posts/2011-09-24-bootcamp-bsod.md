---
layout: social
title: BSOD with BootCamp under Lion
categories: [note]
---

Journey
-------
For the first time today, I used BootCamp to install Windows 7 on my MacBook Pro 7.1, which runs Lion. As expected, everything went smooth and was suprisingly easy.

I used my Mac OS X 10.6 DVD to install the drivers, which, no surprise there, required me to reboot.

The machine restarted and all I observed was a Bluescreen and the machine rebooting immediately.

After the reboot I barely had time to look at the report, so fast was the next Bluescreen.

A boot into Safe Mode yielded a stable system and therefore enough time to see, that report said

    BCCode:    34
    BCP1:	00000107
    BCP2:	C0000420
    BCP3:	00000000
    BCP4:	00000000
    [...]

Solution
--------
Looking into Microsofts [Bug Check code referece][bccr], didn't help me at all.
But after searching the web for a while, I [found a proposal][macrumors], which in my case turned out to be the solution: Disable Apples HFS drivers. Just give

    C:\Windows\system32\drivers\AppleHFS.sys
    C:\Windows\system32\drivers\AppleMNT.sys

a `.bak` extension.

[bccr]: http://msdn.microsoft.com/en-us/library/hh406232.aspx "List of explanations for every BCCode"
[macrumors]: https://discussions.apple.com/message/12618108?messageID=12618108 "Solution to my BSOD problem"