---json
{
  "title": "Spawning a WASI Thread with raw WebAssembly",
  "date": "2023-02-14",
  "socialmediaimage": "social.jpg",
  "live": false
}

---

WASI is finally providing an universal API to spawn a thread from within WebAssembly.

<!-- more -->

I fiddled around with an experimental build of [wasmtime] to spawn a thread using some hand-written WebAssembly.

## Wasmtime support

Before we write WAT, we need an engine that has support for the [WASI Threads] proposal. [wasmtime] has support on `main` behind a flag, so we have to build it:

```
$ git clone --recursive https://github.com/bytecodealliance/wasmtime 
$ cd wasmtime
$ cargo install -F wasi-threads --path .
```

## A WASI module

To verify that threads are being spawned, we will print messages to stdout. Here's a minimal program that uses WASI to print messages:

```wasm
(module
	(func $fd_write (import "wasi_unstable" "fd_write")
		(param $fd i32)
		(param $iovs i32)
		(param $iovs_len i32)
		(param $nwritten i32)
		(result i32))

	(memory $mem 1)
	(export "memory" (memory $mem))

	(data
		(i32.const 1000)
		"From main thread\n\00")

	(func (export "_start")
		(call $print
			(i32.const 1000))))
```

If you are curious how `$print` works:

```wasm
(module
	;; ...
	(func $print
		(param $str_ptr i32)

		;; Store a single io vector at address 0.
		(i32.store
			(i32.const 0)
			(local.get $str_ptr))
		(i32.store
			(i32.const 4)
			(call $strlen
				(local.get $str_ptr)))
		(call $fd_write
			(i32.const 1)     ;; Stdout
			(i32.const 0)     ;; Starting address of io vectors
			(i32.const 1)     ;; Number of io vectors
			(i32.const 3000)) ;; Address where to store number of bytes written
		drop)

	(func $strlen
		(param $str_ptr i32)
		(result i32)

		(local $ctr i32)

		(local.set $ctr
			(i32.const 0))
		;; Find the terminating '\0'.
		;; while(*($str_ptr + $ctr) != 0) $ctr++;
		(block $done
			(loop $continue
				(br_if $done
					(i32.eqz
						(i32.load8_u
							(i32.add
								(local.get $str_ptr)
								(local.get $ctr)))))
				(local.set $ctr
					(i32.add
						(local.get $ctr)
						(i32.const 1)))
				(br $continue)))
		;; return $ctr;
		(local.get $ctr))
	;; ...
)
```

Compile this to wasm using [wabt]’s `wat2wasm`, and run it using `wasmtime`:

```
$ wat2wasm --debug-names program.wat -o program.wasm
$ wasmtime ./program.wasm
From main thread
```

## A WASI Threads module

Our module is WASI compatible, but not WASI Threads compatible. The WASI Threads proposal adds some additional constraints:

- The module must import a shared memory on `env.memory`. 
- The module must export a `wasi_thread_start` function with the signature `(func (param $thread_id i32) (param $arg i32))`.

|||codediff|wasm
  (module
  	;; ...  
- 	(memory $mem 1)
+ 	(memory $mem (import "env" "memory") 1 1 shared)
  	(export "memory" (memory $mem))
  
  	;; ...

+ 	(func (export "wasi_thread_start")
+ 		(param $thread_id i32)
+ 		(param $arg i32)))
|||

The fact that we are _both_ importing and re-exporting the memory is a workaround for `wasmtime`'s validation procedure. This requirement will probably go away in the future.

To compile and run this, we need to enable some flagged features in both `wasm2wat` and `wasmtime`.

```
$ wat2wasm --debug-names --enable-threads program.wat -o program.wasm
$ wasmtime run \
	--wasm-features threads \
	--wasi-modules experimental-wasi-threads \
	./program.wasm
From main thread
```

Our module is now a WASI Threads compatible. Time to spawn a thread!

## WASI Threads

The WASI Threads proposal really just provides one import called `wasi_thread_spawn` with the signature `(func (param $arg i32) (result i32))`. When called, the runtime takes care of creating a new thread, creating a new instance of the WebAssembly module using the same linear memory and calling `wasi_thread_start` with a unique `$thread_id` and forwarding the provided `$arg` parameter. `$arg` is usually a pointer for additional data that the newly spawned thread needs. The return value of `wasi_thread_spawn` is the thread ID, or a negative error code if the thread creation failed. It seems like this function's name and module have not been finalized, as I couldn't find anything in the proposal README. I dug through the wasmtime source code to find [how they expose this function][wasi threads import path].

One thing to keep in mind is that the WASI Threads proposal has the concept of a "main thread", which is the thread that executes `_start` and spawns all other threads. If that thread terminates, all other threads will be abruptly stopped as well. All other threads will also be stopped if any thread traps (`unreachable`) or any thread calls the `proc_exit` WASI call.

