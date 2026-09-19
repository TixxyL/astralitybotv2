const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDirectory = path.join(__dirname, '..', 'data');
const databasePath = path.join(dataDirectory, 'astrality.sqlite');
fs.mkdirSync(dataDirectory, { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS warnings_user_idx ON warnings (guild_id, user_id);

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL,
    reason TEXT,
    claimed_by TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    closed_at TEXT,
    closed_by TEXT
  );
  CREATE INDEX IF NOT EXISTS tickets_owner_idx ON tickets (guild_id, owner_id, status);

  CREATE TABLE IF NOT EXISTS automod_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    block_links INTEGER NOT NULL DEFAULT 1,
    timeout_minutes INTEGER NOT NULL DEFAULT 5,
    allowed_domains TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS automod_strikes (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    strikes INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );
`);

function migrateWarnings() {
  const legacyPath = path.join(dataDirectory, 'warnings.json');
  if (!fs.existsSync(legacyPath)) return;
  const count = db.prepare('SELECT COUNT(*) AS count FROM warnings').get().count;
  if (count > 0) return;

  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  } catch {
    return;
  }

  const insert = db.prepare(
    'INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const migrate = db.transaction(() => {
    for (const [key, warnings] of Object.entries(legacy)) {
      const separator = key.indexOf(':');
      if (separator < 1 || !Array.isArray(warnings)) continue;
      const guildId = key.slice(0, separator);
      const userId = key.slice(separator + 1);
      for (const warning of warnings) {
        insert.run(guildId, userId, warning.moderatorId || 'unknown', warning.reason || 'Sin razón', warning.timestamp || new Date().toISOString());
      }
    }
  });
  migrate();
}

migrateWarnings();

function addWarning(guildId, userId, moderatorId, reason) {
  const result = db.prepare(
    'INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(guildId, userId, moderatorId, reason, new Date().toISOString());
  return db.prepare('SELECT id, moderator_id AS moderatorId, reason, created_at AS timestamp FROM warnings WHERE id = ?').get(result.lastInsertRowid);
}

function getWarnings(guildId, userId) {
  return db.prepare(
    'SELECT id, moderator_id AS moderatorId, reason, created_at AS timestamp FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY id ASC'
  ).all(guildId, userId);
}

function clearWarnings(guildId, userId) {
  const result = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  return result.changes;
}

function createTicket({ guildId, channelId, ownerId, reason }) {
  db.prepare(
    'INSERT OR IGNORE INTO tickets (guild_id, channel_id, owner_id, reason, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(guildId, channelId, ownerId, reason || null, new Date().toISOString());
}

function claimTicket(channelId, staffId) {
  db.prepare('UPDATE tickets SET claimed_by = ? WHERE channel_id = ? AND status = \'open\'').run(staffId, channelId);
}

function closeTicket(channelId, staffId) {
  db.prepare(
    'UPDATE tickets SET status = \'closed\', closed_at = ?, closed_by = ? WHERE channel_id = ?'
  ).run(new Date().toISOString(), staffId, channelId);
}

function getAutomodSettings(guildId, defaults) {
  const row = db.prepare('SELECT enabled, block_links AS blockLinks, timeout_minutes AS timeoutMinutes, allowed_domains AS allowedDomains FROM automod_settings WHERE guild_id = ?').get(guildId);
  if (!row) return { ...defaults, allowedDomains: [...defaults.allowedDomains] };
  return {
    enabled: Boolean(row.enabled),
    blockLinks: Boolean(row.blockLinks),
    timeoutMinutes: row.timeoutMinutes,
    allowedDomains: JSON.parse(row.allowedDomains),
  };
}

function saveAutomodSettings(guildId, settings) {
  db.prepare(`
    INSERT INTO automod_settings (guild_id, enabled, block_links, timeout_minutes, allowed_domains)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      enabled = excluded.enabled,
      block_links = excluded.block_links,
      timeout_minutes = excluded.timeout_minutes,
      allowed_domains = excluded.allowed_domains
  `).run(guildId, settings.enabled ? 1 : 0, settings.blockLinks ? 1 : 0, settings.timeoutMinutes, JSON.stringify(settings.allowedDomains));
}

function addAutomodStrike(guildId, userId) {
  const current = db.prepare('SELECT strikes FROM automod_strikes WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  const strikes = (current?.strikes || 0) + 1;
  db.prepare(`
    INSERT INTO automod_strikes (guild_id, user_id, strikes, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET strikes = excluded.strikes, updated_at = excluded.updated_at
  `).run(guildId, userId, strikes, new Date().toISOString());
  return strikes;
}

function resetAutomodStrikes(guildId, userId) {
  db.prepare('DELETE FROM automod_strikes WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

function closeDatabase() {
  if (db.open) db.close();
}

module.exports = {
  addWarning,
  getWarnings,
  clearWarnings,
  createTicket,
  claimTicket,
  closeTicket,
  getAutomodSettings,
  saveAutomodSettings,
  addAutomodStrike,
  resetAutomodStrikes,
  closeDatabase,
};
