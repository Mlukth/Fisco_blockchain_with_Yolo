/**
 * 数据库操作模块（考勤系统完整版）
 * 包含用户、匿名映射、考勤记录、设备、操作日志的 CRUD
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
    // 原有 users 表
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            role TEXT DEFAULT 'teacher',
            phone TEXT UNIQUE,
            name TEXT,
            classroom_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 原有 attendance_history 表（存证记录）
    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merkle_root TEXT UNIQUE NOT NULL,
            attendance_date INTEGER NOT NULL,
            upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            block_height INTEGER,
            is_deleted INTEGER DEFAULT 0,
            metadata TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_attendance_root ON attendance_history(merkle_root);
        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_history(attendance_date);
    `);

    // 新增表
    db.exec(`
        CREATE TABLE IF NOT EXISTS anonymous_map (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anonymous_id TEXT UNIQUE NOT NULL,
            student_name TEXT NOT NULL,
            student_no TEXT UNIQUE NOT NULL,
            classroom_id TEXT NOT NULL,
            parent_phone TEXT NOT NULL,
            feature_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_anonymous_class ON anonymous_map(classroom_id);
        CREATE INDEX IF NOT EXISTS idx_anonymous_parent ON anonymous_map(parent_phone);
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anonymous_id TEXT NOT NULL,
            status TEXT NOT NULL,
            time DATETIME NOT NULL,
            classroom_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            merkle_root TEXT,
            is_reviewed INTEGER DEFAULT 0,
            review_note TEXT,
            is_deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_attendance_anonymous ON attendance_records(anonymous_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_records(classroom_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_time ON attendance_records(time);
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT UNIQUE NOT NULL,
            device_name TEXT NOT NULL,
            classroom_id TEXT NOT NULL,
            status TEXT DEFAULT 'offline',
            ip_address TEXT,
            last_heartbeat DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_devices_class ON devices(classroom_id);
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS operation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            operation TEXT NOT NULL,
            detail TEXT,
            ip_address TEXT,
            tx_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_logs_user ON operation_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_logs_time ON operation_logs(created_at);
    `);

    // 尝试为旧表补充字段
    try {
        const tableInfo = db.prepare(`PRAGMA table_info(users)`).all();
        const cols = tableInfo.map(c => c.name);
        if (!cols.includes('phone')) db.exec(`ALTER TABLE users ADD COLUMN phone TEXT UNIQUE`);
        if (!cols.includes('name')) db.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
        if (!cols.includes('classroom_id')) db.exec(`ALTER TABLE users ADD COLUMN classroom_id TEXT`);
    } catch (e) {}

    // 种子用户
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    if (!stmt.get('admin')) {
        const hash = bcrypt.hashSync('password123', 10);
        db.prepare('INSERT INTO users (username, passwordHash, role, name) VALUES (?, ?, ?, ?)')
            .run('admin', hash, 'admin', '管理员');
    }
};

// ========== 用户相关 ==========
export const getUserByUsername = (username) => {
    return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
};

export const getUserById = (id) => {
    return getDb().prepare('SELECT id, username, role, phone, name, classroom_id FROM users WHERE id = ?').get(id);
};

export const getAllUsers = (role = null) => {
    let sql = 'SELECT id, username, role, phone, name, classroom_id, created_at FROM users';
    if (role) sql += ' WHERE role = ?';
    return getDb().prepare(sql).all(...(role ? [role] : []));
};

export const createUser = (user) => {
    const hash = bcrypt.hashSync(user.password || 'password123', 10);
    return getDb().prepare(`
        INSERT INTO users (username, passwordHash, role, phone, name, classroom_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.username, hash, user.role, user.phone || null, user.name, user.classroom_id || null);
};

export const updateUser = (id, updates) => {
    const fields = [];
    const values = [];
    if (updates.role) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.phone) { fields.push('phone = ?'); values.push(updates.phone); }
    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.classroom_id) { fields.push('classroom_id = ?'); values.push(updates.classroom_id); }
    if (fields.length === 0) return { changes: 0 };
    values.push(id);
    return getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

export const deleteUser = (id) => {
    return getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
};

// ========== 匿名映射 ==========
export const addAnonymousMapping = (data) => {
    return getDb().prepare(`
        INSERT INTO anonymous_map (anonymous_id, student_name, student_no, classroom_id, parent_phone, feature_hash)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.anonymous_id, data.student_name, data.student_no, data.classroom_id, data.parent_phone, data.feature_hash || null);
};

export const getStudentByAnonymousId = (anonymousId) => {
    return getDb().prepare('SELECT * FROM anonymous_map WHERE anonymous_id = ?').get(anonymousId);
};

export const getStudentsByParentPhone = (phone) => {
    return getDb().prepare('SELECT * FROM anonymous_map WHERE parent_phone = ?').all(phone);
};

export const getStudentsByClassroom = (classroomId) => {
    return getDb().prepare('SELECT * FROM anonymous_map WHERE classroom_id = ?').all(classroomId);
};

// ========== 考勤记录 ==========
export const addAttendanceRecord = (record) => {
    return getDb().prepare(`
        INSERT INTO attendance_records (anonymous_id, status, time, classroom_id, device_id, merkle_root)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(record.anonymous_id, record.status, record.time, record.classroom_id, record.device_id, record.merkle_root || null);
};

export const getAttendanceByClassroom = (classroomId, date = null) => {
    let sql = `SELECT ar.*, am.student_name FROM attendance_records ar 
               LEFT JOIN anonymous_map am ON ar.anonymous_id = am.anonymous_id 
               WHERE ar.classroom_id = ? AND ar.is_deleted = 0`;
    const params = [classroomId];
    if (date) {
        sql += ` AND DATE(ar.time) = ?`;
        params.push(date);
    }
    sql += ` ORDER BY ar.time DESC`;
    return getDb().prepare(sql).all(...params);
};

export const getAttendanceByAnonymousId = (anonymousId, limit = 30) => {
    return getDb().prepare(`
        SELECT * FROM attendance_records WHERE anonymous_id = ? AND is_deleted = 0 ORDER BY time DESC LIMIT ?
    `).all(anonymousId, limit);
};

export const updateAttendanceReview = (id, isReviewed, note) => {
    return getDb().prepare(`
        UPDATE attendance_records SET is_reviewed = ?, review_note = ? WHERE id = ?
    `).run(isReviewed ? 1 : 0, note, id);
};

export const getClassStatistics = (classroomId, date) => {
    const rows = getDb().prepare(`
        SELECT status, COUNT(*) as count FROM attendance_records 
        WHERE classroom_id = ? AND DATE(time) = ? AND is_deleted = 0
        GROUP BY status
    `).all(classroomId, date);
    const stats = { present: 0, late: 0, absent: 0, leave: 0 };
    rows.forEach(r => { stats[r.status] = r.count; });
    return stats;
};

export const getUnreviewedExceptions = (classroomId = null) => {
    let sql = `SELECT ar.*, am.student_name FROM attendance_records ar 
               LEFT JOIN anonymous_map am ON ar.anonymous_id = am.anonymous_id 
               WHERE ar.is_reviewed = 0 AND ar.status IN ('late', 'absent')`;
    const params = [];
    if (classroomId) {
        sql += ` AND ar.classroom_id = ?`;
        params.push(classroomId);
    }
    sql += ` ORDER BY ar.time DESC`;
    return getDb().prepare(sql).all(...params);
};

export const getMonthlyAttendanceByAnonymousId = (anonymousId, yearMonth) => {
    return getDb().prepare(`
        SELECT * FROM attendance_records 
        WHERE anonymous_id = ? AND strftime('%Y-%m', time) = ? AND is_deleted = 0
        ORDER BY time
    `).all(anonymousId, yearMonth);
};

// ========== 设备管理 ==========
export const getAllDevices = () => {
    return getDb().prepare('SELECT * FROM devices ORDER BY device_id').all();
};

export const getDeviceById = (deviceId) => {
    return getDb().prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId);
};

export const registerDevice = (device) => {
    return getDb().prepare(`
        INSERT INTO devices (device_id, device_name, classroom_id, status, ip_address)
        VALUES (?, ?, ?, 'offline', ?)
    `).run(device.device_id, device.device_name, device.classroom_id, device.ip_address || null);
};

export const updateDeviceHeartbeat = (deviceId, ipAddress) => {
    return getDb().prepare(`
        UPDATE devices SET status = 'online', ip_address = ?, last_heartbeat = CURRENT_TIMESTAMP WHERE device_id = ?
    `).run(ipAddress, deviceId);
};

export const updateDeviceStatus = (deviceId, status) => {
    return getDb().prepare(`UPDATE devices SET status = ? WHERE device_id = ?`).run(status, deviceId);
};

export const deleteDevice = (deviceId) => {
    return getDb().prepare('DELETE FROM devices WHERE device_id = ?').run(deviceId);
};

// ========== 操作日志 ==========
export const addOperationLog = (log) => {
    return getDb().prepare(`
        INSERT INTO operation_logs (user_id, operation, detail, ip_address, tx_hash)
        VALUES (?, ?, ?, ?, ?)
    `).run(log.user_id, log.operation, log.detail || null, log.ip_address || null, log.tx_hash || null);
};

export const getOperationLogs = (limit = 100) => {
    return getDb().prepare('SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ?').all(limit);
};

// ========== 兼容旧路由方法（history.js） ==========
export const getAllAttendanceHistory = () => {
    return getDb().prepare('SELECT * FROM attendance_history ORDER BY upload_time DESC').all();
};

export const purgeDeletedRecords = () => {
    return getDb().prepare('DELETE FROM attendance_history WHERE is_deleted = 1').run();
};

export const resetAttendanceTable = () => {
    return getDb().prepare('DELETE FROM attendance_history').run();
};

export const addImageRecord = (merkleRoot, attendanceDate, blockHeight, metadata) => {
    return getDb().prepare(`
        INSERT OR REPLACE INTO attendance_history (merkle_root, attendance_date, block_height, metadata) 
        VALUES (?, ?, ?, ?)
    `).run(merkleRoot, attendanceDate, blockHeight, metadata);
};

export const deleteAttendanceRecord = (merkleRoot) => {
    return getDb().prepare(`UPDATE attendance_history SET is_deleted = 1 WHERE merkle_root = ?`).run(merkleRoot);
};

export const getActiveAttendanceRecords = () => {
    return getDb().prepare(`SELECT * FROM attendance_history WHERE is_deleted = 0 ORDER BY upload_time DESC`).all();
};

// 兼容旧名
export const getAttendanceRecord = (merkleRoot) => {
    return getDb().prepare('SELECT * FROM attendance_history WHERE merkle_root = ?').get(merkleRoot);
};

export const deleteImageRecord = deleteAttendanceRecord;
export const getImageRecord = getAttendanceRecord;
export const getAllImageRecords = getActiveAttendanceRecords;
export const getAllHistory = getAllAttendanceHistory;

export default {
    getDb,
    getUserByUsername,
    getUserById,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    addAnonymousMapping,
    getStudentByAnonymousId,
    getStudentsByParentPhone,
    getStudentsByClassroom,
    addAttendanceRecord,
    getAttendanceByClassroom,
    getAttendanceByAnonymousId,
    updateAttendanceReview,
    getClassStatistics,
    getUnreviewedExceptions,
    getMonthlyAttendanceByAnonymousId,
    getAllDevices,
    getDeviceById,
    registerDevice,
    updateDeviceHeartbeat,
    updateDeviceStatus,
    deleteDevice,
    addOperationLog,
    getOperationLogs,
    getAllAttendanceHistory,
    purgeDeletedRecords,
    resetAttendanceTable,
    addImageRecord,
    deleteAttendanceRecord,
    getActiveAttendanceRecords,
    getAttendanceRecord,
    deleteImageRecord,
    getImageRecord,
    getAllImageRecords,
    getAllHistory
};