Since the WASI Threads proposal does not provide a `join()` function, we have to resort to building one ourselves using the primitives from the [WebAssembly Threads][Wasm threads] proposal.

|||codediff|wasm
  (module
  	;; ...
+ 	(func $spawn_thread (import "wasi" "thread-spawn")
+ 		(param $arg i32)
+ 		(result i32))
  	;; ...
  	(func (export "_start")
  		(call $print
  			(i32.const 1000))
+ 		(drop
+ 			(call $spawn_thread
+ 				(i32.const 0)))
+ 		;; Spin until other thread has finished
+ 		(block $done
+ 			(loop $continue
+ 				(br_if $done
+ 					(i32.eq
+ 						(i32.const 1)
+ 						(i32.load
+ 							(i32.const 2000))))
+ 				(br $continue))))
  	;; ...
  	(func (export "wasi_thread_start")
  		(param $thread_id i32)
  		(param $arg i32)
  
+ 		(call $print
+ 			(i32.const 1100))
+ 		(drop
+ 			(i32.atomic.rmw.add
+ 				(i32.const 2000)
+ 				(i32.const 1))))))
|||

After compiling, we see that our thread is successfully printing.

```
$ wasmtime run --wasm-features threads --wasi-modules experimental-wasi-threads ./program.wasm
From main thread
From thread 1
```

### Avoiding spinning

We can use `memory.atomic.wait` and `memory.atomic.notify` to avoid the spinlock. `memory.atomic.wait` puts a thread to sleep on a specific memory address, provided it contains the expected value. The thread is woken up when someone calls `memory.atomic.notify` with the same memory address _or_ the provided timeout expires. 

|||codediff|wasm
  (module
  	;; ...  
   	(func (export "_start")
			;; ...
- 		(block $done
- 			(loop $continue
- 				(br_if $done
- 					(i32.eq
- 						(i32.const 1)
- 						(i32.load
- 							(i32.const 2000))))
- 				(br $continue))))
+ 		(drop
+ 			(memory.atomic.wait32
+ 				(i32.const 2000)  ;; Memory address to wait on
+ 				(i32.const 0)     ;; Expected value
+ 				(i64.const -1)))) ;; Timeout (-1 = unlimited)
  	;; ...
  	(func (export "wasi_thread_start")
  		(param $thread_id i32)
  		(param $arg i32)
 
  		;; ...
+ 		(drop
+ 			(memory.atomic.notify
+ 				(i32.const 2000)  ;; Memory address
+ 				(i32.const 1))))) ;; Number of waiters to notify
|||

### Parameterization

To somewhat test that our code is correct, let's spawn some more threads and use the thread parameter to determine which message to print.

|||codediff|wasm
  (module
  	;; ...  
+ 	(data
+ 		(i32.const 1200)
+ 		"From thread 2\n\00")
  	;; ...
   	(func (export "_start")
  		;; ...
- 		(drop
- 			(call $spawn_thread
- 				(i32.const 0)))
+ 		(drop
+ 			(call $spawn_thread
+ 				(i32.const 1100)))
+ 		(drop
+ 			(call $spawn_thread
+ 				(i32.const 1200)))
  		;; Wait until other thread has finished
  		(drop
  			(memory.atomic.wait32
  				(i32.const 2000)  
  				(i32.const 0)     
  				(i64.const -1))) 
+ 		(drop
+ 			(memory.atomic.wait32
+ 				(i32.const 2000)  
+ 				(i32.const 1)     
+ 				(i64.const -1)))) 
  	;; ...
  	(func (export "wasi_thread_start")
  		(param $thread_id i32)
  		(param $arg i32)
  
- 		(call $print
- 			(i32.const 1100))
+ 		(call $print
+ 			(local.get $arg))
  		;; ...
|||

Compile & run:

```
$ wasmtime run --wasm-features threads --wasi-modules experimental-wasi-threads ./program.wasm
From main thread
From thread 2
From thread 1
```

There is an experimental release of [WASI-SDK v20][wasi-sdk v20] that has support for WASI Threads via the pthreads API. I hope Rust will follow soon.

[WASI Threads]: https://github.com/WebAssembly/wasi-threads
[wasmtime]: https://github.com/bytecodealliance/wasmtime
[Wasm threads]: https://webassembly.github.io/threads/core/
[wabt]: https://github.com/WebAssembly/wabt
[wasi-sdk v20]: https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-20%2Bthreads
[wasi threads import path]: https://github.com/bytecodealliance/wasmtime/blob/e10094dcd6d0354628255a6f2e69c1e4c327d6e7/crates/wasi-threads/src/lib.rs#L114-L115