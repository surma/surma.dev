---

title: "LangGraph for complex workflows"
date: "2025-06-17"
socialmediaimage: "social.png"
live: true

---

I may be late to the party, but LangGraph lets you build complex workflow architectures and codify them as powerful automations. Also LLMs, if you want. But you don’t have to!

<!-- more -->

## LLM Architecture

I always liked the idea of “flow-based” programming. [PureData], [DaVinci Resolve], [Node Red]... they all appeal to me. I also always liked the idea of running LLMs locally, rather than spending money for an LLM provider off-site.  Combine that with the potential future where operating systems or the browser provide a (potentially user- or os-dependent, small and unspecified) LLM model, it becomes increasingly important to be able to express and run granular, robust workflows in some way.

The problem is that the machines in my possession are only capable of running small LLMs like [LLama 3.1], and those can only handle smaller, well-specified tasks. It is important to break your task into many smaller, well-scope subtasks. Effectively, you have to start orchestrating multiple LLMs, which is a pattern that is also becoming more popular in general under the topic of clusters and swarms. Having multiple LLMs active not only allow you to give each LLM instance a different “persona” with a different specialization, but it also allows you to mix different models according to their strengths and weaknesses, and to multiple inference steps in parallel. Distributing your task across multiple LLMs in parallel can get you to the final result _quicker_, although that aspect is admittedly a bit more hit and miss.

But how do you build such an orchestration of LLMs? There are many options out there, with different tradeoffs and design decisions. In this article I am going to use [LangGraph], from the same makers as [LangChain], one of the bedrock Python libraries for LLMs. This is not me declaring them my personal winner, but I found LangGraph very intuitive and well-designed. Also, as it turns out, they wrote JavaScript libraries called [langchain.js] and [langgraph.js], respectively, to cater to the JS audience.

## LangChain

LangChain has been around for ages and is originally a Python library that lets you _chain_ operations on LLMs. As the name somewhat implies, you can build [DAGs][dag] through which data flows and is processed by LLM-driven nodes. There are a lot of utilities and helpers in LangChain, but we actually won’t be using most of them. In this instance, LangChain mostly provides one thing for us: A uniform way to interact with an LLM regardless of the provider.

### Basic Chat Completion

For running LLMs locally, I tend to use [Ollama]. 
```typescript
import { ChatOllama } from "@langchain/ollama";

const llm = new ChatOllama({
    baseUrl: "http://localhost:11434/",
    model: "llama3.1:8b"
});
```

All the other, typical LLM providers (OpenAI, Anthropic, Google Vertex AI, AWS Bedrock, etc) have their own LangChain package!

```ts
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({
    model: "claude-3-7-sonnet-latest",
    apiKey: "..."
});
```

No matter which of the provider packages you end up using, the resulting `llm` instance will provide an `invoke()` method to create a chat completion. This is not groundbreaking, of course, but it is nice to have a uniform API regardless of LLM provider. Let’s make sure it works:


```typescript
const result = await models.gemini25flash.invoke(
  "What is 1+1? Give me a slight explanation, too!"
);
```

And after a short while, `result.content` will contain something like this:

```
1+1=2

This is because when you add 1 unit to another 1 unit,
you get a total of 2 units. Addition combines quantities,
so one item plus one more item equals two items in total.
```

### Structured Responses

Often, the tasks we give to LLMs have a specific answer. In the example above we requested a mathematical result and an explanation. However, by default, we just get a blob of prose and we have to figure out ourselves how we extract the bits of information that we are interested in. While _some_ LLMs now have the ability to provide “structured” responses — sometimes also called JSON mode — not all of them do. Again, LangChain tries to level things out here for us. If the model has support for structured responses, it will utilize this ability. If not, it will try and “polyfill” it. It does this by piping the prose answer through the LLM a 2nd time and requesting it to reformat the answer as JSON. No matter which path has been taken, since we have defined our expected schema (in this example using [zod]), it will validate that the answer conforms to the expected schema.


