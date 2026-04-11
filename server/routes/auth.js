import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from '../db/index.js';
import { validateLogin } from '../middleware/validation.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

router.post('/login', validateLogin, async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = db.getUserByUsername(username);
        
        if (!user) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }
        
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }
        
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        db.addOperationLog({ user_id: user.id, operation: 'login', ip_address: req.ip });
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name || user.username,
                classroom_id: user.classroom_id,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/refresh-token', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: '未提供令牌' });
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
        const user = db.getUserById(decoded.userId);
        if (!user) return res.status(401).json({ success: false, error: '用户不存在' });
        
        const newToken = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ success: true, token: newToken });
    } catch (e) {
        res.status(401).json({ success: false, error: '无效令牌' });
    }
});

router.post('/logout', (req, res) => {
    res.json({ success: true, message: '已登出' });
});

router.get('/profile', authenticateToken, (req, res) => {
    const user = db.getUserById(req.user.userId);
    res.json({ success: true, profile: user });
});

// 导入 authenticateToken 用于此文件
import { authenticateToken } from '../middleware/auth.js';

export default router;