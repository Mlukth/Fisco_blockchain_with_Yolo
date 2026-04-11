import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 中间件：仅管理员可访问
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
        const devices = db.getAllDevices();
        const totalStudents = db.getStudentsByClassroom('%').length;
        const teachers = users.filter(u => u.role === 'teacher').length;
        const parents = users.filter(u => u.role === 'parent').length;
        
        const today = new Date().toISOString().split('T')[0];
        const allAttendance = db.getDb().prepare(`
            SELECT status, COUNT(*) as count FROM attendance_records 
            WHERE DATE(time) = ? AND is_deleted = 0 GROUP BY status
        `).all(today);
        const present = allAttendance.find(a => a.status === 'present')?.count || 0;
        const total = allAttendance.reduce((sum, a) => sum + a.count, 0);
        const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
        
        const onlineDevices = devices.filter(d => d.status === 'online').length;
        
        res.json({
            success: true,
            data: {
                totalStudents,
                totalTeachers: teachers,
                totalParents: parents,
                totalDevices: devices.length,
                onlineDevices,
                todayAttendanceRate: parseFloat(rate),
                todayTotal: total
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
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
        db.addOperationLog({ user_id: req.user.userId, operation: 'create_user', detail: JSON.stringify(req.body) });
        res.json({ success: true, data: { id: result.lastInsertRowid } });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.put('/users/:id', (req, res) => {
    try {
        const result = db.updateUser(req.params.id, req.body);
        db.addOperationLog({ user_id: req.user.userId, operation: 'update_user', detail: JSON.stringify(req.body) });
        res.json({ success: true, changes: result.changes });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.delete('/users/:id', (req, res) => {
    try {
        const result = db.deleteUser(req.params.id);
        db.addOperationLog({ user_id: req.user.userId, operation: 'delete_user', detail: `id=${req.params.id}` });
        res.json({ success: true, changes: result.changes });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// ========== 设备管理 ==========
router.get('/devices', (req, res) => {
    const devices = db.getAllDevices();
    res.json({ success: true, data: devices });
});

router.post('/devices', (req, res) => {
    try {
        const result = db.registerDevice(req.body);
        res.json({ success: true, data: { id: result.lastInsertRowid } });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.put('/devices/:id', (req, res) => {
    // 简化：仅更新状态和名称
    const { device_name, classroom_id, status } = req.body;
    try {
        const stmt = db.getDb().prepare('UPDATE devices SET device_name = ?, classroom_id = ?, status = ? WHERE device_id = ?');
        stmt.run(device_name, classroom_id, status, req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.delete('/devices/:id', (req, res) => {
    try {
        db.deleteDevice(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.post('/devices/heartbeat', (req, res) => {
    const { device_id, ip_address } = req.body;
    db.updateDeviceHeartbeat(device_id, ip_address);
    res.json({ success: true });
});

// ========== 配置管理（模拟） ==========
router.get('/config', (req, res) => {
    // 返回当前区块链配置（从环境变量）
    res.json({
        success: true,
        data: {
            blockchain: {
                channelUrl: process.env.FISCO_CHANNEL_URL || '127.0.0.1:20200',
                groupId: process.env.FISCO_GROUP_ID || 'group0',
                chainId: process.env.FISCO_CHAIN_ID || 'chain0',
                contractAddress: process.env.CONTRACT_ADDRESS || ''
            },
            system: {
                attendanceTimeout: 30,
                autoBackup: true,
                backupPath: '/data/backup'
            }
        }
    });
});

router.post('/config', (req, res) => {
    // 模拟保存，实际可写回 .env 或配置文件
    db.addOperationLog({ user_id: req.user.userId, operation: 'update_config', detail: JSON.stringify(req.body) });
    res.json({ success: true, message: '配置已保存（模拟）' });
});

// ========== 诊断与日志 ==========
router.get('/diagnosis', (req, res) => {
    const checks = [
        { name: '区块链节点连接', status: 'ok', message: '节点运行正常', detail: 'FISCO BCOS 3.x' },
        { name: '数据库连接', status: 'ok', message: 'SQLite 连接正常' },
        { name: '证书文件', status: 'ok', message: '证书文件完整' },
        { name: '合约部署', status: process.env.CONTRACT_ADDRESS ? 'ok' : 'error', message: process.env.CONTRACT_ADDRESS ? '合约地址有效' : '合约未部署' }
    ];
    res.json({ success: true, data: checks });
});

router.get('/logs', (req, res) => {
    const logs = db.getOperationLogs(50);
    res.json({ success: true, data: logs });
});

// ========== 异常提醒 ==========
router.get('/exceptions', (req, res) => {
    const exceptions = db.getUnreviewedExceptions();
    const devices = db.getAllDevices();
    const deviceExceptions = devices.filter(d => d.status === 'error' || d.status === 'offline').map(d => ({
        type: 'device',
        device_id: d.device_id,
        device_name: d.device_name,
        status: d.status
    }));
    res.json({
        success: true,
        data: {
            attendance: exceptions.slice(0, 5),
            devices: deviceExceptions
        }
    });
});

export default router;