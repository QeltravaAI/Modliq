"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizationData = void 0;
const optimizationStore = new Map();
exports.optimizationData = {
    save: (id, data) => {
        optimizationStore.set(id, data);
    },
    get: (id) => {
        return optimizationStore.get(id);
    },
    list: () => {
        return Array.from(optimizationStore.entries()).map(([id, data]) => ({ id, ...data }));
    },
};
//# sourceMappingURL=optimizationStore.js.map