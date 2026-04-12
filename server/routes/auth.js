import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// 登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
        }

        const user = db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ success: false, error: '服务器内部错误' });
    }
});

// 刷新令牌
router.post('/refresh-token', authenticateToken, (req, res) => {
    try {
        const token = jwt.sign(
            { userId: req.user.userId, username: req.user.username, role: req.user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, error: '令牌刷新失败' });
    }
});

// 登出（前端清除 token 即可）
router.post('/logout', authenticateToken, (req, res) => {
    res.json({ success: true, message: '已登出' });
});

// 获取当前用户信息
router.get('/profile', authenticateToken, (req, res) => {
    const user = db.getUserById(req.user.userId);
    if (!user) {
        return res.status(404).json({ success: false, error: '用户不存在' });
    }
    res.json({ success: true, user });
});

export default router;