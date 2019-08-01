export function copyRegexp(regexp) {
  return new RegExp(regexp.source, regexp.flags);
}

export function findChunk(bundle, id) {
  const [key, chunk] = Object.entries(bundle).find(
    ([key, chunk]) => chunk.facadeModuleId === id
  );
  return { key, chunk };
}
