---json
{
  "title": "Spawning a WASI Thread with raw WebAssembly",
  "date": "2023-02-15"
}
---

```wasm
(module
	(func $fd_write (import "wasi_unstable" "fd_write")
		(param $fd i32)
		(param $iovs i32)
		(param $iovs_len i32)
		(param $nwritten i32)
		(result i32))

	(func $spawn_thread (import "wasi" "thread-spawn")
		(param $arg i32)
		(result i32))

	(memory $mem (import "env" "memory") 1 1 shared)
	(export "memory" (memory $mem))

	(data
		(i32.const 1000)
		"From main thread\n\00")
	(data
		(i32.const 1100)
		"From thread 1\n\00")
	(data
		(i32.const 1200)
		"From thread 2\n\00")

	(func $print
		(param $str_ptr i32)

		(i32.store
			(i32.const 0)
			(local.get $str_ptr))
		(i32.store
			(i32.const 4)
			(call $strlen
				(local.get $str_ptr)))
		(call $fd_write
			(i32.const 1)
			(i32.const 0)
			(i32.const 1)
			(i32.const 12))
		drop)

	(func $strlen
		(param $str_ptr i32)
		(result i32)

		(local $ctr i32)

		(local.set $ctr
			(i32.const 0))
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
		(local.get $ctr))

	(func (export "_start")
		(call $print
			(i32.const 1000))
		(drop
			(call $spawn_thread
				(i32.const 1100)))
		(drop
			(call $spawn_thread
				(i32.const 1200)))
		;; Wait until other thread has finished
		(drop
			(memory.atomic.wait32
				(i32.const 2000)
				(i32.const 0)
				(i64.const -1)))
		(drop
			(memory.atomic.wait32
				(i32.const 2000)
				(i32.const 1)
				(i64.const -1))))

	(func (export "wasi_thread_start")
		(param $thread_id i32)
		(param $arg i32)

		(call $print
			(local.get $arg))
		(drop
			(i32.atomic.rmw.add
				(i32.const 2000)
				(i32.const 1)))
		(drop
			(memory.atomic.notify
				(i32.const 2000)
				(i32.const 1)))))
```
