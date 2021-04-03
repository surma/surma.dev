export function sort(arr: StaticArray<f32>): void {
  const len = arr.length;
  for (let i = len - 1; i >= 0; i--) {
    for (let j = 1; j <= i; j++) {
      if (unchecked(arr[j - 1]) > unchecked(arr[j])) {
        const temp = unchecked(arr[j - 1]);
        unchecked((arr[j - 1] = unchecked(arr[j])));
        unchecked((arr[j] = temp));
      }
    }
  }
}

export function newStaticArray(length: i32): StaticArray<f32> {
  return new StaticArray<f32>(length);
}
