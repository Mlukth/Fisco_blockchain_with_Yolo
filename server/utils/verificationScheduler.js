/**
 * 考勤记录定时验真任务
 * 每天凌晨2点执行，遍历所有merkle_root，重新计算并比对，更新verified字段
 */
import cron from 'node-cron';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { MerkleTree } from 'merkletreejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../data/users.db');
const db = new Database(dbPath);

// 确保 verified 字段存在（安全添加，避免重复列错误）
const tableInfo = db.prepare(`PRAGMA table_info(attendance_records)`).all();
const hasVerifiedColumn = tableInfo.some(col => col.name === 'verified');
if (!hasVerifiedColumn) {
    db.exec(`ALTER TABLE attendance_records ADD COLUMN verified INTEGER DEFAULT 1`);
    console.log('[验证任务] 已添加 verified 字段');
}

/**
 * 根据一组考勤记录重新计算 Merkle 根
 */
function computeMerkleRoot(records) {
    if (!records || records.length === 0) return null;
    const leaves = records.map(r => {
        const normalized = {
            id: r.anonymous_id,
            timestamp: Math.floor(new Date(r.time).getTime() / 1000),
            date: r.time.split('T')[0],
            action: r.status === 'present' ? 'check-in' : (r.status === 'leave' ? 'check-out' : 'check-in')
        };
        return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest();
    });
    const tree = new MerkleTree(leaves, (data) => crypto.createHash('sha256').update(data).digest(), { sortPairs: true });
    return '0x' + tree.getRoot().toString('hex');
}

/**
 * 执行全量验真
 */
export async function runVerification() {
    console.log('[验证任务] 开始全量考勤记录验真...');
    
    // 获取所有不同的 merkle_root（排除空值）
    const rootsStmt = db.prepare(`
        SELECT DISTINCT merkle_root FROM attendance_records 
        WHERE merkle_root IS NOT NULL AND merkle_root != ''
    `);
    const roots = rootsStmt.all();
    
    let totalChecked = 0;
    let mismatchCount = 0;
    
    const updateStmt = db.prepare(`UPDATE attendance_records SET verified = ? WHERE merkle_root = ?`);
    
    for (const { merkle_root } of roots) {
        // 获取该根对应的所有考勤记录
        const recordsStmt = db.prepare(`
            SELECT anonymous_id, status, time FROM attendance_records 
            WHERE merkle_root = ?
            ORDER BY time
        `);
        const records = recordsStmt.all(merkle_root);
        if (records.length === 0) continue;
        
        // 重新计算 Merkle 根
        const recomputedRoot = computeMerkleRoot(records);
        const isValid = (recomputedRoot === merkle_root);
        
        // 更新该批次所有记录的 verified 状态
        updateStmt.run(isValid ? 1 : 0, merkle_root);
        totalChecked += records.length;
        if (!isValid) mismatchCount++;
    }
    
    console.log(`[验证任务] 完成，共检查 ${totalChecked} 条记录，发现 ${mismatchCount} 个异常批次`);
    return { totalRecords: totalChecked, mismatchBatches: mismatchCount };
}

// 启动定时任务（每天凌晨2:00）
export function startScheduledVerification() {
    cron.schedule('0 2 * * *', () => {
        runVerification().catch(console.error);
    }, {
        scheduled: true,
        timezone: "Asia/Shanghai"
    });
    console.log('[验证任务] 定时任务已启动，每天 02:00 执行');
}

export default { runVerification, startScheduledVerification };