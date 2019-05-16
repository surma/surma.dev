;; Filename: contrived.wat 
(module
  (func $add (param $p1 i32) (param $p2 i32) (result i32)
    local.get $p1 ;; Push parameter $p1 onto the stack
    local.get $p2 ;; Push parameter $p2 onto the stack
    i32.add ;; Pop two values off the stack and push their sum
    ;; The top of the stack is the return value
  )
  (func $add2 (param $p1 i32) (result i32)
    local.get $p1
    i32.const 2 ;; Push the constant 2 onto the stack
    call $add ;; Call our old function
  )
  (func $add3 (param $p1 i32) (result i32)
    local.get $p1
    i32.const 3 ;; Push the constant 3 onto the stack
    call $add ;; Call our old function
  )
  (export "add2" (func $add2))
  (export "add3" (func $add3))
)