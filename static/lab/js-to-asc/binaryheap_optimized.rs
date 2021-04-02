#![feature(option_result_unwrap_unchecked)]

extern crate wee_alloc;

// Use `wee_alloc` as the global allocator.
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

struct BinaryHeap(Vec<f32>);

impl BinaryHeap {
    fn new() -> BinaryHeap {
        BinaryHeap(Vec::with_capacity(10))
    }

    fn push(&mut self, v: f32) {
        self.0.push(v);
        self.bubble_up(self.0.len() - 1);
    }

    fn peek(&self) -> f32 {
        unsafe { *self.0.get_unchecked(0) }
    }

    fn pop(&mut self) -> f32 {
        let result = unsafe { *self.0.get_unchecked(0) };
        let end = unsafe { *self.0.get_unchecked(self.0.len() - 1) };
        // Avoid error handling code
        self.0.pop();
        if self.0.len() > 0 {
            unsafe {
                *self.0.get_unchecked_mut(0) = end;
            }
            self.sink_down(0);
        }
        result
    }

    fn size(&self) -> usize {
        self.0.len()
    }

    fn bubble_up(&mut self, mut n: usize) {
        let element = unsafe { *self.0.get_unchecked(n) };
        while n > 0 {
            // Compute the parent element's index, and fetch it.
            let parent_n: usize = ((((n as f32) + 1.0) / 2.0) - 1.0).floor() as usize;
            let parent: f32 = unsafe { *self.0.get_unchecked(parent_n) };
            // Swap the elements if the parent is greater.
            if element < parent {
                unsafe {
                    *(self.0.get_unchecked_mut(parent_n)) = element;
                    *(self.0.get_unchecked_mut(n)) = parent;
                }
                n = parent_n;
            }
            // Found a parent that is less, no need to move it further.
            else {
                break;
            }
        }
    }

    fn sink_down(&mut self, mut n: usize) {
        // Look up the target element and its score.
        let length = self.0.len();
        let element = unsafe { *self.0.get_unchecked(n) };
        let elem_score = element;

        loop {
            // Compute the indices of the child elements.
            let child2_n = (n + 1) * 2;
            let child1_n = child2_n - 1;
            // This is used to store the new position of the element,
            // if any.
            let mut swap: Option<usize> = None;
            let child1: f32;
            let mut child1_score: f32 = std::f32::NEG_INFINITY;
            let child2: f32;
            let child2_score: f32;
            // If the first child exists (is inside the array)...
            if child1_n < length {
                // Look it up and compute its score.
                child1 = unsafe { *self.0.get_unchecked(child1_n) };
                child1_score = child1;
                // If the score is less than our element's, we need to swap.
                if child1_score < elem_score {
                    swap = Some(child1_n);
                }
            }
            // Do the same checks for the other child.
            if child2_n < length {
                child2 = unsafe { *self.0.get_unchecked(child2_n) };
                child2_score = child2;
                if child2_score < swap.map(|_| child1_score).unwrap_or(elem_score) {
                    swap = Some(child2_n);
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if let Some(swap) = swap {
                unsafe {
                    // Double-borrow is safe
                    let n_value = &mut *(self.0.get_unchecked_mut(n) as *mut _);
                    let swap_value = &mut *(self.0.get_unchecked_mut(swap) as *mut _);
                    *n_value = *swap_value;
                    *swap_value = element;
                    n = swap;
                }
            }
            // Otherwise, we are done.
            else {
                break;
            }
        }
    }
}

static mut INSTANCE: Option<BinaryHeap> = None;

#[no_mangle]
pub fn init() {
    unsafe {
        INSTANCE = Some(BinaryHeap::new());
    }
}

#[no_mangle]
pub fn push(v: f32) {
    unsafe {
        INSTANCE.as_mut().unwrap_unchecked().push(v);
    }
}

#[no_mangle]
pub fn pop() -> f32 {
    unsafe { INSTANCE.as_mut().unwrap_unchecked().pop() }
}

#[no_mangle]
pub fn size() -> usize {
    unsafe { INSTANCE.as_ref().unwrap_unchecked().size() }
}

#[no_mangle]
pub fn peek() -> f32 {
    unsafe { INSTANCE.as_ref().unwrap_unchecked().peek() }
}
