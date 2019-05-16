(; 
  Filename: add.wat 
  This is a block comment.
;)
(module
  (func $add (param $p1 i32) (param $p2 i32) (result i32)
    (i32.add (local.get $p1) (local.get $p2))
  )
  (export "add" (func $add))
)