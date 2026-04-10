/**
 * 历史记录路由（适配考勤存证表）
 */
import express from 'express';
import { getAllAttendanceHistory, purgeDeletedRecords, resetAttendanceTable, getDb } from '../db/index.js';
import { ALLOW_FULL_RESET, ATTENDANCE_STORAGE_PATH } from '../config.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const router = express.Router();

// 获取历史记录
router.get('/', async (req, res) => {
    try {
        const dbHistory = await getAllAttendanceHistory();
        const formatted = dbHistory.map(item => ({
            id: item.id,
            merkleRoot: item.merkle_root,
            attendanceDate: item.attendance_date,
            uploadTime: item.upload_time,
            blockHeight: item.block_height,
            status: item.is_deleted ? 'deleted' : 'confirmed',
            metadata: item.metadata ? JSON.parse(item.metadata) : null
        }));
        res.json(formatted);
    } catch (error) {
        console.error('获取历史记录失败:', error);
        res.status(500).json({ success: false, error: '获取历史记录失败' });
    }
});

// 清除已删除记录
router.delete('/clear-all', async (req, res) => {
    try {
        const deletedCount = purgeDeletedRecords();
        res.json({ success: true, message: `已清除 ${deletedCount} 条已删除记录`, clearedCount: deletedCount });
    } catch (error) {
        console.error('清除失败:', error);
        res.status(500).json({ success: false, error: '清除失败' });
    }
});

// 完全重置
router.post('/reset-all', async (req, res) => {
    if (!ALLOW_FULL_RESET) {
        return res.status(403).json({ success: false, error: '此操作在生产环境被禁用' });
    }
    try {
        const deletedCount = resetAttendanceTable();
        
        // 清空考勤存储目录（如果有文件存储）
        if (fs.existsSync(ATTENDANCE_STORAGE_PATH)) {
            fs.emptyDirSync(ATTENDANCE_STORAGE_PATH);
        }
        
        res.json({ success: true, message: `已重置，删除 ${deletedCount} 条记录` });
    } catch (error) {
        console.error('完全重置失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;