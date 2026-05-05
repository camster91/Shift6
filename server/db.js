/**
 * Shift6 DB — SQLite via better-sqlite3
 * Tables: users, subscriptions, workouts
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../data/shift6.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH, { verbose: null });
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      email              TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT UNIQUE,
      created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id               INTEGER NOT NULL REFERENCES users(id),
      stripe_subscription_id TEXT UNIQUE NOT NULL,
      stripe_price_id        TEXT,
      status                TEXT NOT NULL DEFAULT 'active',
      current_period_end     INTEGER,
      created_at            DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS workouts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      date        DATE NOT NULL,
      exercise_key TEXT NOT NULL,
      reps         INTEGER,
      duration_s  INTEGER,
      is_pr        INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
  `);
}

export function upsertUser(email, stripeCustomerId = null) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;
  return db.prepare('INSERT INTO users (email, stripe_customer_id) VALUES (?, ?)').run(email, stripeCustomerId).lastInsertRowid;
}

export function getUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function upsertSubscription(userId, sub) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM subscriptions WHERE stripe_subscription_id = ?').get(sub.id);
  if (existing) {
    db.prepare('UPDATE subscriptions SET status = ?, current_period_end = ?, stripe_price_id = ? WHERE id = ?')
      .run(sub.status, sub.current_period_end, sub.priceId, existing.id);
  } else {
    db.prepare('INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_price_id, status, current_period_end) VALUES (?, ?, ?, ?, ?)')
      .run(userId, sub.id, sub.priceId, sub.status, sub.current_period_end);
  }
}

export function recordWorkout({ userId, date, exerciseKey, reps, duration_s, is_pr }) {
  return getDb().prepare(`INSERT INTO workouts (user_id, date, exercise_key, reps, duration_s, is_pr) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userId, date, exerciseKey, reps, duration_s, is_pr ? 1 : 0);
}

export function getRecentWorkouts(userId, days = 30) {
  return getDb().prepare(`SELECT * FROM workouts WHERE user_id = ? AND date >= date('now', '-${days} days') ORDER BY date DESC`).all(userId);
}

export function getUserPRs(userId) {
  return getDb().prepare(`SELECT exercise_key, MAX(reps) as max_reps, MAX(duration_s) as max_duration_s FROM workouts WHERE user_id = ? AND is_pr = 1 GROUP BY exercise_key`).all(userId);
}