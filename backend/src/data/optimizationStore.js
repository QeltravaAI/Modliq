const optimizationStore = new Map();

function save(id, data) {
  optimizationStore.set(id, data);
}

function get(id) {
  return optimizationStore.get(id);
}

function list() {
  return Array.from(optimizationStore.entries()).map(
    ([id, data]) => ({ id, ...data })
  );
}

module.exports = { save, get, list, store: optimizationStore };
