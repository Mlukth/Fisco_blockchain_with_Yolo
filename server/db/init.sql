-- 考勤存证系统数据库初始化脚本
-- 注意：此文件仅供参考，实际表结构由 server/db/index.js 自动创建

-- 用户表（认证）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 考勤存证历史表
CREATE TABLE IF NOT EXISTS attendance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merkle_root TEXT UNIQUE NOT NULL,
  attendance_date INTEGER NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  block_height INTEGER,
  is_deleted INTEGER DEFAULT 0,
  metadata TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_attendance_root ON attendance_history(merkle_root);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_history(attendance_date);