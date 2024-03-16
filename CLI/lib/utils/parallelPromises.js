export async function mapPromisesParallely(numParallel, items, fn) {
  const results = [];
  const promises = [];
  let index = 0;
  while (index < items.length) {
    while (promises.length < numParallel && index < items.length) {
      promises.push(
        fn(items[index], index++).then((result) => {
          results.push(result);
        })
      );
    }
    await Promise.all(promises);
    promises.length = 0;
  }
  return results;
}
