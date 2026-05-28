export async function pool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let done = 0;
  const total = items.length;

  const runners = Array.from({ length: Math.min(limit, total) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= total) return;
      results[index] = await worker(items[index]!, index);
      done++;
      onProgress?.(done, total);
    }
  });

  await Promise.all(runners);
  return results;
}
