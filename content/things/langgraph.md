---

title: "LangGraph Quickstart"
date: "2025-06-16"
socialmediaimage: "social.jpeg"
live: true

---

LangGraph lets you build complex workflow architectures and codify them into powerful automations. Also LLMs, if you want. But you don’t have to!

<!-- more -->

## LLM Architecture

I always liked the idea of running LLMs locally, rather than spending money for an LLM provider off-site. Especially if we imagine a future where the OS or the browser provide LLM models, it becomes increasingly important to be able to build robust workflows on top of an unknown LLM.

Smaller LLMs struggle with ambiguity and with larger tasks, so it becomes important to break the task into smaller, well-scope subtasks. Effectively, you have to start orchestrating multiple LLMs, which is a pattern that is also becoming more popular with large LLMs under the topic of clusters and swarms. This not only allow you to have different LLMs with different specializations, but also to run multiple inference steps in parallel or even mix and match different models, if you have multiple at your disposal. These models can validate each others’ work, give feedback or have access to different tools. In some cases, distributing your task across multiple LLMS can also get you to the final result _quicker_, although that aspect is admittedly a bit more hit and miss.

But how do you build such an orchestration of LLMs? There are multiple options out there, and I have no skin in the game of declaring any one of them superior. If you google for “Agent framework”, you will find an oceas of options. This blog post, however, focuses on [LangGraph], from the same makers of [LangChain], one of the bedrock libraries in the LLM space. They are excellent Python libraries and have a flourishing ecosystem out there.

As it turns out, they have also published [langchain.js] and [langgraph.js] to cater to the JS audience, and while their API documentation leaves some things to be (strongly) desired, I do enjoy the layering of LangGraph and found it quite intuitive to build more complex architectures with.

## LangChain

LangChain has been around for ages and is originally a Python library that lets you _chain_ operations on LLMs. As the name somewhat implies, you can build DAGs through which data flows and is processed by LLM-drived nodes. There are a lot of utilities and helpers in LangChain, but we actually won’t be using most of them. In this instance, LangChain mostly provides one thing for us: A uniform way to interact with an LLM regardless of the provider.

### Basic Chat Completion

For running LLMs locally, I tend to use [Ollama]. 
```typescript
import { ChatOllama } from "@langchain/ollama";

const llm = new ChatOllama({
    baseUrl: "http://localhost:11434/",
    model: "llama3.1:8b"
});
```

For the other, typical LLM providers (OpenAI, Anthropic, Google Vertex AI, AWS Bedrock, etc), they have their own LangChain package!
```ts
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({
    model: "claude-3-7-sonnet-latest",
    apiKey: "..."
});
```

No matter which package you used, the resulting `llm` instance will provide an `invoke()` method to create a chat completion. This is not groundbreaking, of course, but it is nice to have a uniform API regardless of LLM provider. Let’s make sure it works:


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

Often, the tasks we give to LLMs require the LLM to give us a specific answer. In the examplea above we requested an answer and an explanation. However, by default, we just get a blob of prose and we have to figure out ourselves how we extract the bits of information that we are interested in. While _some_ LLMs now have the ability to provide “structured” responses — sometimes also called JSON mode — not all of them do. Again, LangChain tries to level things out here for us. If the model has support for structured responses, it will utilize this ability. If not, it will try and “polyfill”. It does this by piping the prose answer through the LLM a 2nd time and requesting it to reformat the answer as JSON. No matter which path has been taken, since we have defined our expected schema, for example with [zod], it will validate that the answer conforms to this schema before returning it to us.


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

### Tools

Tools is the feature formerly known as “functions”. An LLM that supports tools can be given a list of function signatures (including parameter types and descriptions), along with the user’s message. If it seems correct to the LLM, instead of responding with text, it will respond with a special message indicating which of the provided tools should be called and what the parameters should be.

The ability to call tools hugely increases the utility that LLMs provide. With the somewhat recent introduction and de-facto standardization of the
[Model Context Protocol][mcp] and the resulting ecosystem of MCP servers, being able to utilize tools with LLMs is essential. LangChain provides a convenient function to expose any arbitrary asynchronous functions as a tool, using zod to both define and validate the schema of the function parameters.

