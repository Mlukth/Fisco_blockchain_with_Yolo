/**
 * 数据库操作模块（精简版 - 考勤存证核心）
 * 包含用户表、考勤记录表、存证历史表
 */

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export const getDb = () => {
    if (!dbInstance) {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const dbPath = path.join(dataDir, 'users.db');
        dbInstance = new Database(dbPath);
        initDatabase(dbInstance);
    }
    return dbInstance;
};

const initDatabase = (db) => {
    // 用户表（精简字段）
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            role TEXT DEFAULT 'teacher',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 考勤记录表（精简字段，保留 merkle_root 用于验真）
    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anonymous_id TEXT NOT NULL,
            status TEXT NOT NULL,
            time DATETIME NOT NULL,
            classroom_id TEXT NOT NULL,
            merkle_root TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_attendance_anonymous ON attendance_records(anonymous_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_records(classroom_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_time ON attendance_records(time);
    `);

    // 存证历史表（仅存默克尔根与区块信息）
    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merkle_root TEXT UNIQUE NOT NULL,
            block_height INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_history_root ON attendance_history(merkle_root);
    `);

    // 尝试为旧表补充字段（兼容旧数据库）
    try {
        const tableInfo = db.prepare(`PRAGMA table_info(users)`).all();
        const cols = tableInfo.map(c => c.name);
        if (!cols.includes('passwordHash')) {
            // 旧表可能使用 password 字段，此处仅做兼容提示，不自动迁移
            console.warn('⚠️ 数据库 users 表结构较旧，建议手动迁移或重新初始化');
        }
    } catch (e) {
        // 忽略
    }

    // 种子用户
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    if (!stmt.get('admin')) {
        const hash = bcrypt.hashSync('password123', 10);
        db.prepare('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)')
            .run('admin', hash, 'admin');
    }
    if (!stmt.get('teacher')) {
        const hash = bcrypt.hashSync('password123', 10);
        db.prepare('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)')
            .run('teacher', hash, 'teacher');
    }
    if (!stmt.get('parent')) {
        const hash = bcrypt.hashSync('password123', 10);
        db.prepare('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)')
            .run('parent', hash, 'parent');
    }
};

// ========== 用户相关 ==========
export const getUserByUsername = (username) => {
    return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
};

export const getUserById = (id) => {
    return getDb().prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id);
};

export const getAllUsers = (role = null) => {
    let sql = 'SELECT id, username, role, created_at FROM users';
    if (role) sql += ' WHERE role = ?';
    return getDb().prepare(sql).all(...(role ? [role] : []));
};

export const createUser = (user) => {
    const hash = bcrypt.hashSync(user.password || 'password123', 10);
    return getDb().prepare(`
        INSERT INTO users (username, passwordHash, role)
        VALUES (?, ?, ?)
    `).run(user.username, hash, user.role);
};

export const updateUser = (id, updates) => {
    const fields = [];
    const values = [];
    if (updates.role) { fields.push('role = ?'); values.push(updates.role); }
    if (fields.length === 0) return { changes: 0 };
    values.push(id);
    return getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

export const deleteUser = (id) => {
    return getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
};

// ========== 考勤记录 ==========
export const addAttendanceRecord = (record) => {
    return getDb().prepare(`
        INSERT INTO attendance_records (anonymous_id, status, time, classroom_id, merkle_root)
        VALUES (?, ?, ?, ?, ?)
    `).run(record.anonymous_id, record.status, record.time, record.classroom_id, record.merkle_root || null);
};

export const getAttendanceByClassroom = (classroomId, date = null) => {
    let sql = `SELECT * FROM attendance_records WHERE classroom_id = ?`;
    const params = [classroomId];
    if (date) {
        sql += ` AND DATE(time) = ?`;
        params.push(date);
    }
    sql += ` ORDER BY time DESC`;
    return getDb().prepare(sql).all(...params);
};

export const getAttendanceByAnonymousId = (anonymousId, limit = 30) => {
    return getDb().prepare(`
        SELECT * FROM attendance_records WHERE anonymous_id = ? ORDER BY time DESC LIMIT ?
    `).all(anonymousId, limit);
};

export const getMonthlyAttendanceByAnonymousId = (anonymousId, yearMonth) => {
    return getDb().prepare(`
        SELECT * FROM attendance_records 
        WHERE anonymous_id = ? AND strftime('%Y-%m', time) = ?
        ORDER BY time
    `).all(anonymousId, yearMonth);
};

export const getClassStatistics = (classroomId, date) => {
    const rows = getDb().prepare(`
        SELECT status, COUNT(*) as count FROM attendance_records 
        WHERE classroom_id = ? AND DATE(time) = ?
        GROUP BY status
    `).all(classroomId, date);
    const stats = { present: 0, late: 0, absent: 0, leave: 0 };
    rows.forEach(r => { stats[r.status] = r.count; });
    return stats;
};

export const getUnreviewedExceptions = (classroomId = null) => {
    // 简化：直接返回迟到和缺勤记录（不再有复核状态）
    let sql = `SELECT * FROM attendance_records WHERE status IN ('late', 'absent')`;
    const params = [];
    if (classroomId) {
        sql += ` AND classroom_id = ?`;
        params.push(classroomId);
    }
    sql += ` ORDER BY time DESC`;
    return getDb().prepare(sql).all(...params);
};

// ========== 存证历史 ==========
export const addAttendanceHistory = (merkleRoot, blockHeight) => {
    return getDb().prepare(`
        INSERT INTO attendance_history (merkle_root, block_height) VALUES (?, ?)
    `).run(merkleRoot, blockHeight);
};

export const getAttendanceHistory = (limit = 50) => {
    return getDb().prepare(`
        SELECT * FROM attendance_history ORDER BY timestamp DESC LIMIT ?
    `).all(limit);
};

export const getHistoryByMerkleRoot = (merkleRoot) => {
    return getDb().prepare('SELECT * FROM attendance_history WHERE merkle_root = ?').get(merkleRoot);
};

// 兼容旧方法名
export const addImageRecord = addAttendanceHistory;
export const getActiveAttendanceRecords = getAttendanceHistory;
export const getAttendanceRecord = getHistoryByMerkleRoot;

// ========== 辅助：用于仪表盘统计 ==========
export const getTotalStudentCount = () => {
    // 由于删除了 anonymous_map 表，学生数量可通过 attendance_records 中的 distinct anonymous_id 估算
    const result = getDb().prepare(`SELECT COUNT(DISTINCT anonymous_id) as count FROM attendance_records`).get();
    return result.count;
};

export const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const rows = getDb().prepare(`
        SELECT status, COUNT(*) as count FROM attendance_records 
        WHERE DATE(time) = ? GROUP BY status
    `).all(today);
    const stats = { present: 0, late: 0, absent: 0, leave: 0, total: 0 };
    rows.forEach(r => {
        stats[r.status] = r.count;
        stats.total += r.count;
    });
    return stats;
};

export default {
    getDb,
    getUserByUsername,
    getUserById,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    addAttendanceRecord,
    getAttendanceByClassroom,
    getAttendanceByAnonymousId,
    getMonthlyAttendanceByAnonymousId,
    getClassStatistics,
    getUnreviewedExceptions,
    addAttendanceHistory,
    getAttendanceHistory,
    getHistoryByMerkleRoot,
    addImageRecord,
    getActiveAttendanceRecords,
    getAttendanceRecord,
    getTotalStudentCount,
    getTodayStats
};