"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDatasets = exports.getDataset = exports.saveDataset = void 0;
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
const memoryDatasets = new Map();
async function saveDataset(datasetId, data) {
    const database = await connect();
    if (database) {
        await database.collection('datasets').updateOne({ _id: datasetId }, { $set: { ...data, updatedAt: new Date() } }, { upsert: true });
        return data;
    }
    memoryDatasets.set(datasetId, { _id: datasetId, ...data, updatedAt: new Date() });
    return data;
}
exports.saveDataset = saveDataset;
async function getDataset(datasetId) {
    const database = await connect();
    if (database) {
        const record = await database.collection('datasets').findOne({ _id: datasetId });
        return record || null;
    }
    return memoryDatasets.get(datasetId) || null;
}
exports.getDataset = getDataset;
async function getAllDatasets() {
    const database = await connect();
    if (database) {
        return database.collection('datasets').find().toArray();
    }
    return Array.from(memoryDatasets.values());
}
exports.getAllDatasets = getAllDatasets;
//# sourceMappingURL=datasetStore.js.map