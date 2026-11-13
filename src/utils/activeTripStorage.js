// AI-assisted: see docs/AI_LOG.md #18
// Serialize operations for each key so a late write cannot undo a newer one.
export function createActiveTripStorage(storage) {
  const queues = new Map();

  function enqueue(key, operation) {
    const previous = queues.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(operation);
    const settled = current.catch(() => {});
    queues.set(key, settled);
    settled.then(() => {
      if (queues.get(key) === settled) queues.delete(key);
    });
    return current;
  }

  return {
    read(key) {
      return enqueue(key, () => storage.getItem(key));
    },
    save(key, id, isCurrent = () => true) {
      return enqueue(key, () =>
        isCurrent() ? storage.setItem(key, id) : undefined
      );
    },
    remove(key, isCurrent = () => true) {
      return enqueue(key, () =>
        isCurrent() ? storage.removeItem(key) : undefined
      );
    },
  };
}
