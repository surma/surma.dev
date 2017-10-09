{
  "title": "Comlink + WebRTC — An Intro to WebRTC",
  "date": "2017-10-06",
  "socialmediaimage": "logo.jpg",
  "live": "false"
}

WebRTC is cool. WebRTC is hard. WebRTC is painful, actually. Partly due to how awful most of the tutorials out there are. Here’s my attempt and describing WebRTC and how I used it for some fun [Comlink] shenanigans.
<!--more-->

> **TL;DR:** There couldn’t possibly be a TL;DR for WebRTC. But here’s a fun [demo].

<style>
  .yt-wrapper {
    position: relative;
    width: 100%;
  }
  .yt-wrapper::after {
    content: url();
    display: block;
    padding-top: calc(1 / (16 / 9) * 100%);
    pointer-events: none;
  }
  .yt-wrapper iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>
<div class="yt-wrapper">
  <iframe src="https://www.youtube.com/embed/_oqk2JygMi8?rel=0" frameborder="0" allowfullscreen></iframe>
</div>

## The problem with many existing WebRTC introductions

There’s a good amount of WebRTC introductions and tutorials out there, but they all seem to follow a similar pattern:

1. Be handwavey about the inner workings of WebRTC and what the APIs data structures hold.
2. Show how to open a data connection within the same page.
3. Drop in some copy-and-paste backend code and provide STUN/TURN server URLs.
4. Use `getUserMedia()` to build your own Skype.

It’s the WebRTC version of “How to draw an owl”:

![How to draw an owl. Draw some circles. Draw the rest of the fucking owl.](owl.jpg)

There’s a multitude of drawbacks with this approach to teaching WebRTC. First of all: WebRTC is about creating peer-to-peer connections on the web. There’s no reason to consistently conflate WebRTC with the Media API — It adds a lot of cognitive load if you are not initmately familiar with `getUserMedia()` and makes it harder for the reader to see where WebRTC’s responsibilities end and Media API’s responsibilities start. On top of that I have to say that WebRTC is one of the weirder APIs; one of those APIs that stand out because they are not very intuitive to a web developer. I takes energy not to get mad, but it’s what we got. So buckle in, let’s make it work.

> **Note:** I will skip some details in my code snippets on this blog post. The full length code can be found in my [demo][demo code].

## The one end of the connection

Everything starts with an [`RTCPeerConnection`][RTCPeerConnection].

{{< highlight JavaScript >}}
const connection = new RTCPeerConnection();
{{< /highlight >}}

This is already a bit weird. We don’t have a connection to anyone, but we do have a connection instance. The next weird thing is that we need to create the channels we want to use later, so we create our data and video channels before an actual connection has been established. This is necessary so WebRTC can properly negotiate what kind of connection to set up. In our case we are looking to create an [`RTCDataChannel`][RTCDataChannel] so we can exchange simple text messages between peers:

{{< highlight JavaScript >}}
  const channel = new Promise(resolve => {
    const c = connection.createDataChannel('somename', null);
    c.onopen = ({target}) => {
      if (target.readyState === 'open')
        resolve(c);
    };
  });
{{< /highlight >}}

This is a little snippet I wrote to get a promise that resolves once the data channel has been successfully opened.

> **Note:** WebRTC has lots of more in-depth functionality that I am ignoring here like handling reconnects, handling more than one remote peer and more.

WebRTC now knows what _kind_ of connection we want, but to whom? To connect to another peer we need to tell them who and where we are, what we can do and what we expect. Additionally, we need to know the same from our remote peer. In WebRTC, part of this data is encapsulated in the [`RTCSessionDescription`][RTCSessionDescription]. Session descriptions come in two flavors: “Offers” and “Answers”. They contain mostly the same data: codecs, a password and other metadata. They seem to differ only in who gets to be the connection initiator (the answer) and who is the passive listener (that’s the offer). As the the name implies we can’t start with creating an “answer”, so we start with an “offer”:

{{< highlight JavaScript >}}
const offer = new RTCSessionDescription(await connection.createOffer());
{{< /highlight >}}

> **Note:** In Chrome both `createOffer()` and `createAnswer()` returns a promise that resolves to an `RTCSessionDescription`. In Safari Tech Preview and Firefox it resolves to a JSON object that needs to be passed to the `RTCSessionDescription` constructor.

Now we need to tell the connection that this is our end of the connection. Why? I don’t know, who else would own this end of the connection? Oh well, here goes:

{{< highlight JavaScript >}}
connection.setLocalDescription(offer);
connection.onicecandidate = ({candidate}) => {
  if (!candidate) return;
  // do something with `candidate`
};
{{< /highlight >}}

Once we set our local description, we will be given one or me [`RTCIceCandidate`][RTCIceCandidate] objects. [ICE] or ”Interactive Connectivity Establishment” is a protocol to establish the most efficient connection to a peer. Each `RTCIceCandidate` is contains a network address of the host machine along with port, transport protocol and other network details. Using those additional details the ICE protocol can figure out what the most efficient path to our remote peer will be.

