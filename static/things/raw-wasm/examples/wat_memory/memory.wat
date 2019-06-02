;; Filename: memory.wat
(module
  ;; Create memory with a size of 1 page (= 64KiB)
  ;; that is growable to up to 100 pages.
  (memory $mem 1 100)
  ;; Export that memory
  (export "memory" (memory $mem))
  ;; Our function with no parameters and no return value,
  ;; but with a local variable for temporary storage.
  (func $add2 (param) (result) (local $tmp i32)
    ;; Load an i32 from address 0 and put it on the stack
    i32.const 0
    i32.load

    ;; Push 2 onto the stack and add the values
    i32.const 2
    i32.add

    ;; Temporarily store the result in the parameter
    local.set $tmp

    ;; Store that value at address 4
    i32.const 4
    local.get $tmp
    i32.store
  )
  (export "add2" (func $add2))
)