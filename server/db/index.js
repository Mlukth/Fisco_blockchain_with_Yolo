/**
 * 数据库操作模块（精简版 - 考勤存证核心）
 * 包含用户表、考勤记录表、存证历史表、匿名映射表、设备表
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
    // 用户表
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            role TEXT DEFAULT 'teacher',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 考勤记录表
    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anonymous_id TEXT NOT NULL,
            status TEXT NOT NULL,
            time DATETIME NOT NULL,
            classroom_id TEXT NOT NULL,
            device_id TEXT,
            merkle_root TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_attendance_anonymous ON attendance_records(anonymous_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_records(classroom_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_time ON attendance_records(time);
    `);

    // 存证历史表
    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merkle_root TEXT UNIQUE NOT NULL,
            block_height INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_history_root ON attendance_history(merkle_root);
    `);

    // 匿名映射表（将匿名ID映射到真实姓名、班级等）
    db.exec(`
        CREATE TABLE IF NOT EXISTS anonymous_map (
            anonymous_id TEXT PRIMARY KEY,
            student_name TEXT NOT NULL,
            grade TEXT,
            class_name TEXT,
            parent_phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 家长-孩子绑定表（用于家长端查询）
    db.exec(`
        CREATE TABLE IF NOT EXISTS parent_child (
            parent_username TEXT NOT NULL,
            child_anonymous_id TEXT NOT NULL,
            FOREIGN KEY (parent_username) REFERENCES users(username),
            FOREIGN KEY (child_anonymous_id) REFERENCES anonymous_map(anonymous_id),
            PRIMARY KEY (parent_username, child_anonymous_id)
        );
    `);

    // 设备表（用于管理员设备管理）
    db.exec(`
        CREATE TABLE IF NOT EXISTS devices (
            device_id TEXT PRIMARY KEY,
            device_name TEXT NOT NULL,
            classroom_id TEXT,
            status TEXT DEFAULT 'offline',
            ip_address TEXT,
            last_heartbeat DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 插入种子用户
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

    // 插入默认匿名映射数据（示例）
    const mapStmt = db.prepare('INSERT OR IGNORE INTO anonymous_map (anonymous_id, student_name, grade, class_name, parent_phone) VALUES (?, ?, ?, ?, ?)');
    const defaultMappings = [
        ['S001', '张三', '一年级', '一年级1班', '13800138001'],
        ['S002', '李四', '一年级', '一年级1班', '13800138002'],
        ['S003', '王五', '一年级', '一年级1班', '13800138003'],
        ['S004', '赵六', '一年级', '一年级1班', '13800138004'],
        ['S005', '孙七', '一年级', '一年级2班', '13800138005'],
    ];
    const insertMany = db.transaction((mappings) => {
        for (const m of mappings) mapStmt.run(...m);
    });
    insertMany(defaultMappings);

    // 绑定家长与孩子（示例：家长 parent 绑定 S001）
    const bindStmt = db.prepare('INSERT OR IGNORE INTO parent_child (parent_username, child_anonymous_id) VALUES (?, ?)');
    bindStmt.run('parent', 'S001');
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
        INSERT INTO attendance_records (anonymous_id, status, time, classroom_id, device_id, merkle_root)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(record.anonymous_id, record.status, record.time, record.classroom_id, record.device_id || 'yolo-edge-device', record.merkle_root || null);
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

export const getActiveAttendanceRecords = getAttendanceHistory;
export const getAttendanceRecord = getHistoryByMerkleRoot;

// ========== 映射表相关 ==========
export const getAllMappings = () => {
    return getDb().prepare('SELECT * FROM anonymous_map ORDER BY anonymous_id').all();
};

export const addMapping = (mapping) => {
    return getDb().prepare(`
        INSERT INTO anonymous_map (anonymous_id, student_name, grade, class_name, parent_phone)
        VALUES (?, ?, ?, ?, ?)
    `).run(mapping.anonymous_id, mapping.student_name, mapping.grade, mapping.class_name, mapping.parent_phone);
};

export const getChildrenByParent = (parentUsername) => {
    return getDb().prepare(`
        SELECT m.* FROM anonymous_map m
        JOIN parent_child pc ON m.anonymous_id = pc.child_anonymous_id
        WHERE pc.parent_username = ?
    `).all(parentUsername);
};

// 根据家长手机号获取孩子列表（通过 parent_phone 匹配）
export const getStudentsByParentPhone = (phone) => {
    return getDb().prepare(`
        SELECT * FROM anonymous_map WHERE parent_phone = ?
    `).all(phone);
};

// ========== 辅助统计 ==========
export const getTotalStudentCount = () => {
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
    getActiveAttendanceRecords,
    getAttendanceRecord,
    getTotalStudentCount,
    getTodayStats,
    getAllMappings,
    addMapping,
    getChildrenByParent,
    getStudentsByParentPhone,
};