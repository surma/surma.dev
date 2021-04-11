const numWarmupDefault = 5;
const numIterationsDefault = 1;

export async function benchmark({
  before = () => {},
  run = () => {},
  after = () => {},
  numIterations = numIterationsDefault,
  numWarmup = numWarmupDefault,
} = {}) {
  const results = [];
  for (let i = 0; i < numWarmup; i++) {
    const context = {};
    await before.call(context);
    await run.call(context);
    await after.call(context);
  }
  for (let i = 0; i < numIterations; i++) {
    const context = {};
    await before.call(context);
    const start = Date.now();
    await run.call(context);
    results.push(Date.now() - start);
    await after.call(context);
  }
  return results;
}
