import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../config.js';
import { auditRecords, departments, menuResources, noticeReads, notices, operationLogs, roles, systemSettings, users } from './schema.js';

const dbDir = path.dirname(config.dbFile);
fs.mkdirSync(dbDir, { recursive: true });

export const sqlite = new Database(config.dbFile);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);

export async function ensureTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      leader_name TEXT,
      sort INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'enabled',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'enabled',
      is_system INTEGER NOT NULL DEFAULT 0,
      menu_ids TEXT NOT NULL DEFAULT '[]',
      button_permissions TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL UNIQUE,
      real_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      department_id INTEGER,
      role_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'enabled',
      is_admin INTEGER NOT NULL DEFAULT 0,
      last_login_at INTEGER,
      last_login_ip TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS menu_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      title TEXT NOT NULL,
      path TEXT NOT NULL,
      icon TEXT,
      type TEXT NOT NULL,
      permission_code TEXT,
      component TEXT,
      sort INTEGER NOT NULL DEFAULT 0,
      visible INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'enabled',
      remark TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'normal',
      publisher_id INTEGER,
      target_role_codes TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      publish_at INTEGER,
      expire_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS notice_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notice_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      read_status TEXT NOT NULL DEFAULT 'unread',
      processed_status TEXT NOT NULL DEFAULT 'pending',
      read_at INTEGER,
      processed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (notice_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 200,
      message TEXT NOT NULL,
      ip TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_title TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_by TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      module TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_data TEXT,
      after_data TEXT,
      operator_id INTEGER,
      operator_name TEXT,
      result TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

export function now() {
  return Date.now();
}