> **Note:** By default there won’t be a candidate for the machine’s public IP address. For that you would need a STUN server whose only purpose is to report back your public IP in a WebRTC-compatible way. In my [demo] I did not set up a STUN server which is why it only works for peers on the same computer or the same network.

You will never know when you are done receiving candidates. There could always be a new one during the lifetime of your page — think of someone opening your app and _then_ dialing into the airport WiFi. You should always be ready to incorporate a new candidate. In my [demo] I cheated a bit: I just wait until there hasn’t been a new candidate for more then a second and call it a day.

So what does “incorporate” mean? Well this is where I got really frustrated with WebRTC: It is _your_ job to get both the offer as well as all the candidates to your remote peer so they can configure their `RTCPeerConnection` appropriately. This process is called signalling. I’d love for the Web to have a Peer Discovery API or something that uses network broadcasting to discover peers in the local network or maybe even over Bluetooth. But as of now that’s not a thing.

In my [other demo] I didn’t want to write a backend so I just serialized both the offer and the array of candidates using their respective `.toJSON()` methods and made the user copy/paste the resulting string from a text area. That works but is pretty cumbersome. For my newer [demo] I wrote simple Node backend with a [redis] to create RESTFul “rooms” API. Rooms can be created with a name and when 2 people are in a room they can exchange each other’s session description and candidate list. I won’t go into the details, but [the source][backend code] is there for you to read — and it’s not even 50 lines!

I upload my offer and my candidates list to that backend. At this point this peer has to play the waiting game and it’s time for us to switch over to the other side.

## The other end of the connection

On the other side we start the exact same way by creating a `RTCPeerConnection` and creating the data channel. But on this end we want to create an answer, for which we first need to get ahold of the offer! So we need to hit the backend, get the first peer’s data and applying it to the connection:

{{< highlight JavaScript >}}
  const connection = new RTCPeerConnection();
  const channel = new Promise(resolve => {
    connection.ondatachannel = ({channel}) => resolve(channel);
  });
  const {offer, remoteIceCandidates} = await getDataFromBackend();
  connection.setRemoteDescription(offer);
  for(const candidate of remoteIceCandidates)
    connection.addIceCandidate(candidate);
{{< /highlight >}}

At this point this end of the connection knows how to connect to the first peer (provided there _is_ a way to connect). You’d think we could go ahead and exchange data but WebRTC wouldn‘t be WebRTC if didn’t have to do the entire dance in the other direction as well. So here goes: We have to create an answer and collect this end’s `RTCIceCandidate`s as well and send them back to our first peer — again using our signalling backend.

{{< highlight JavaScript >}}
const answer = new RTCSessionDescription(await connection.createAnswer());
connection.setLocalDescription(answer);
connection.onicecandidate = ({candidate}) => {
  if (!candidate) return;
  // collect all `candidate`s in an array
};
await putDataIntoBackend(answer, allIceCandidates);
{{< /highlight >}}

## Back to the first peer

Back to the first peer are patiently polling for data to appear to us and once it does, we do the same as our second peer:

{{< highlight JavaScript >}}
  const {offer, remoteIceCandidates} = await getDataFromBackend();
  connection.setRemoteDescription(offer);
  for(const candidate of remoteIceCandidates)
    connection.addIceCandidate(candidate);
{{< /highlight >}}

At this point our `RTCPeerConnection` is exactly that, a proper connection! You can see why most tutorials start with creating a connection within the same page, because it allows them to skip the backend and just pass the offer and the answer directly to both ends of the connection. But we want the real deal, and we felt the pain, didn’t we? Now that our connection is established, we can actually start transfering data!

## Data channel

At this point most tutorials start using `getUserMedia()` and transferring a video stream. We are going to be a bit more tame and just go back to our data channel. We can send buffers or strings using `send` and listen to incoming messages using `onmessage`.

        const c = connection.createDataChannel('comlink', null);
        c.onopen = ({target}) => {
          if (target.readyState === 'open')
            resolve(c);
        };








## Recap

So there you have it. Quite a ride, isn’t it? It’s nothing that should be use lightheartedly and the number of hoops you have to jump through to render some of your own DOM to a canvas is somewhat shocking. It’s cool that it works, but the platform could definitely do better here. If you have any ideas, [let me know](https://twitter.com/dassurma)!

[demo]: https://comlink-webrtc.glitch.me/
[demo code]: https://glitch.com/edit/#!/comlink-webrtc
[other demo]: https://googlechromelabs.github.io/comlink/examples/webrtc/
[RTCPeerConnection]: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
[RTCSessionDescription]: https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription
[RTCIceCandidate]: https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate
[RTCDataChannel]: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
[ICE]: https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment
[Comlink]: https://github.com/GoogleChromeLabs/comlink
[redis]: https://redis.io/
[backend code]: https://glitch.com/edit/#!/comlink-webrtc?path=server.js
