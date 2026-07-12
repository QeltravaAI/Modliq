const optimizationStore = new Map<string, any>();

export const optimizationData = {
  save: (id: string, data: any) => {
    optimizationStore.set(id, data);
  },
  get: (id: string) => {
    return optimizationStore.get(id);
  },
  list: () => {
    return Array.from(optimizationStore.entries()).map(([id, data]) => ({ id, ...data }));
  },
};