```typescript
import { z } from "zod";

const Answer = z
  .object({
    result: z.string()
      .describe("The result of the mathematical expression"),
    explanation: z.string()
      .describe("The explanation"),
  });

const structuredLlm = llm.withStructuredOutput(Answer, {
  strict: true,
});
const result = await structuredLlm.invoke(
  "What is 1+1? Give me a brief explanation, too!"
);
```

Which yields a nicely inspectable object:
```js
{
  result: "2",
  explanation: `1+1=2 is a basic addition operation.
    When we add one unit to another unit, we get
    two units in total.`
}
```

This makes it much easier to get the information from the LLM that you are looking to get.

### Tools

Tools are the feature formerly known as “functions”. An LLM that supports tools can be given a list of function signatures (including parameter types and descriptions), along with the user’s message. If it seems correct to the LLM, instead of responding with text, it will respond with a special message indicating which of the provided tools should be called and what the parameters should be.

The ability to call tools hugely increases the utility that LLMs provide. With the somewhat recent introduction and de-facto standardization of the
[Model Context Protocol][mcp] and the resulting ecosystem of MCP servers, being able to utilize tools with LLMs is essential. LangChain provides a convenient function to expose any arbitrary asynchronous functions as a tool, using zod to both define and validate the schema of the function parameters.

