import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../data/users.db');
const dbase = new Database(dbPath);

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '需要管理员权限' });
  }
  next();
};

router.use(authenticateToken);
router.use(adminOnly);

// ========== 统计仪表盘 ==========
router.get('/stats', (req, res) => {
  try {
    const users = db.getAllUsers();
    const teachers = users.filter(u => u.role === 'teacher').length;
    const parents = users.filter(u => u.role === 'parent').length;
    const totalStudents = db.getTotalStudentCount();
    const todayStats = db.getTodayStats();
    const present = todayStats.present;
    const total = todayStats.total;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    
    // 设备统计
    let devices = [];
    let onlineDevices = 0;
    try {
      devices = dbase.prepare('SELECT * FROM devices').all();
      onlineDevices = devices.filter(d => d.status === 'online').length;
    } catch (e) {
      console.warn('设备表不存在，跳过设备统计');
    }
    
    // 检查数据一致性告警（存在 verified=0 的记录则告警）
    let dataConsistencyWarning = false;
    try {
      const bad = dbase.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE verified = 0').get();
      dataConsistencyWarning = bad.count > 0;
    } catch (e) {
      // 字段可能不存在，忽略
    }
    
    res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers: teachers,
        totalParents: parents,
        totalDevices: devices.length,
        onlineDevices,
        todayAttendanceRate: parseFloat(rate),
        todayTotal: total,
        dataConsistencyWarning
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 设备管理（原有代码保持不变，此处省略以节省篇幅，实际使用时保留原有实现） ==========
// ... 此处保留原有的设备管理、用户管理、异常提醒、配置管理等路由代码 ...

// ========== 手动触发验真 ==========
router.post('/verify-all', async (req, res) => {
  try {
    const { runVerification } = await import('../utils/verificationScheduler.js');
    const result = await runVerification();
    res.json({
      success: true,
      message: '验真完成',
      data: {
        totalRecords: result.totalRecords,
        mismatchBatches: result.mismatchBatches
      }
    });
  } catch (error) {
    console.error('手动验真失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;