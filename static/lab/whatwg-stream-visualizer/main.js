import { render, html } from "lit-html";
import { until } from "lit-html/directives/until.js";

const strategy = {
  size(chunk) {
    return chunk;
  },
  highWaterMark: 10
};

const logStream = new TransformStream();
function log(stream, msg) {
  const w = logStream.writable.getWriter();
  w.write({ stream, msg });
  w.releaseLock();
}

self.rs1 = externalizedReadableStream("A");
self.ts1 = externalizedTransformStream("B");
self.ws1 = externalizedWritableStream("C");
rs1.stream
  .pipeThrough(pipeStream("pipe1"))
  .pipeThrough(ts1.stream)
  .pipeThrough(pipeStream("pipe2"))
  .pipeTo(ws1.stream);

function raf() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

function nextEvent(el, name) {
  return new Promise(resolve =>
    el.addEventListener(name, resolve, { once: true })
  );
}

function pipeStream(name) {
  return new TransformStream({
    transform(chunk, controller) {
      (async function() {
        const el = document.getElementById(name);
        const elRect = el.getBoundingClientRect();
        const msg = document.createElement("div");
        msg.classList.add("message");
        msg.textContent = `${chunk}`;
        el.appendChild(msg);
        await raf();
        await raf();
        msg.style.transform = `translateX(calc(-${
          elRect.width
        }px + var(--pipe-size)))`;
        await nextEvent(msg, "transitionend");
        msg.remove();
        controller.enqueue(chunk);
      })();
    }
  });
}

function externalizedPromise() {
  let resolve, reject;
  const promise = new Promise((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });
  return { promise, resolve, reject };
}

function externalizedReadableStream(name) {
  const startPromise = externalizedPromise();
  const cancelCalledPromise = externalizedPromise();
  const cancelReturnPromise = externalizedPromise();
  const externalizedStream = {
    name,
    startPromise,
    cancelCalledPromise,
    cancelReturnPromise,
    pullPromise: null
  };
  externalizedStream.stream = new ReadableStream(
    {
      start(controller_) {
        log(externalizedStream, `Underlying source entered start()`);
        externalizedStream.controller = controller_;
        return startPromise.promise.then(() =>
          log(externalizedStream, `Underlying source finished start()`)
        );
      },
      pull() {
        log(externalizedStream, `Underlying source entered pull()`);
        externalizedStream.pullPromise = externalizedPromise();
        return externalizedStream.pullPromise.promise.then(() => {
          externalizedStream.pullPromise = null;
          log(externalizedStream, `Underlying source finished pull()`);
        });
      },
      cancel(reason) {
        log(
          externalizedStream,
          `Underlying source entered cancel() with reason ${reason}`
        );
        cancelCalledPromise.resolve(reason);
        return cancelReturnPromise.promise.then(() =>
          log(externalizedStream, `Underlying source finished cancel()`)
        );
      }
    },
    strategy
  );
  return externalizedStream;
}

function externalizedWritableStream(name) {
  const startPromise = externalizedPromise();
  const closeCalledPromise = externalizedPromise();
  const closeReturnPromise = externalizedPromise();
  const abortCalledPromise = externalizedPromise();
  const abortReturnPromise = externalizedPromise();
  const externalizedStream = {
    name,
    startPromise,
    closeCalledPromise,
    closeReturnPromise,
    abortCalledPromise,
    abortReturnPromise,
    writePromise: null,
    autoReturn: false
  };
  externalizedStream.stream = new WritableStream(
    {
      start(controller_) {
        log(externalizedStream, `Underlying source entered start()`);
        externalizedStream.controller = controller_;
        return startPromise.promise.then(() =>
          log(externalizedStream, `Underlying source finished start()`)
        );
      },
      write(chunk) {
        log(
          externalizedStream,
          `Underlying source entered write() for a chunk of size ${chunk}`
        );
        let p = Promise.resolve();
        if (!externalizedStream.autoReturn) {
          externalizedStream.writePromise = externalizedPromise();
          p = externalizedStream.writePromise.promise;
        }
        return p.then(() => {
          externalizedStream.writePromise = null;
          log(externalizedStream, `Underlying source finished write()`);
        });
      },
      close() {
        log(externalizedStream, `Underlying source entered close()`);
        closeCalledPromise.resolve();
        return closeReturnPromise.promise.then(() =>
          log(externalizedStream, `Underlying source finished close()`)
        );
      },
      abort(reason) {
        log(
          externalizedStream,
          `Underlying source entered abort() with reason "${reason}"`
        );
        abortCalledPromise.resolve(reason);
        return abortReturnPromise.promise.then(() =>
          log(externalizedStream, `Underlying source finished abort()`)
        );
      }
    },
    strategy
  );
  return externalizedStream;
}

