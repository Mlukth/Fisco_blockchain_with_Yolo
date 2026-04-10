/**
 * 数据库操作模块（FISCO BCOS 考勤存证版）
 * 表结构：
 * - users: 用户认证
 * - attendance_history: 考勤存证记录（默克尔根、考勤日期、区块高度等）
 */
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';
import bcrypt from 'bcrypt';

// 单例数据库连接
let dbInstance = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getDb = () => {
    if (!dbInstance) {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('✅ 创建数据目录:', dataDir);
        }
        
        const dbPath = path.join(dataDir, 'users.db');
        dbInstance = new Database(dbPath);
        
        initDatabase(dbInstance);
    }
    return dbInstance;
};

const initDatabase = (db) => {
    // 用户表（保持不变）
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 考勤存证历史表（替换原 image_history）
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

    // 检查并添加可能缺失的列（兼容旧结构升级）
    try {
        const tableInfo = db.prepare(`PRAGMA table_info(attendance_history)`).all();
        const columnNames = tableInfo.map(col => col.name);
        
        if (!columnNames.includes('metadata')) {
            db.exec(`ALTER TABLE attendance_history ADD COLUMN metadata TEXT`);
            console.log('✅ 已添加 metadata 列');
        }
    } catch (e) {
        console.error('检查列失败:', e);
    }

    // 创建默认管理员账户
    const seedTestUser = () => {
        const testUser = {
            username: 'admin',
            password: 'password123',
            role: 'admin'
        };
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(testUser.username);
        if (!user) {
            bcrypt.hash(testUser.password, 10).then(hash => {
                const insert = db.prepare('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)');
                insert.run(testUser.username, hash, testUser.role);
                console.log(`✅ 测试用户 "${testUser.username}" 已创建`);
            });
        }
    };
    seedTestUser();
    console.log('✅ 数据库初始化完成（考勤存证模式）');
};

// ---------- 用户相关（保持不变） ----------
export const getUserByUsername = (username) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
};

export const getUserProfile = (userId) => {
    const db = getDb();
    const stmt = db.prepare(`
        SELECT id, username, role, createdAt 
        FROM users WHERE id = ?
    `);
    return stmt.get(userId);
};

// ---------- 考勤记录操作（替换原图片记录方法） ----------
/**
 * 添加上链考勤记录
 * @param {string} merkleRoot - 默克尔根哈希（0x开头）
 * @param {number} attendanceDate - 考勤日期时间戳（Unix秒）
 * @param {number} blockHeight - 区块高度
 * @param {string} metadata - 附加元数据（JSON字符串，可选）
 */
export const addAttendanceRecord = (merkleRoot, attendanceDate, blockHeight = null, metadata = null) => {
    const db = getDb();
    try {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO attendance_history 
            (merkle_root, attendance_date, block_height, metadata) 
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(merkleRoot, attendanceDate, blockHeight, metadata);
        return result.changes > 0;
    } catch (error) {
        console.error(`❌ 添加考勤记录失败: ${error.message}`);
        throw error;
    }
};

/**
 * 软删除考勤记录
 */
export const deleteAttendanceRecord = (merkleRoot) => {
    const db = getDb();
    try {
        const cleanRoot = String(merkleRoot).trim();
        const stmtGet = db.prepare("SELECT * FROM attendance_history WHERE merkle_root = ?");
        const record = stmtGet.get(cleanRoot);
        
        if (!record) {
            // 不存在则插入一条已删除标记
            const insertStmt = db.prepare(`
                INSERT INTO attendance_history (merkle_root, attendance_date, is_deleted) 
                VALUES (?, 0, 1)
            `);
            insertStmt.run(cleanRoot);
            return true;
        }
        
        const stmtUpdate = db.prepare(`
            UPDATE attendance_history SET is_deleted = 1 WHERE merkle_root = ?
        `);
        const result = stmtUpdate.run(cleanRoot);
        return result.changes > 0;
    } catch (error) {
        console.error(`❌ 删除记录失败: ${error.message}`);
        throw error;
    }
};

/**
 * 根据默克尔根获取记录
 */
export const getAttendanceRecord = (merkleRoot) => {
    const db = getDb();
    try {
        const cleanRoot = String(merkleRoot).trim();
        const stmt = db.prepare('SELECT * FROM attendance_history WHERE merkle_root = ?');
        return stmt.get(cleanRoot);
    } catch (error) {
        console.error(`❌ 查询失败: ${error.message}`);
        throw error;
    }
};

/**
 * 获取所有记录（包含软删除）
 */
export const getAllAttendanceHistory = () => {
    const db = getDb();
    try {
        const stmt = db.prepare(`
            SELECT 
                id, merkle_root, attendance_date, upload_time,
                block_height, is_deleted, metadata
            FROM attendance_history 
            ORDER BY upload_time DESC
        `);
        return stmt.all();
    } catch (err) {
        console.error(`❌ 获取历史记录失败: ${err.message}`);
        throw err;
    }
};

/**
 * 获取未删除的记录
 */
export const getActiveAttendanceRecords = () => {
    const db = getDb();
    const stmt = db.prepare(`
        SELECT id, merkle_root, attendance_date, upload_time, block_height, metadata
        FROM attendance_history 
        WHERE is_deleted = 0
        ORDER BY upload_time DESC
    `);
    return stmt.all();
};

/**
 * 物理删除已标记为删除的记录
 */
export const purgeDeletedRecords = () => {
    const db = getDb();
    const stmt = db.prepare("DELETE FROM attendance_history WHERE is_deleted = 1");
    const result = stmt.run();
    return result.changes;
};

/**
 * 完全重置考勤历史表
 */
export const resetAttendanceTable = () => {
    const db = getDb();
    const stmt = db.prepare("DELETE FROM attendance_history");
    const result = stmt.run();
    return result.changes;
};

// 通用查询方法
export const query = (sql, params = []) => {
    const db = getDb();
    const stmt = db.prepare(sql);
    return stmt.all(...params);
};

export const exec = (sql) => {
    const db = getDb();
    return db.exec(sql);
};

// 为了兼容性，保留旧名称的别名（可选）
export const addImageRecord = addAttendanceRecord;
export const deleteImageRecord = deleteAttendanceRecord;
export const getImageRecord = getAttendanceRecord;
export const getAllImageRecords = getActiveAttendanceRecords;
export const getAllHistory = getAllAttendanceHistory;

// 默认导出
export default {
    getUserByUsername,
    getUserProfile,
    addAttendanceRecord,
    deleteAttendanceRecord,
    getAttendanceRecord,
    getAllAttendanceHistory,
    getActiveAttendanceRecords,
    purgeDeletedRecords,
    resetAttendanceTable,
    // 别名
    addImageRecord,
    deleteImageRecord,
    getImageRecord,
    getAllImageRecords,
    getAllHistory,
    query,
    exec,
    getDb
};