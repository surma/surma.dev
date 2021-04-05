extern crate wee_alloc;

// Use `wee_alloc` as the global allocator.
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
type Scorer<T> = fn(&T) -> f32;
struct BinaryHeap<T> {
    data: Vec<T>,
    scorer: Scorer<T>,
}

struct Item {
    index: usize,
    score: f32,
}

impl<T> BinaryHeap<T> {
    fn new(scorer: Scorer<T>) -> BinaryHeap<T> {
        BinaryHeap {
            data: Vec::with_capacity(10),
            scorer,
        }
    }

    fn push(&mut self, v: T) {
        self.data.push(v);
        self.bubble_up(self.data.len() - 1);
    }

    fn peek(&self) -> Option<&T> {
        self.data.get(0)
    }

    fn pop(&mut self) -> Option<T> {
        if self.data.len() == 0 {
            return None;
        }
        let result = self.data.swap_remove(0);
        if self.data.len() > 0 {
            self.sink_down(0);
        }
        Some(result)
    }

    fn size(&self) -> usize {
        self.data.len()
    }

    fn get_item(&self, n: usize) -> Option<Item> {
        let item = self.data.get(n)?;
        let score = (self.scorer)(item);
        Some(Item { index: n, score })
    }

    fn bubble_up(&mut self, n: usize) {
        let mut element = self.get_item(n).unwrap();
        while element.index > 0 {
            // Compute the parent element's index, and fetch it.
            let parent_n: usize = (((element.index as f32) - 1.0) / 2.0).floor() as usize;
            let parent = self.get_item(parent_n).unwrap();
            // Swap the elements if the parent is greater.
            if element.score < parent.score {
                self.data.swap(element.index, parent.index);
                element.index = parent.index;
            }
            // Found a parent that is less, no need to move it further.
            else {
                break;
            }
        }
    }

    fn sink_down(&mut self, mut n: usize) {
        // Look up the target element and its score.
        let length = self.data.len();
        let element = self.get_item(n).unwrap();

        loop {
            // Compute the indices of the child elements.
            let child2_n = 2 * n + 1;
            let child1_n = child2_n + 1;
            // This is used to store the new position of the element,
            // if any.
            let mut swap: Option<Item> = None;
            // If the first child exists (is inside the array)...
            if child1_n < length {
                // Look it up and compute its score.
                let child1 = self.get_item(child1_n).unwrap();
                // If the score is less than our element's, we need to swap.
                if child1.score < element.score {
                    swap = Some(child1);
                }
            }
            // Do the same checks for the other child.
            if child2_n < length {
                let child2 = self.get_item(child2_n).unwrap();
                if child2.score
                    < swap
                        .as_ref()
                        .map(|item| item.score)
                        .unwrap_or(element.score)
                {
                    swap = Some(child2);
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if let Some(swap) = swap {
                self.data.swap(n, swap.index);
                n = swap.index
            }
            // Otherwise, we are done.
            else {
                break;
            }
        }
    }
}

static mut INSTANCE: Option<BinaryHeap<f32>> = None;

pub fn init() {
    unsafe {
        INSTANCE = Some(BinaryHeap::new(|v: &f32| *v));
    }
}

pub fn push(v: f32) {
    unsafe { INSTANCE.as_mut() }.map(|i| i.push(v));
}

pub fn pop() -> f32 {
    unsafe { INSTANCE.as_mut() }
        .and_then(|i| i.pop())
        .unwrap_or(-1.0)
}

pub fn size() -> usize {
    unsafe { INSTANCE.as_mut() }.map(|i| i.size()).unwrap_or(0)
}

pub fn peek() -> f32 {
    unsafe { INSTANCE.as_mut() }
        .and_then(|i| i.peek())
        .cloned()
        .unwrap_or(-1.0)
}
