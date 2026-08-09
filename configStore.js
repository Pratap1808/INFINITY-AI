/**
 * Global app configuration, controllable only by the Owner (after
 * password + biometric verification). Normal users get these as DEFAULTS
 * which they may still override locally in their own browser settings —
 * but the owner's values take priority when both exist, per spec.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  appName: 'INFINITY AI',
  theme: 'nebula-violet',
  logoUrl: '/assets/logo.png',
  backgroundStyle: 'starfield',
  defaultMode: 'assistant',
  defaultVoice: 'default',
  defaultLanguage: 'en-US',
  systemPromptOverride: '',
  memoryEnabled: true,
  updatedAt: null,
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
  }
}

function getConfig() {
  ensureStore();
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function updateConfig(partial) {
  const current = getConfig();
  const next = { ...current, ...partial, updatedAt: new Date().toISOString() };
  ensureStore();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = { getConfig, updateConfig, DEFAULT_CONFIG };
