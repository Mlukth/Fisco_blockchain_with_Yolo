import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authenticateToken = (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: '未提供认证令牌' });
    }
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role
        };
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: '令牌无效或已过期' });
    }
};

// 可选的角色校验中间件
export const requireRole = (role) => (req, res, next) => {
    if (req.user.role !== role && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: `需要 ${role} 权限` });
    }
    next();
};