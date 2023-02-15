---json
{
  "title": "Spawning a WASI Thread with raw WebAssembly",
  "date": "2023-02-14",
  "socialmediaimage": "social.jpg",
  "live": false
}

---

Finally a universal API to spawn a thread from within WebAssembly.

<!-- more -->

## Wasmtime support

Before we write WAT, we need an engine that has support for the [WASI Threads] proposal. [wasmtime] has support on `main` behind a flag, so we have to build it:

```
$ git clone --recursive https://github.com/bytecodealliance/wasmtime 
$ cd wasmtime
$ cargo install -F wasi-threads --path .
```

## A WASI module

To be able to see that something is actually happening, a quick scaffold to print to stdout:

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
			(i32.const 1000)))
)
```

If you are curious what the `$print` function looks like:

```wasm
(module
  ;; ...
	(func $print
		(param $str_ptr i32)

    ;; Store a single io vector (string pointer, string length)
    ;; at address 0
		(i32.store
			(i32.const 0)
			(local.get $str_ptr))
		(i32.store
			(i32.const 4)
			(call $strlen
				(local.get $str_ptr)))

		(call $fd_write
			(i32.const 1) ;; Stdout
			(i32.const 0) ;; Starting address of io vectors
			(i32.const 1) ;; Number of io vectors
			(i32.const 3000)) ;; Address where to store number of bytes written
		drop)
		
	(func $strlen
		(param $str_ptr i32)
		(result i32)

		(local $ctr i32)

		(local.set $ctr
			(i32.const 0))

    ;; while(*($str_ptr + $ctr) != 0) $ctr++
		(block $done
			(loop $continue
				(br_if
					$done
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

    ;; return $ctr
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




[WASI Threads]: https://github.com/WebAssembly/wasi-threads
[wasmtime]: https://github.com/bytecodealliance/wasmtime