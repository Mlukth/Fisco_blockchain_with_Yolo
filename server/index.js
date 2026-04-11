/**
 * 考勤存证系统后端入口 - FISCO BCOS 3.x 版本
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { 
  PORT, 
  ALLOWED_ORIGINS, 
  validateConfig, 
  ATTENDANCE_STORAGE_PATH,
  BLOCKCHAIN_CONFIG
} from './config.js';

import authRouter from './routes/auth.js';
import attendRouter from './routes/attend.js';
import historyRouter from './routes/history.js';
import debugRouter from './routes/debug.js';
import protectedRouter from './routes/protected.js';
import { authenticateToken } from './middleware/auth.js';

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
app.use('/api/attend', attendRouter);  // 考勤存证核心路由
app.use('/api/history', historyRouter);
app.use('/api/debug', debugRouter);
app.use('/api/protected', authenticateToken, protectedRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    blockchain: {
      channelUrl: BLOCKCHAIN_CONFIG.CHANNEL_URL,
      groupId: BLOCKCHAIN_CONFIG.GROUP_ID,
      contractAddress: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS || '未设置'
    }
  });
});

// 区块链连接状态检查
app.get('/api/blockchain/status', (req, res) => {
  res.json({
    connected: !!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS,
    channelUrl: BLOCKCHAIN_CONFIG.CHANNEL_URL,
    groupId: BLOCKCHAIN_CONFIG.GROUP_ID,
    chainId: BLOCKCHAIN_CONFIG.CHAIN_ID,
    contractAddress: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS || null
  });
});

// 启动服务
async function startServer() {
  try {
    // 确保存储目录存在
    if (!fs.existsSync(ATTENDANCE_STORAGE_PATH)) {
      fs.mkdirSync(ATTENDANCE_STORAGE_PATH, { recursive: true });
      console.log(`📁 创建存储目录: ${ATTENDANCE_STORAGE_PATH}`);
    }

    // 验证配置（包括合约地址和证书）
    console.log('🔍 验证区块链配置...');
    if (BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
      validateConfig();
    } else {
      console.warn('⚠️ 合约地址未设置，请先部署合约后再启动完整功能');
      console.warn('   运行: npm run deploy');
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 考勤存证后端服务启动成功！');
      console.log(`📍 端口: ${PORT}`);
      console.log(`🌐 API地址: http://localhost:${PORT}/api`);
      console.log(`🔗 区块链: ${BLOCKCHAIN_CONFIG.CHANNEL_URL}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;