For example, here I define a tool called `webfetch` allows agents to download and read web content. Ideally we’d pipe the HTML through [Jina AI’s Reader-LM](https://huggingface.com/jinaai/readerlm-v2) to turn it into Markdown, but this article was already getting out of hand.


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
    time: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-everything"],
      transport: "stdio",
    },
  },
});

const mcpTools = await mcps.getTools();
```

For a LangChain LLM instance to be able to invoke a tool, they have to be “bound” to the LLM. 


```typescript
const llm_with_webfetch = llm.bindTools([webfetch]);
const result = await llm_with_webfetch.invoke(
  "What is my IP? You can find it on https://jsonip.com"
);
```

```js
{
  content: "",
  tool_calls: [
    {
      name: "webfetch",
      args: { url: "https://jsonip.com" },
      ...
    }
  ]
}
```

Great! It works! The LLM clearly has access to the tool and decided that it is useful for the task at hand. However, the LLM can only tell us that it wants to invoke a tool. We have to write the logic for the actual invocation ourselves. That means we have to analyze the LLMs response to detect that it is a tool invocation, figure out which tool is being invoked (there may be multiple!), we have to then manually invoke the tool, capture the return value of the tool and then invoke the LLM again, passing along the tool’s result to allow the LLM to process it. Quite tedious.

It seems intuitive that what should happen here is that the tools that the LLM wants to invoke actually get invoked automatically and the LLM gets fed the response. In fact, what happens quite often is that the LLM will invoke a tool, and that the response with prompt the LLM to invoke yet another tool. And this can keep going until the user’s request has been fulfilled. The number of steps that are required is not clear and inherently depends on the complexity of the request.

What we are working towards here is an “agent”. An agent is an LLM with an identity (read: system prompt) and access to a bunch of tools. It ill keep going in circles between invoking the LLM and invoking a tool until a stop condition is met (typically until the LLM is no longer wanting to invoke tools).

The problem is that this is cyclic (LLM -> Tools -> LLM -> Tools -> ...) and as such LangChain’s DAG-based architecture cannot model this approach. Enter LangGraph!

## LangGraph

LangGraph is a graph library from the same folks as LangChain and therefore is LangChain-aware. However, at it’s core, LangGraph is a standalone graph library. So let’s put all the LLM shenanigans to one side for a moment and just build some nice little graphs!

Graphs, in the mathematical sense, are nodes which are connected by edges. In LangGraph, a graph has a state object (whose schema is defined using Zod) that gets passed to the active node to work on. The active node can manipulate the data in the state object. While there is only a single start node, LangGraph is able to take multiple edges for the active node at once, making multiple nodes become active in ~parallel.

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

The thing that LangChain could not do is loop. So let’s make sure that LangGraph actually solves this. Just like in coding, loops need to have a break condition, and for that LangGraph has the concept of conditional edges. Conditional edges are inserted similarly to normal edges. Instead of the target node, the second argument is a function that take the graph state and returns a value. The third argument is a map that maps the function’s return value to the target node’s name.


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

```mermaid
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
	classDef first fill-opacity:0;
	classDef last fill:#bfb6fc;
````
  
### Parallelism

Parallelism seems almost out of scope for a fundamental introduction like this, but I decided to include it because it explains an important design decision in the graph’s state object.

