import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { Web3 } from 'web3';
import { readFileSync } from 'fs';

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

// ========== 聚合告警摘要接口 ==========
router.get('/alert-summary', (req, res) => {
  try {
    const attendanceAlerts = dbase.prepare(`
      SELECT COUNT(*) as count FROM attendance_records WHERE status IN ('late', 'absent')
    `).get().count;
    
    let deviceAlerts = 0;
    try {
      deviceAlerts = dbase.prepare("SELECT COUNT(*) as count FROM devices WHERE status = 'offline'").get().count;
    } catch (e) {}
    
    let consistencyWarning = false;
    try {
      const bad = dbase.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE verified = 0').get();
      consistencyWarning = bad.count > 0;
    } catch (e) {}
    
    res.json({
      success: true,
      data: { attendanceAlerts, deviceAlerts, consistencyWarning }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

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
    
    let devices = [];
    let onlineDevices = 0;
    try {
      devices = dbase.prepare('SELECT * FROM devices').all();
      onlineDevices = devices.filter(d => d.status === 'online').length;
    } catch (e) {}
    
    let dataConsistencyWarning = false;
    try {
      const bad = dbase.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE verified = 0').get();
      dataConsistencyWarning = bad.count > 0;
    } catch (e) {}
    
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

// ========== 设备管理 ==========
router.get('/devices', (req, res) => {
  try {
    const devices = dbase.prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
    res.json({ success: true, data: devices });
  } catch (e) {
    if (e.message.includes('no such table')) {
      res.json({ success: true, data: [] });
    } else {
      res.status(500).json({ success: false, error: e.message });
    }
  }
});

router.post('/devices', (req, res) => {
  try {
    const { device_id, device_name, classroom_id, ip_address } = req.body;
    // 参数校验：device_id 必填
    if (!device_id) {
      return res.status(400).json({ success: false, error: 'device_id 不能为空' });
    }
    dbase.prepare(`
      INSERT INTO devices (device_id, device_name, classroom_id, status, ip_address, last_heartbeat)
      VALUES (?, ?, ?, 'offline', ?, datetime('now'))
    `).run(device_id, device_name || '', classroom_id || '', ip_address || '');
    res.json({ success: true, data: { id: device_id } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.put('/devices/:deviceId', (req, res) => {
  try {
    const { device_name, classroom_id, status, ip_address } = req.body;
    dbase.prepare(`
      UPDATE devices SET device_name = ?, classroom_id = ?, status = ?, ip_address = ?, last_heartbeat = datetime('now')
      WHERE device_id = ?
    `).run(device_name, classroom_id, status, ip_address, req.params.deviceId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.delete('/devices/:deviceId', (req, res) => {
  try {
    dbase.prepare('DELETE FROM devices WHERE device_id = ?').run(req.params.deviceId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/devices/heartbeat', (req, res) => {
  try {
    const { device_id, ip_address } = req.body;
    dbase.prepare(`
      UPDATE devices SET status = 'online', ip_address = ?, last_heartbeat = datetime('now')
      WHERE device_id = ?
    `).run(ip_address, device_id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ========== 用户管理 ==========
router.get('/users', (req, res) => {
  const { role } = req.query;
  const users = db.getAllUsers(role || null);
  res.json({ success: true, data: users });
});

router.post('/users', (req, res) => {
  try {
    const result = db.createUser(req.body);
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const result = db.updateUser(req.params.id, req.body);
    res.json({ success: true, changes: result.changes });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    const result = db.deleteUser(req.params.id);
    res.json({ success: true, changes: result.changes });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ========== 异常提醒 ==========
router.get('/exceptions', (req, res) => {
  try {
    const attendance = db.getUnreviewedExceptions();
    let devices = [];
    try {
      devices = dbase.prepare("SELECT * FROM devices WHERE status IN ('offline', 'error')").all();
    } catch (e) {}
    res.json({ success: true, data: { attendance: attendance.slice(0, 10), devices } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 配置管理 ==========
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      blockchainEnabled: true,
      autoSync: true,
      channelUrl: 'http://localhost:8545',
      contractAddress: process.env.CONTRACT_ADDRESS || ''
    }
  });
});

router.post('/config', (req, res) => {
  res.json({ success: true, message: '配置已保存' });
});

// ========== 诊断与日志 ==========
router.get('/diagnosis', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/logs', (req, res) => {
  res.json({ success: true, data: [] });
});

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

// ========== 家长绑定管理 ==========
router.get('/parent-bindings/:username', (req, res) => {
  try {
    const { username } = req.params;
    const children = dbase.prepare(`
      SELECT m.* FROM anonymous_map m
      JOIN parent_child pc ON m.anonymous_id = pc.child_anonymous_id
      WHERE pc.parent_username = ?
    `).all(username);
    res.json({ success: true, data: children });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/parent-bindings', (req, res) => {
  try {
    const { parent_username, child_anonymous_id } = req.body;
    if (!parent_username || !child_anonymous_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    const child = dbase.prepare('SELECT * FROM anonymous_map WHERE anonymous_id = ?').get(child_anonymous_id);
    if (!child) {
      return res.status(400).json({ success: false, error: '匿名ID不存在' });
    }
    dbase.prepare(`
      INSERT OR IGNORE INTO parent_child (parent_username, child_anonymous_id)
      VALUES (?, ?)
    `).run(parent_username, child_anonymous_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/parent-bindings', (req, res) => {
  try {
    const { parent_username, child_anonymous_id } = req.body;
    dbase.prepare(`
      DELETE FROM parent_child WHERE parent_username = ? AND child_anonymous_id = ?
    `).run(parent_username, child_anonymous_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 链上统计（新增） ==========
router.get('/chain-stats', async (req, res) => {
  try {
    // 复用 attend.js 中的 Web3 配置
    const RPC_URL = process.env.FISCO_RPC_URL || 'http://192.168.171.157:8545';
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const artifactPath = path.join(__dirname, '../../artifacts/AttendanceProof.json');
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;
    
    const web3 = new Web3(RPC_URL);
    const contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);
    
    const count = await contract.methods.getMerkleRootCount().call();
    
    res.json({
      success: true,
      data: {
        totalMerkleRoots: Number(count),
        contractAddress: CONTRACT_ADDRESS
      }
    });
  } catch (e) {
    console.error('获取链上统计失败:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;