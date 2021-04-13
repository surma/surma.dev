#![feature(option_result_unwrap_unchecked)]

#[cfg(feature = "idiomatic")]
mod binaryheap_idiomatic;
#[cfg(feature = "idiomatic")]
use binaryheap_idiomatic as bhimpl;

#[cfg(feature = "optimized")]
mod binaryheap_optimized;
#[cfg(feature = "optimized")]
use binaryheap_optimized as bhimpl;

#[no_mangle]
pub fn init() {
    bhimpl::init();
}

#[no_mangle]
pub fn push(v: f32) {
    bhimpl::push(v)
}

#[no_mangle]
pub fn pop() -> f32 {
    bhimpl::pop()
}

#[no_mangle]
pub fn size() -> usize {
    bhimpl::size()
}

#[no_mangle]
pub fn peek() -> f32 {
    bhimpl::peek()
}