A node is allowed to have multiple (even conditional!) edges to other nodes. If multiple edges are taken, the target nodes execute in ~parallel (afaict, langchain.js is only concurrent, not truly parallel, although their architecture is base on message-passing, so true parallelism is absolutely feasible). Like I mentioned before, a node returns the _updates_ it wants to make to the state object. So when multiple nodes are active, their return values will get merged into the state object for the next group of active nodes. As long as each node works on a different part of the state object, that will work fine just as before!


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
await graph.invoke({});
```




    { node_a_done: [33mtrue[39m, node_b_done: [33mtrue[39m }




```typescript
await renderGraph(graph);
```




    
![jpeg](output_30_0.jpg)
    



# Reducers
But what if node A and node B in the above example were to write to the _same_ property in the state object? 

Without any further changes, that would just be race-y. Which is bad. To handle that, state properties can define “reducers” to specify how a new value for a property should be reconciled with the previous existing value.

The canonical example is that if a property in the state object is a list, new values should get appended and not overwrite the whole list:


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
  .addNode("add_a", async () => {
    return { items: "item 1" };
  })
  .addNode("add_b", async () => {
    return { items: "item 2" };
  })
  .addEdge(START, "add_a")
  .addEdge(START, "add_b")
  .addEdge("add_a", END)
  .addEdge("add_b", END);

const graph = graphBuilder.compile();
await graph.invoke({});
```




    { items: [ [32m"item 1"[39m, [32m"item 2"[39m ] }



Each node returned a value on the same property, but the resulting state object contains both of them. Hurrah.

## Agents

Clearly we can build cyclic workflows now thanks to LangGraph. So time to go back to our LLM use-case and take another stab at Agents! We could build our own cyclic graph to model the back-and-forth between LLM invocation and tool invocation (and sometimes that can be useful!). Lucky for us, however, this is such a common pattern that LangGraph has it ready to go!

Let’s try our simple fetch tool from earlier, but this time we are giving it to an ReAct agent! (ReAct meaning “Reasoning and Act” as introduced by the [original paper](https://arxiv.org/abs/2210.03629), got nothing to do with Facebook’s React).


```typescript
import { createReactAgent } from "npm:@langchain/langgraph/prebuilt";

const agent = createReactAgent({
  llm: models.gemini25flash,
  tools: [webfetch],
  prompt:
    "You are a helpful assistant that uses the tools to fulfill the user's query.",
});
```


```typescript
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "What is my IP? You can find it on https://jsonip.com",
    },
  ],
});
```


```typescript
import { showChat } from "./utils.ts";

showChat(result)
```




        <details open>
            <summary>👤 User</summary>
            <blockquote><p>What is my IP? You can find it on https://jsonip.com</p>
</blockquote>

        </details>
        <details >
            <summary>🛠️ Tool (<code>webfetch</code>)</summary>

                                <ul>
                                                        <li>
                                    <pre style="padding: .3em; border-bottom: 1px solid oklch(0.950 0.182 146)">webfetch({
  "url": "https://jsonip.com"
})</pre>
                                    <pre style="padding: .3em;">{&quot;ip&quot;:&quot;209.35.66.240&quot;}</pre>
                                </li>
                    </ul>
        </details>
        <details open>
            <summary>🤖 Assistant</summary>
            <blockquote><p>Your IP address is 209.35.66.240.</p>
</blockquote>

        </details>



Okay, pretty good. But if this really is a proper agent, it should also handle multiple roundtrips, which this prompt didn’t really test. Let’s try something slightly more complex:


```typescript
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        `Go to https://surma.dev, find the very first blog post ever published, and give me the "golden rule" it mentions.`,
    },
  ],
});
```


```typescript
showChat(result)
```




        <details open>
            <summary>👤 User</summary>
            <blockquote><p>Go to https://surma.dev, find the very first blog post ever published, and give me the &quot;golden rule&quot; it mentions.</p>
</blockquote>

        </details>
        <details >
            <summary>🛠️ Tool (<code>webfetch</code>)</summary>

                                <ul>
                                                        <li>
                                    <pre style="padding: .3em; border-bottom: 1px solid oklch(0.950 0.182 146)">webfetch({
  "url": "https://surma.dev"
})</pre>
                                    <pre style="padding: .3em;">&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;head&gt;&lt;meta charset=&quot;utf-8&quot;&gt;
&lt;meta name=&quot;viewport&quot; content=&quot;minimum-scale=1, width=device-width&quot;&gt;
&lt;meta name=&quot;theme-color&quot; content=&quot;#f7f0c2&quot;&gt;
&lt;meta property=&quot;og:url&quot; content=&quot;https://surma.dev/&quot;&gt;

&lt;meta property=&quot;og:title&quot; conten
[...]
or.sendBeacon(
        &quot;https://google-analytics.com/collect&quot;,
        new URLSearchParams({
          ...this.data,
          ...additionalParams,
        }).toString()
      );
    },
  };
  _ga.send({ t: &quot;pageview&quot; });
&lt;/script&gt;




&lt;/body&gt;&lt;/html&gt;</pre>
                                </li>
                    </ul>
        </details>
        <details >
            <summary>🛠️ Tool (<code>webfetch</code>)</summary>

                                <ul>
                                                        <li>
                                    <pre style="padding: .3em; border-bottom: 1px solid oklch(0.950 0.182 146)">webfetch({
  "url": "https://surma.dev/things/"
})</pre>
                                    <pre style="padding: .3em;">&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;head&gt;&lt;meta charset=&quot;utf-8&quot;&gt;
&lt;meta name=&quot;viewport&quot; content=&quot;minimum-scale=1, width=device-width&quot;&gt;
&lt;meta name=&quot;theme-color&quot; content=&quot;#f7f0c2&quot;&gt;
&lt;meta property=&quot;og:url&quot; content=&quot;https://surma.dev/&quot;&gt;

&lt;meta property=&quot;og:title&quot; conten
[...]
or.sendBeacon(
        &quot;https://google-analytics.com/collect&quot;,
        new URLSearchParams({
          ...this.data,
          ...additionalParams,
        }).toString()
      );
    },
  };
  _ga.send({ t: &quot;pageview&quot; });
&lt;/script&gt;




&lt;/body&gt;&lt;/html&gt;</pre>
                                </li>
                    </ul>
        </details>
        <details >
            <summary>🛠️ Tool (<code>webfetch</code>)</summary>

                                <ul>
                                                        <li>
                                    <pre style="padding: .3em; border-bottom: 1px solid oklch(0.950 0.182 146)">webfetch({
  "url": "https://surma.dev/things/maelstromgaming/"
})</pre>
                                    <pre style="padding: .3em;">&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;head&gt;&lt;meta charset=&quot;utf-8&quot;&gt;
&lt;meta name=&quot;viewport&quot; content=&quot;minimum-scale=1, width=device-width&quot;&gt;
&lt;meta name=&quot;theme-color&quot; content=&quot;#f7f0c2&quot;&gt;
&lt;meta property=&quot;og:url&quot; content=&quot;https://surma.dev/&quot;&gt;

&lt;meta property=&quot;og:title&quot; conten
[...]
or.sendBeacon(
        &quot;https://google-analytics.com/collect&quot;,
        new URLSearchParams({
          ...this.data,
          ...additionalParams,
        }).toString()
      );
    },
  };
  _ga.send({ t: &quot;pageview&quot; });
&lt;/script&gt;




&lt;/body&gt;&lt;/html&gt;</pre>
                                </li>
                    </ul>
        </details>
        <details open>
            <summary>🤖 Assistant</summary>
            <blockquote><p>The &quot;golden rule&quot; mentioned in the very first blog post on surma.dev, titled &quot;Maelstrom Gaming and 12 fps&quot; and published on November 11, 2015, is: &quot;Always profile. Don’t guess where your bottlenecks are but gather hard numbers first.&quot;</p>
</blockquote>

        </details>



Pretty exciting!

# Agent Clusters

Agents are graphs under the hood, but from the outside they are just a simple, async `invoke()` function call. Every node in a graph is just an async function, so... a node in a graph could be an entire agent itself! It’s nested graphs. How wild.

That is what agent clusters and swarms are. In fact, there are a plethora of multi-agent architectures, and the LangGraph docs [list a couple of them](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/#multi-agent-architectures) and how to build them using LangGraph. In general, the LangGraph docs are pretty disappointing when it comes to documenting the actual JS API, but contain loads of insight and examples for architecture.

# Example

Let’s build a small agent cluster that builds a web app incrementally for us!

I’m imagining the architecture to work like this:

```
graph LR;

    Start -->|User prompt| Planner;
    Planner -->|Implementation Plan| StepExtractor;
    StepExtractor -->|Implementation Plan + Total number of steps| Coder;
    Coder -->|Implemention of Step N| QA;
    QA -->|There are more steps!| Coder;
    QA -->|No more steps| End;
```

(I am not saying this is a _good_ architecture. But something that isn’t trivial but also not overly complex to fit in a notebook.)

## Planner

The first agent is the planner. Its job is to take a potentially messy, vague request for a web app and transform it into a detailled step-by-step implementation plan that the next agent can execute on. To address potential vagueness, we’ll give the planner access to a tool to ask clarifying questions.


```typescript
const askQuestion = tool(
  async ({ question }) => {
    return prompt(question);
  },
  {
    name: "ask_question",
    description:
      "Ask the user a question and get their response.",
    schema: z.object({
      url: z
        .string()
        .url()
        .describe(
          "The question to ask the user."
        ),
    }),
  }
);
```


```typescript
const plannerAgent = createReactAgent({
  llm: models.gemini25flash,
  tools: [askQuestion],
  prompt: `
    You are a world leading software architect, specializing in high-performance, accessible and efficiently loading web apps. 

    Rather than building web apps yourself, you *plan* how a web app should be built and write up a detailed description for others, including other LLMs, to execute on.
    
    # Task
    - Plan the architecture of the app. The architecture should enforce separation of concerns and allow future iterations of the app to happen easily and quickly. 
    - Prescribe library and technology choices. Use your extended knowledge to make informed and future-proof decisions on what libraries and dependencies should be used when the app is built.
    - Be structured and provide a sequencing how the app should be built. Each step is small but tangible step towards the goal, ideally testable.
    - The steps should be numbered sequentially, so that a sentence like “Implement step 12 of the plan” is unambiguous.
    - Don't do coding. The coding is for others to do. You may provide snippets and examples, but avoid doing a whole implementation as part of the planning.
    - If there is ambiguity that you cannot resolve yourself using your experience, you can use the \`askQuestion\` tool. IMPORTANT: Use this tool sparingly. It is disruptive to the user.

    # Guidelines
    - Respect the users wishes, but if they don’t specify any preferences, use Preact, Tailwind, vite and TypeScript.
    - Do not plan to create a sub folder for the app. The instructions should assume that you are locked into the current working directory.
  `,
});
```

For the coder loop later in our architecture, it is important to know how many steps our implementation plan has. I tried to use a structured response on the `plannerAgent` to get this number straight from the horse’s mouth.

```js
const responseFormat = z.object({
    plan: z.string().describe("The implementation plan for the app in markdown format"),
    numSteps: z.number().describe("The number of steps in the implementation plan")
});

const plannerAgent = createReactAgent({
  llm: models.gemini25flash,
  responseFormat,
  // ...
});
```

However, it seems that the massive size of the `plan` value often leads to invalid JSON being generated and making the generation fail. So instead, I decided to manually extract the plan and use a separate LLM invocation to extract the number of steps:


```typescript
const stepCountResponse = z.object({
    numSteps: z.number().describe("The number of steps in the implementation plan")
});
const stepCounter = models.gemini25flash.withStructuredOutput(stepCountResponse);

const plannerNode = async(state) => {
    const result = await plannerAgent.invoke({
        messages: [
            {
                role: "user",
                content: state.prompt
            }
        ]
    });
    const plan = result.messages.at(-1).content;
    const {numSteps} = (await stepCounter.invoke(`
        Look at the following implementation plan and tell me how many implementation steps it prescribes.

        ==========

        ${plan}
    `));

    return {plan, numSteps, currentStep: 1};
};
```

Not pretty, but functional!

## Coder

The coder does the coding, duh. While we could try and keep the file all in memory, it is best in my experience to give the LLM access to a real filesystem so that real tools can operate on them.

We could write our own set of tools to create, delete and modify files and directories, but this is a great opportunity to just use the [off-the-shelf filesystem MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem). 


```typescript
import { ensureDir } from "jsr:@std/fs";

const workDir = Deno.cwd() + "/wd";
await ensureDir(workDir);

const mcps = new MultiServerMCPClient({
  mcpServers: {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", workDir],
      transport: "stdio",
    },
  },
});

const mcpTools = await mcps.getTools();
```

Now for the real tools working on real files: The agent will have to be able to actually run `npm install` and other commands. This is obviously pretty dangerous. Ideally I’d be limiting the blast radius of these operations using `sandbox-exec` or docker or similar. But I can’t be bothered to test all that. So for a minimum of security, we’ll prompt the user to confirm any command before it gets executed and cache all commands that have been approved.


```typescript
async function runCommand(...command) {
  const cmd = new Deno.Command(command[0], {
    args: command.slice(1),
    cwd: workDir
  });
  const { success, stdout, stderr } = await cmd.output();
  const report = `
${success ? "The command ran successfully" : "The command failed"}
=== STDOUT ===
${new TextDecoder().decode(stdout)}
=== STDERR ===
${new TextDecoder().decode(stderr)}
`;
  return { success, report };
}

const approvedCommands = new Set();
const executeTool = tool(
  async ({ command }) => {
    const commandId = command.join("!/:");
    const isPreApproved = approvedCommands.has(commandId);
    if (!isPreApproved && !confirm(`Coder wants to run "${command.join(" ")}". Allow?`)) {
      return "The user denied running this command.";
    }
    approvedCommands.add(commandId);
    const result = await runCommand(...command);
    return result.report;
  },
  {
    name: "execute",
    description: "Execute a command in the working directory.",
    schema: z.object({
      command: z
        .string()
        .array()
        .describe(
          `The command and all the arguments to execute. For example \`{command: ["ls", "-l"]}\``
        ),
    }),
  }
);
```

Lastly, I want a dedicated build tool. We could leave it up to the agent to invoke `vite build` or `npm run build` or whatever, but can give rise to a problem where the agent changes the build command just to then pretend that the build was successful. Instead we’ll have a pre-defined build tool that enforces a minimum of compliance. In this case, we expect there to be no TypeScript errors and that `vite` builds the web app successfully.


```typescript
async function buildToolFunction() {
    const tscResult = await runCommand(
      "npx",
      "-y",
      "-p",
      "typescript",
      "tsc",
      "-p",
      ".",
      "--noEmit"
    );
    if (!tscResult.success) return tscResult;
    const viteResult = await runCommand("npx", "-y", "vite", "build");
    return viteResult;
}

const buildTool = tool(
  async ({}) => {
    const result = await buildToolFunction();
    return result.report;
  },
  {
    name: "build",
    description: "Run a type check and then build the web app using vite.",
    schema: z.object({}),
  }
);
```

Now we can combine all the tools from the filesystem MCP server and our two custom tools to with a corresponding prompt to form the Coder agent.


```typescript
const coderAgent = createReactAgent({
  llm: models.claude4,
  tools: [...mcpTools, buildTool, executeTool],
  prompt: `
    You are a world leading web developer. You are an expert on the web platform and you know HTML5, JavaScript, TypeScript and CSS like nobody else.
    
    You will be given a detailed implementation plan for a web app. It will be given to you through <plan> tags.
    IMPORTANT: Carefully read it from start to finish before doing anything.
    
    # Instructions
    - Your job is to complete a SINGLE STEP of the plan. Use your experience to make the best possible decisions!
    - IMPORTANT: Do NOT do work from any other step! Focus on the current step of the plan only. You should, however, read the other steps as they may inform your choices.
    - When you are done implementing the current step, use the \`build\` tool to make sure that the app builds correctly. The build tool runs a TypeScript type check and then uses vite to build the web app.
    - IMPORTANT: You MUST use \`build\` tool to finish your work. You cannot define your own build script in \`package.json\` or similar.
    - You are limited to work inside your working directory ${workDir}. Do not attempt to read or work on any files outside the working directory.
    - Use the filesystem operations to work the files in the working directory.
    - If a file already exists, you MUST read it before writing to it.
    - IMPORTANT: Do NOT start development servers. Your environment is not set up to deal with long-running commands. Just code.

    # Coding style
    - Write modular and modern JS code. Expect changes to be requested by the user in the future, so make sure you decouple concerns as much as possible.
    - Prefer small JS modules over a single large JS file.
    - Flex your design skills. The app should look like it was designed by a professional, modern designer.
  `,
});

const coderNode = async(state) => {
    const result = await coderAgent.invoke({
        messages: [
            {
                role: "user",
                content: `
                    Your task is to implement step ${state.currentStep} from the plan.

                    ${state.qaError
                        ? `
                            There are errors in your implementations of the step:
                            <report>
                            ${state.qaError}
                            </report>
                        `
                        : ""}

                    <plan>
                    ${state.plan}
                    </plan>
                `
            }
        ]
    });
    return {coderLog: result};
}
```

# QA

Like any node in our architecture, it _can_ be an agent, but it doesn’t have to be. For a QA step, it makes sense to not pay the price for non-deterministic LLM behavior and rather have good ol’ hard code check that all minimum criteria are met by whatever the previous agents have produced.

In this case, that is a successful run of our pre-defined build command. If it fails, we’ll record the error and pass it back to the coder. If it passes, we’ll increase our current step. If there are more steps, back to the coder! If not, we are done.


```typescript
const qaNode = async (state) => {
    const result = await buildToolFunction();
    if(!result.success) return {qaError: result.report};
    return {qaError: null, currentStep: state.currentStep + 1};
};

const qaRouter = (state) => {
    if(state.qaError) return "retry";
    if(state.currentStep > state.numSteps) return "done";
    return "continue";
}

const qaMapper = {
    retry: "coder",
    done: END,
    continue: "coder"
}
```


```typescript
const GraphState = z.object({
    prompt: z.string(),
    plan: z.optional(z.string()).default(() => null),
    numSteps: z.optional(z.number()).default(() => null),
    qaError: z.nullable(z.string()).default(() => null),
    currentStep: z.number().default(() => 1),
    coderLog: z.any().array().default(() => []).langgraph.reducer((list, a) => ([...list, a]))
});

const graphBuilder = new StateGraph(GraphState)
  .addNode("planner", plannerNode)
  .addNode("coder", coderNode)
  .addNode("qa", qaNode)
  .addEdge(START, "planner")
  .addEdge("planner", "coder")
  .addEdge("coder", "qa")
  .addConditionalEdges("qa", qaRouter, qaMapper);
const graph = graphBuilder.compile();
```

If that text of prose was too messy, here’s a nice graph of our resulting architecture:


```typescript
await renderGraph(graph);
```




    
![jpeg](output_62_0.jpg)
    



And now... let’s try and actually let this agent cluster build a silly web app!


```typescript
const it = await graph.stream({
    prompt: `
         I’d like to build a web app that has an empty website
         with just a single button on it. The button should
         look dark and mysterious, threatening even. Once you
         click it, it should look like the world is about to
         end and Zalgo will emerge from hell. It should be scary
    `
}, {recursionLimit: 1000, streamMode: "values"});

function renderState(state) {
    return `
# Prompt
${state.prompt}

${state.numSteps
    ? `
# Progress
Implementation step: ${state.currentStep}/${state.numSteps}
    `
    : ""}

# Last error
${state.qaError 
  ? `
${"```"}
${state.qaError}
${"```"}
  `
  : "No error"}

# Plan
${state.plan ? state.plan : "TBD"}
    `;
}

await Deno.jupyter.broadcast("display_data", {
  data: { "text/markdown": "**Invoking agent...**" },
  metadata: {},
  transient: {display_id: "status"}
});
for await(const state of it) {
    await Deno.jupyter.broadcast("update_display_data", {
      data: { "text/markdown": renderState(state) },
      metadata: {},
      transient: {display_id: "status"}
    });
}
```


```typescript

```

[LangChain]: https://www.langchain.com/
[LangGraph]: https://www.langchain.com/langgraph
[langchain.js]: https://js.langchain.com/docs/introduction/
[langgraph.js]: https://langchain-ai.github.io/langgraphjs/
[Ollama]: https://ollama.com/
[zod]: https://zod.dev/
[mcp]: https://modelcontextprotocol.io/
