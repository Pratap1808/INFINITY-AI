/**
 * Minimal JSON-file memory store.
 *
 * NOTE: Render's free tier uses an ephemeral filesystem — data here will
 * reset on redeploy/restart. For persistent memory in production, swap this
 * module for a real database (e.g. MongoDB Atlas free tier, Supabase, etc.)
 * while keeping the same get/set/clear function signatures.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, JSON.stringify({}), 'utf8');
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeAll(data) {
  ensureStore();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getMemory(userId) {
  const all = readAll();
  return all[userId] || { facts: [], updatedAt: null };
}

function addMemory(userId, fact) {
  const all = readAll();
  if (!all[userId]) all[userId] = { facts: [], updatedAt: null };
  all[userId].facts.push({ text: fact, savedAt: new Date().toISOString() });
  // cap memory size to keep prompts small
  if (all[userId].facts.length > 100) {
    all[userId].facts = all[userId].facts.slice(-100);
  }
  all[userId].updatedAt = new Date().toISOString();
  writeAll(all);
  return all[userId];
}

function clearMemory(userId) {
  const all = readAll();
  delete all[userId];
  writeAll(all);
}

module.exports = { getMemory, addMemory, clearMemory };
