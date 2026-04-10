// 考勤存证系统后端入口（FISCO BCOS 迁移版）
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { PORT, ALLOWED_ORIGINS, validateContractAddress, ATTENDANCE_STORAGE_PATH } from './config.js';
import authRouter from './routes/auth.js';
import attendRouter from './routes/attend.js';
import historyRouter from './routes/history.js';
import debugRouter from './routes/debug.js';
import protectedRouter from './routes/protected.js';
import { authenticateToken } from './middleware/auth.js';
import { restoreContractState } from './utils/contractManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 中间件
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（考勤元数据文件）
app.use('/api/attendance-files', express.static(ATTENDANCE_STORAGE_PATH));

// 路由注册
app.use('/api/auth', authRouter);
app.use('/api/attend', attendRouter);      // 考勤存证核心路由
app.use('/api/history', historyRouter);
app.use('/api/debug', debugRouter);
app.use('/api/protected', authenticateToken, protectedRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务
async function startServer() {
  try {
    // 确保存储目录存在
    if (!fs.existsSync(ATTENDANCE_STORAGE_PATH)) {
      fs.mkdirSync(ATTENDANCE_STORAGE_PATH, { recursive: true });
      console.log(`📁 创建存储目录: ${ATTENDANCE_STORAGE_PATH}`);
    }
    
    // 验证合约部署状态（可选）
    await validateContractAddress().catch(() => console.warn('⚠️ 合约地址验证失败，请先部署合约'));
    
    app.listen(PORT, () => {
      console.log(`🚀 考勤存证后端服务启动成功！`);
      console.log(`📍 端口: ${PORT}`);
      console.log(`🌐 API地址: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;
