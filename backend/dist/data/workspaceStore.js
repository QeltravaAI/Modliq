"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setActiveDataset = exports.getWorkspace = void 0;
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
const memoryWorkspaces = new Map();
async function getWorkspace(userId) {
    const database = await connect();
    if (database) {
        const record = await database.collection('workspaces').findOne({ _id: userId });
        if (!record)
            return { activeDatasetId: null };
        return { activeDatasetId: record.activeDatasetId };
    }
    return memoryWorkspaces.get(userId) || { activeDatasetId: null };
}
exports.getWorkspace = getWorkspace;
async function setActiveDataset(userId, datasetId) {
    const database = await connect();
    if (database) {
        await database.collection('workspaces').updateOne({ _id: userId }, { $set: { activeDatasetId: datasetId, updatedAt: new Date() } }, { upsert: true });
        return { activeDatasetId: datasetId };
    }
    memoryWorkspaces.set(userId, { activeDatasetId: datasetId });
    return { activeDatasetId: datasetId };
}
exports.setActiveDataset = setActiveDataset;
//# sourceMappingURL=workspaceStore.js.map