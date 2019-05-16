;; Filename: memory.wat 
(module
  ;; Create a memory starting with a size of 1 page (= 64KiB) 
  ;; that is growable to up to 100 pages.
  (memory $mem 1 100)
  ;; Export that memory
  (export "memory" (memory $mem))
  ;; Our function with no parameters and no return value.
  (func $add (param $p1 i32) (result)
    ;; Load an i32 from address 0
    i32.const 0
    i32.load
    
    ;; Add that value and our parameter
    local.get $p1
    i32.add 

    ;; Temporarily store the result in the parameter
    local.set $p1

    ;; Store that value at address 4
    i32.const 4
    local.get $p1
    i32.store
  )
  (export "add" (func $add))
)