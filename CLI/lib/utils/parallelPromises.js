export async function mapPromisesParallely(numParallel, items, fn) {
  const results = new Array(items.length);
  const promises = [];
  let index = 0;

  while (index < items.length) {
    while (promises.length < numParallel && index < items.length) {
      const currentIndex = index;
      const promise = fn(items[currentIndex], currentIndex).then((result) => {
        results[currentIndex] = result; 
        console.log("fn executing, index", currentIndex + 1);
      });
      promises.push(promise);
      index++;
    }
    await Promise.all(promises);
    promises.length = 0;
  }
  return results;
}
