// Binary heap implementation from:
// http://eloquentjavascript.net/appendix2.html

class BinaryHeap<T> {
  content: Array<T> = new Array<T>(10);

  push(element: T): void {
    // Add the new element to the end of the array.
    this.content.push(element);
    // Allow it to bubble up.
    this.bubbleUp(<i32>this.content.length - 1);
  }

  pop(): T {
    if (this.content.length <= 0) {
      throw new Error("Can't pop an empty heap");
    }
    // Store the first element so we can return it later.
    const result = unchecked(this.content[0]);
    // Get the element at the end of the array.
    const end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it sink down.
    if (this.content.length > 0) {
      unchecked((this.content[0] = end));
      this.sinkDown(0);
    }
    return result;
  }

  peek(): T {
    if (this.content.length <= 0) {
      throw new Error("Can't peek an empty heap");
    }
    return unchecked(this.content[0]);
  }

  remove(node: T): void {
    if (this.content.length <= 0) {
      throw new Error("Can't remove from an empty heap");
    }
    const len = this.content.length;
    // To remove a value, we must search through the array to find
    // it.
    for (let i = 0; i < len; i++) {
      if (unchecked(this.content[i]) == node) {
        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        const end = this.content.pop();
        if (i != len - 1) {
          unchecked((this.content[i] = end));
          if (end < node) this.bubbleUp(i);
          else this.sinkDown(i);
        }
        return;
      }
    }
    throw new Error("Node not found.");
  }

  size(): u32 {
    return this.content.length;
  }

  bubbleUp(n: u32): void {
    // Fetch the element that has to be moved.
    const element = unchecked(this.content[n]);
    // When at 0, an element can not go up any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      const parentN = <i32>Math.floor((n + 1) / 2) - 1,
        parent = unchecked(this.content[parentN]);
      // Swap the elements if the parent is greater.
      if (element < parent) {
        unchecked((this.content[parentN] = element));
        unchecked((this.content[n] = parent));
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to move it further.
      else {
        break;
      }
    }
  }

  sinkDown(n: u32): void {
    // Look up the target element and its score.
    const length = this.content.length,
      element = unchecked(this.content[n]),
      elemScore = element;

    while (true) {
      // Compute the indices of the child elements.
      const child2N: i32 = (n + 1) * 2,
        child1N: i32 = child2N - 1;
      // This is used to store the new position of the element,
      // if any.
      let swap: i32 = -1;
      let child1: T, child1Score: f32, child2: T, child2Score: f32;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        child1 = unchecked(this.content[child1N]);
        child1Score = child1;
        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) swap = child1N;
      }
      // Do the same checks for the other child.
      if (child2N < length) {
        child2 = unchecked(this.content[child2N]);
        child2Score = child2;
        if (child2Score < (swap == -1 ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap != -1) {
        unchecked((this.content[n] = unchecked(this.content[swap])));
        unchecked((this.content[swap] = element));
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
}

let heapInstance: BinaryHeap<f32>;

export function init(): void {
  heapInstance = new BinaryHeap();
}

export function push(v: f32): void {
  heapInstance.push(v);
}

export function pop(): f32 {
  return heapInstance.pop();
}

export function size(): u32 {
  return heapInstance.size();
}

export function peek(): f32 {
  return heapInstance.peek();
}
