import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from '../db/index.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 登录接口
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

        const validPassword = bcrypt.compareSync(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }

        // 生成 token，payload 包含 userId, username, role
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 返回用户信息（不包含密码哈希）
        const userInfo = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.username  // 可扩展真实姓名
        };

        res.json({
            success: true,
            token,
            user: userInfo
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 登出（前端清除 token 即可，后端可选实现）
router.post('/logout', (req, res) => {
    res.json({ success: true, message: '已登出' });
});

// 刷新 token（可选）
router.post('/refresh', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: '未提供令牌' });
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // 重新签发，延长有效期
        const newToken = jwt.sign(
            { userId: decoded.userId, username: decoded.username, role: decoded.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ success: true, token: newToken });
    } catch (error) {
        res.status(401).json({ success: false, error: '令牌无效' });
    }
});

export default router;