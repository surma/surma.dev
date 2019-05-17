;; Filename: funcimport.wat 
(module
  ;; A function with no parameters and now return value.
  (type $log (func (param) (result)))
  ;; Expect a function called `log` on the `funcs` module
  (import "funcs" "log" (func $log))
  (func $doLog (param) (result)
    call $log
  )
  (export "doLog" (func $doLog))
)