For example, here I define a tool called `webfetch` that allows agents to download and read web content. Ideally I’d pipe the HTML through [Jina AI’s Reader-LM](https://huggingface.com/jinaai/readerlm-v2) to turn HTML into Markdown, but this article was already getting out of hand.


```typescript
import { tool } from "@langchain/core/tools";

const webfetch = tool(
  async ({ url }) => {
    const response = await fetch(url);
    const content = await response.text();
    return content;
  },
  {
    name: "webfetch",
    description:
      "This tool allows you to download the contents of a website or a given URL.",
    schema: z.object({
      url: z
        .string()
        .url()
        .describe(
          "The URL of the website to download."
        ),
    }),
  }
);
```

As you can tell, that makes it very easy to write you own custom tools. Tapping into the ever-growing ecosystem of MCP server is just as straight forward with a single helper from LangChain:


```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const mcps = new MultiServerMCPClient({
  mcpServers: {
    everything: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-everything"],
      transport: "stdio",
    },
  },
});

const mcpTools = await mcps.getTools();
```

For a LangChain LLM instance to be able to invoke a tool, it has to be “bound” to the LLM. 


```typescript
const llm_with_webfetch = llm.bindTools([webfetch]);
const result = await llm_with_webfetch.invoke(
  "What is my IP? You can find it on https://jsonip.com"
);
// {
//   content: "",
//   tool_calls: [
//     {
//       name: "webfetch",
//       args: { url: "https://jsonip.com" },
//       ...
//     }
//   ]
// }
```

Great! It works! The LLM clearly has access to the tool and decided that it is useful for the task at hand. However, the LLM can only tell us that it wants to invoke a tool. We have to write the logic for the actual invocation ourselves. That means we have to analyze the LLMs response to detect that it is a tool invocation, figure out which tool is being invoked (there may be multiple!), we have to then manually invoke the tool, capture the return value of the tool and then invoke the LLM again, passing along the tool’s result to allow the LLM to process it. Quite tedious.

It seems intuitive that what should happen here is that the tools that the LLM wants to invoke actually get invoked automatically and the LLM gets fed the response. In fact, what happens quite often is that the LLM will invoke a tool, and the return value of the tool informs waht tool the LLM will invoke next. This pattern typically keeps going until the user’s request has been fulfilled. The number of steps that are required is not clear and inherently depends on the complexity of the request.

What we are working towards here is an “agent”. An agent is an LLM with an identity (read: system prompt) and access to a bunch of tools. It ill keep going in circles between invoking the LLM and invoking a tool until a stop condition is met (typically until the LLM is no longer wanting to invoke tools).

The problem is that this is cyclic (LLM -> Tools -> LLM -> Tools -> ...) and as such LangChain’s DAG-based architecture cannot model this approach. Enter LangGraph!

## LangGraph

LangGraph is a graph library from the same folks as LangChain and therefore is LangChain-aware. However, at it’s core, LangGraph is a standalone graph library. So let’s put all the LLM shenanigans to one side for a moment and just build some nice little graphs!

Graphs, in the mathematical sense, are nodes which are connected by edges. In LangGraph, a graph has a state object (whose schema is defined using Zod) that gets passed to the active node. The active node can manipulate the data in the state object. While there is only a single start node, LangGraph is able to take multiple edges for the active node at once, making multiple nodes become active in ~parallel.

The simplest form of a node is an async function. When the node becomes active, the async function gets invoked with the state object as the first parameter. The async function can return the _updates_ it wants to make to the state object.


```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";
import "@langchain/langgraph/zod";

const GraphState = z.object({
  count: z.number(),
});

const graphBuilder = new StateGraph(GraphState)
  .addNode("incrementer", async ({ count }) => {
    return { count: count + 1 };
  })
  .addEdge(START, "incrementer")
  .addEdge("incrementer", END);

const graph = graphBuilder.compile();
const result = await graph.invoke({ count: 0 });
// { count : 1 }
```

How exciting.

### Loops

The thing that LangChain could not do is model loops. So let’s make sure that LangGraph actually solves this. Just like in coding, loops need to have a break condition, and for that LangGraph has the concept of conditional edges. Conditional edges are inserted similarly to normal edges. However, instead of the target node, conitional edges accept a function that take the graph state and returns a value. The third argument is a map that maps the function’s return value to the target node’s name.


```typescript
const GraphState = z.object({
  count: z.number(),
});

const graphBuilder = new StateGraph(GraphState)
  .addNode("incrementer", async ({ count }) => {
    return { count: count + 1 };
  })
  .addNode("doubler", async ({ count }) => {
    return { count: count * 2 };
  })
  .addEdge(START, "incrementer")
  .addConditionalEdges(
    "incrementer",
    ({ count }) => count < 10,
    { true: "incrementer", false: "doubler" }
  )
  .addEdge("doubler", END);

const graph = graphBuilder.compile();
const result = await graph.invoke({ count: 0 });
// { count: 20 }
```

You can imagine that looking at code like this and figuring out what is happening can get a bit unwieldy over time. To address that, LangGraph can visualize your graph for you:

```typescript
gr.getGraph().drawMermaidPng();
```

<figure>
  <img src="looper.svg" style="max-height: 50vh">
  <figcaption>The graph that we programmatically created.</figcaption>
</figure>

<script language="mermaid" style="display: none;">
graph TD;
	__start__([<p>__start__</p>]):::first
	incrementer(incrementer)
	doubler(doubler)
	__end__([<p>__end__</p>]):::last
	__start__ --> incrementer;
	doubler --> __end__;
	incrementer -. &nbsp;false&nbsp; .-> doubler;
	incrementer -. &nbsp;true&nbsp; .-> incrementer;
	classDef default fill:#f2f0ff,line-height:1.2;
	classDef last fill:#bfb6fc;
	classDef first fill:#bfb6fc;
</script>
  
Much clearer!

### Parallelism

Parallelism seems almost out of scope for a fundamental introduction like this, but understanding how parallelism works will explain why the state object isn’t as straight forward as you may think.

Any node is allowed to have multiple (even conditional!) edges to other nodes. If multiple edges are taken, the set of target nodes all become active in ~parallel.

> **Note:** As far as I can tell, langchain.js is only concurrent, not truly parallel. The underlying architecture of the graph is based on message-passing, so true parallelism is absolutely feasible, even though this is JavaScript.

Like I mentioned before, a node returns the _updates_ it wants to make to the state object, rather than manipulating the state object directly. So when multiple nodes are active, the each return a set of updates to apply to the state object. As long as all the updates work on disjoint parts of the state object, everything works fine just as before!


```typescript
const GraphState = z.object({
  node_a_done: z.boolean().default(() => false),
  node_b_done: z.boolean().default(() => false),
});

const graphBuilder = new StateGraph(GraphState)
  .addNode("node_a", async () => {
    return { node_a_done: true };
  })
  .addNode("node_b", async () => {
    return { node_b_done: true };
  })
  .addNode("node_c", async () => {})
  .addEdge(START, "node_a")
  .addEdge(START, "node_b")
  .addEdge("node_a", "node_c")
  .addEdge("node_b", "node_c")
  .addEdge("node_c", END);

const graph = graphBuilder.compile();
const result = await graph.invoke({});
// {
//   node_a_done: true,
//   node_b_done: true
// }
```

<figure>
  <img src="parallel.svg" style="max-height: 50vh">
  <figcaption>Multiple edges can be taken at the same time, introducing parallelism.</figcaption>
</figure>

<script language="mermaid" style="display: none;">
graph TD;
	__start__([<p>__start__</p>]):::first
	node_a(node_a)
	node_b(node_b)
	node_c(node_c)
	__end__([<p>__end__</p>]):::last
	__start__ --> node_a;
	__start__ --> node_b;
	node_a --> node_c;
	node_b --> node_c;
	node_c --> __end__;
	classDef default fill:#f2f0ff,line-height:1.2;
	classDef last fill:#bfb6fc;
	classDef first fill:#bfb6fc;
</script>

But what if node A and node B in the above example were to write to the _same_ property in the state object? 

### Reducers
Without any further changes, that would just be race-y. The updates would be applied sequentially, in some order, and only one value would remain. That is bad. To handle that, state properties can define “reducers”, which codifty how a new value for a property should be reconciled with the previous existing value.

The canonical example is that a property in the state object is a list. Rather than overwriting the old list with a new one, the reducer appends the new list to the old one!

```typescript
const GraphState = z.object({
  items: z
    .string()
    .array()
    .default(() => [])
    .langgraph.reducer((list, n) => [
      ...list,
      ...(Array.isArray(n) ? n : [n]),
    ]),
});

const graphBuilder = new StateGraph(GraphState)
  .addNode("node_a", async () => {
    return { items: "item 1" };
  })
  .addNode("node_b", async () => {
    return { items: "item 2" };
  })
  .addNode("node_c", async () => {})
  .addEdge(START, "node_a")
  .addEdge(START, "node_b")
  .addEdge("node_a", "node_c")
  .addEdge("node_b", "node_c")
  .addEdge("node_c", END);

const graph = graphBuilder.compile();
const result = await graph.invoke({});
// {
//   items: ["item 1", "item 2"]
// }
```

Each node returned a value on the same property, but the resulting state object contains both of them. Hurrah.

## Agents

With LangGraph in our backpocket, we are now able to build cyclic graphs and cyclic workflows. Time to go back to our LLM use-case and take another stab at agents! We could build our own graph to model the back-and-forth between LLM chat completion and tool invocation (and sometimes that can be useful!), but lucky for us, this is such a common pattern that LangGraph has it ready to go!

> **Note:** ReAct comes from “Reasoning and Act”, as introduced by the [original paper](https://arxiv.org/abs/2210.03629). This has nothing to do with Facebook’s React.

Let’s try our simple fetch tool from earlier, but this time we are giving it to an ReAct agent!

```typescript
import { createReactAgent } from "npm:@langchain/langgraph/prebuilt";

const agent = createReactAgent({
  llm: models.gemini25flash,
  tools: [webfetch],
  prompt:
    "You are a helpful assistant that uses the tools to fulfill the user's query.",
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "What is my IP? You can find it on https://jsonip.com",
    },
  ],
});
```

`result` will be the final chat log that has gone through multiple rounds of chat completion. It should look something like this:

- **👤 User:**<br>
  What is my IP? You can find it on https://jsonip.com
- **🛠️ Tool**:<br>
  <code>webfetch({url: "https://jsonip.com"}) -> `{"ip":"219.35.66.240"}`</code>
- **🤖 Assistant**:<br>
  Your IP address is 219.35.66.240.

Okay, pretty good. It works, but this is also a pretty easy scenario. If this really is a proper agent, it should also handle multiple roundtrips. Let’s try something slightly more complex:


```typescript
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: `
        Go to https://surma.dev, find
        the very first blog post ever
        published, and give me the
        "golden rule" it mentions.
      `,
    },
  ],
});
```

- **👤 User:**<br>
  Go to https://surma.dev, find the very first blog post ever published, and give me the "golden rule" it mentions.
- **🛠️ Tool**:<br>
  <code>webfetch({url: "https://surma.dev"}) -> `<!doctype html> ...`</code>
- **🛠️ Tool**:<br>
  <code>webfetch({url: "https://surma.dev/things/"}) -> `<!doctype html> ...`</code>
- **🛠️ Tool**:<br>
  <code>webfetch({url: "https://surma.dev/things/maelstromgaming"}) -> `<!doctype html> ...`</code>
- **🤖 Assistant**:<br>
  The “golden rule” mentioned in the very first blog post on surma.dev, titled “Maelstrom Gaming and 12 fps” and published on November 11, 2015, is: “Always profile. Don’t guess where your bottlenecks are but gather hard numbers first.”

Now that is slightly more exciting! (And the golden rule is still as sound as ever!)

## Agent Clusters

Now we know that agents can be modelled as graphs under the hood. From the outside, however, they are just a simple, async call to the `invoke()` method. We also know that every node in a graph is just an async function, so... a node in a graph could be an entire agent itself! It’s nested graphs. How wild.

That is what agent clusters and swarms are. In fact, there are a plethora of multi-agent architectures, and the LangGraph docs [list a couple of them](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/#multi-agent-architectures) and how to build them using LangGraph. In general, the LangGraphJS docs are pretty disappointing when it comes to documenting the actual JS API, but contain loads of insight and examples for architectures.

## A coding cluster

For example, we could imagine a small cluster of agents that implement web apps for you!

<figure>
  <img src="coder.svg" style="max-height: 50vh">
  <figcaption>A coding cluster I made up out of thin air. It is probably not good.</figcaption>
</figure>
<script language="mermaid" style="display: none;">
graph TD;
    subgraph planning
      direction LR
      Start -->|User prompt| Planner;
      Planner -->|Implementation Plan| StepExtractor;
    end
    subgraph execution
      direction LR
      %% StepExtractor -->|Implementation Plan + Total number of steps| Coder;
      Coder -->|Implemention of Step N| QA;
      QA -->|Next step| Coder;
      QA -->|Current step has errors| Coder;
      QA -->|No more steps| End;
    end
    planning -- Implementation Plan + Total number of steps -->  execution;
    classDef nobg fill:transparent,stroke:#0a3144,color:transparent;
    class planning nobg;
    class execution nobg;
</script>

I am not saying this is a _good_ architecture by any means. But you should look at this and feel like you’d be able to implement this now!


[LangChain]: https://www.langchain.com/
[LangGraph]: https://www.langchain.com/langgraph
[langchain.js]: https://js.langchain.com/docs/introduction/
[langgraph.js]: https://langchain-ai.github.io/langgraphjs/
[Ollama]: https://ollama.com/
[zod]: https://zod.dev/
[mcp]: https://modelcontextprotocol.io/
[PureData]: https://puredata.info/
[DaVinci Resolve]: https://www.blackmagicdesign.com/uk/products/davinciresolve
[Node Red]: https://nodered.org/
[Llama 3.1]: https://huggingface.co/meta-llama/Llama-3.1-8B
[dag]: https://en.wikipedia.org/wiki/Directed_acyclic_graph
