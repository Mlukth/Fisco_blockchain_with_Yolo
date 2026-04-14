import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 路由导入
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import parentRoutes from './routes/parent.js';
import attendRoutes from './routes/attend.js';
import adminVerifyRoutes from './routes/admin-verify.js';

// 定时验真任务
import verificationScheduler from './utils/verificationScheduler.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// 启动定时验真任务（每天凌晨2点）
verificationScheduler.startScheduledVerification();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminVerifyRoutes);      // 附加管理员验证接口
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/attend', attendRoutes);

// 404 处理
app.use((req, res) => {
    res.status(404).json({ success: false, error: '接口不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    res.status(500).json({ success: false, error: '服务器内部错误' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 后端服务启动成功，端口: ${PORT}`);
    console.log(`📡 健康检查: http://localhost:${PORT}/api/health`);
});

export default app;