function externalizedTransformStream(name) {
  const startPromise = externalizedPromise();
  const flushCalledPromise = externalizedPromise();
  const flushReturnPromise = externalizedPromise();
  const externalizedStream = {
    name,
    startPromise,
    flushCalledPromise,
    flushReturnPromise,
    transformPromise: null,
    autoReturn: false
  };
  externalizedStream.stream = new TransformStream(
    {
      start(controller_) {
        log(externalizedStream, `Underlying source entered start()`);
        externalizedStream.controller = controller_;
        return startPromise.promise.then(() =>
          log(externalizedStream, `Underlying source finished start()`)
        );
      },
      transform(chunk) {
        log(
          externalizedStream,
          `Underlying source entered transform() for a chunk of size ${chunk}`
        );
        let p = Promise.resolve();
        if (!externalizedStream.autoReturn) {
          externalizedStream.transformPromise = externalizedPromise();
          p = externalizedStream.transformPromise.promise;
        }
        return p.then(() => {
          log(
            externalizedStream,
            `Underlying source forwarded chunk of size ${chunk}`
          );
          externalizedStream.controller.enqueue(chunk);
          externalizedStream.transformPromise = null;
          log(externalizedStream, `Underlying source finished transform()`);
        });
      },
      flush() {
        log(externalizedStream, `Underlying source entered flush()`);
        flushCalledPromise.resolve();
        return flushReturnPromise.promise.then(() =>
          log(externalizedStream, `Underlying source finished flush()`)
        );
      }
    },
    strategy,
    strategy
  );
  return externalizedStream;
}

function renderReadableStream(rs) {
  return html`
    <div class="region">
      <div class="code">
        new ReadableStream({
        <div
          class="codeblock ${until(
            rs.startPromise.promise.then(() => "inactive"),
            "active"
          )}"
        >
          start() {
          <button
            ?disabled=${until(rs.startPromise.promise.then(() => true), false)}
            @click=${() => {
              rs.startPromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          }
        </div>
        <div class="codeblock ${rs.pullPromise ? "active" : "inactive"}">
          pull() {
          <button
            ?disabled=${!rs.pullPromise}
            @click=${() => {
              rs.pullPromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          }
        </div>
        <div
          class="codeblock ${until(
            rs.cancelReturnPromise.promise.then(() => "inactive"),
            rs.cancelCalledPromise.promise.then(() => "active"),
            "inactive"
          )}"
        >
          cancel() {
          <button
            ?disabled=${until(
              rs.cancelReturnPromise.promise.then(() => true),
              rs.cancelCalledPromise.promise.then(() => false),
              true
            )}
            @click=${() => {
              rs.cancelReturnPromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          }
        </div>
        }, {
        <div class="codeblock">
          highWaterMark: 10
        </div>
        })
      </div>
      <fieldset class="stream">
        <legend>Controller</legend>
        <p>desiredSize = ${rs.controller.desiredSize}</p>
        <p>
          <button
            @click=${ev => {
              const chunkSize = ev.target.parentNode.querySelector("input")
                .value;
              log(
                rs,
                `Enqueued a chunk of size ${chunkSize}, desiredSize was ${
                  rs.controller.desiredSize
                }`
              );
              rs.controller.enqueue(chunkSize);
              rerender();
            }}
          >
            enqueue()
          </button>
          <label>
            with size:
            <input type="number" min="0" value="1" step="1" />
          </label>
        </p>
        <button
          @click=${() => {
            rs.controller.close();
            rerender();
          }}
        >
          close()
        </button>
        <button
          @click=${() => {
            rs.controller.error("myError");
            rerender();
          }}
        >
          error("myError")
        </button>
      </fieldset>
    </div>
  `;
}

