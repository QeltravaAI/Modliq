"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOptimizations = exports.getOptimization = exports.saveOptimization = void 0;
const mongodb_1 = require("mongodb");
const DATABASE_URL = process.env.DATABASE_URL || process.env.MONGODB_URI || '';
const client = DATABASE_URL ? new mongodb_1.MongoClient(DATABASE_URL) : null;
let db = null;
async function connect() {
    if (!client || !DATABASE_URL)
        return null;
    if (db)
        return db;
    try {
        await client.connect();
        db = client.db('modliq');
        return db;
    }
    catch (err) {
        console.warn('[db] MongoDB connection failed, using in-memory fallback:', err?.message || err);
        return null;
    }
}
const memoryOptimizations = new Map();
async function saveOptimization(id, data) {
    const database = await connect();
    if (database) {
        await database.collection('optimizations').updateOne({ _id: id }, { $set: { ...data, status: 'completed', progress: 100, updatedAt: new Date() } }, { upsert: true });
        return data;
    }
    memoryOptimizations.set(id, { _id: id, ...data, status: 'completed', progress: 100, updatedAt: new Date() });
    return data;
}
exports.saveOptimization = saveOptimization;
async function getOptimization(id) {
    const database = await connect();
    if (database) {
        const record = await database.collection('optimizations').findOne({ _id: id });
        return record || null;
    }
    return memoryOptimizations.get(id) || null;
}
exports.getOptimization = getOptimization;
async function listOptimizations() {
    const database = await connect();
    if (database) {
        return database.collection('optimizations').find({ status: 'completed' }).toArray();
    }
    return Array.from(memoryOptimizations.values()).filter((item) => item.status === 'completed');
}
exports.listOptimizations = listOptimizations;
//# sourceMappingURL=optimizationStore.js.map