function renderWritableStream(ws) {
  return html`
    <div class="region">
      <div class="code">
        .pipeTo(new WritableStream({
        <div
          class="codeblock ${until(
            ws.startPromise.promise.then(() => "inactive"),
            "active"
          )}"
        >
          start() {
          <button
            ?disabled=${until(ws.startPromise.promise.then(() => true), false)}
            @click=${() => {
              ws.startPromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          }
        </div>
        <div class="codeblock ${ws.writePromise ? "active" : "inactive"}">
          write() {
          <button
            ?disabled=${!ws.writePromise}
            @click=${() => {
              ws.writePromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          }
        </div>
        <div
          class="codeblock ${until(
            ws.abortReturnPromise.promise.then(() => "inactive"),
            ws.abortCalledPromise.promise.then(() => "active"),
            "inactive"
          )}"
        >
          abort() {
          <button
            ?disabled=${until(
              ws.abortReturnPromise.promise.then(() => true),
              ws.abortCalledPromise.promise.then(() => false),
              true
            )}
            @click=${() => {
              ws.abortReturnPromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          },
        </div>
        <div
          class="codeblock ${until(
            ws.closeReturnPromise.promise.then(() => "inactive"),
            ws.closeCalledPromise.promise.then(() => "active"),
            "inactive"
          )}"
        >
          close() {
          <button
            ?disabled=${until(
              ws.closeReturnPromise.promise.then(() => true),
              ws.closeCalledPromise.promise.then(() => false),
              true
            )}
            @click=${() => {
              ws.closeReturnPromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          }
        </div>
        }, {
        <div class="codeblock">
          highWaterMark: 10
        </div>
        }))
      </div>
      <fieldset class="stream">
        <legend>Controller</legend>
        <p>
          <label>
            <input
              type="checkbox"
              @click=${() => (ws.autoReturn = !ws.autoReturn)}
              ?checked=${ws.autoReturn}
            />Auto-return from write()
          </label>
        </p>
        <button
          @click=${() => {
            ws.controller.error("myError");
            rerender();
          }}
        >
          error("myError")
        </button>
      </fieldset>
    </div>
  `;
}

function renderTransformStream(ts) {
  return html`
      <div class="region">
        <div class="code">
          .pipeThrough(new TransformStream({
          <div
            class="codeblock ${until(
              ts.startPromise.promise.then(() => "inactive"),
              "active"
            )}"
          >
            start() {
            <button
              ?disabled=${until(
                ts.startPromise.promise.then(() => true),
                false
              )}
              @click=${() => {
                ts.startPromise.resolve();
                rerender();
              }}
            >
              return;
            </button>
            },
          </div>
          <div class="codeblock ${ts.transformPromise ? "active" : "inactive"}">
          transform() {
          <button
            ?disabled=${!ts.transformPromise}
            @click=${() => {
              ts.transformPromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          },
        </div>
        <div
          class="codeblock ${until(
            ts.flushReturnPromise.promise.then(() => "inactive"),
            ts.flushCalledPromise.promise.then(() => "active"),
            "inactive"
          )}"
        >
          flush() {
          <button
            ?disabled=${until(
              ts.flushReturnPromise.promise.then(() => true),
              ts.flushCalledPromise.promise.then(() => false),
              true
            )}
            @click=${() => {
              ts.flushReturnPromise.resolve();
              rerender();
            }}
          >
            return;
          </button>
          }
        </div>
        }, {
          <div class="codeblock">
          highWaterMark: 10
        </div>
        }, {
          <div class="codeblock">
          highWaterMark: 10
        </div>
        }))
      </div>
      <fieldset class="stream">
        <legend>Controller</legend>
        <p>desiredSize = ${ts.controller.desiredSize}</p>
        <button
          @click=${ev => {
            const chunkSize = ev.target.parentNode.querySelector("input").value;
            log(
              ts,
              `Enqueued a chunk of size ${chunkSize}, desiredSize was ${
                ts.controller.desiredSize
              }`
            );
            ts.controller.enqueue(chunkSize);
            rerender();
          }}
        >
          enqueue()
        </button>
        <label>
            with size:
            <input type="number" min="0" value="1" step="1" />
          </label>
        </p>
        <p>
          <label>
            <input
              type="checkbox"
              @click=${() => (ts.autoReturn = !ts.autoReturn)}
              ?checked=${ts.autoReturn}
            />Auto-return from transform()
          </label>
        </p>
        <button
          @click=${() => {
            ts.controller.terminate();
            rerender();
          }}
        >
          terminate()
        </button>
        <button
          @click=${() => {
            ts.controller.error("myError");
            rerender();
          }}
        >
          error("myError")
        </button>
      </fieldset>
    </div>
  `;
}

function rerender() {
  render(
    html`
      ${renderReadableStream(rs1)}
      <div class="pipe" id="pipe1"></div>
      ${renderTransformStream(ts1)}
      <div class="pipe" id="pipe2"></div>
      ${renderWritableStream(ws1)}
    `,
    document.body.querySelector("main")
  );
}

async function logLoop() {
  const reader = logStream.readable.getReader();
  const log = document.all.log;
  while (true) {
    const {
      value: { stream, msg },
      done
    } = await reader.read();
    if (done) {
      return;
    }
    log.innerHTML = `Stream "${stream.name}": ${msg}\n` + log.innerHTML;
    rerender();
  }
}

logLoop();
rerender();
