import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { PORT, ALLOWED_ORIGINS, ATTENDANCE_STORAGE_PATH, BLOCKCHAIN_CONFIG, validateConfig } from './config.js';

import authRouter from './routes/auth.js';
import attendRouter from './routes/attend.js';
import historyRouter from './routes/history.js';
import debugRouter from './routes/debug.js';
import protectedRouter from './routes/protected.js';
import adminRouter from './routes/admin.js';
import teacherRouter from './routes/teacher.js';
import parentRouter from './routes/parent.js';

import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/attendance-files', express.static(ATTENDANCE_STORAGE_PATH));

// 路由注册
app.use('/api/auth', authRouter);
app.use('/api/attend', attendRouter);
app.use('/api/history', historyRouter);
app.use('/api/debug', debugRouter);
app.use('/api/protected', authenticateToken, protectedRouter);

// 新增角色路由
app.use('/api/admin', adminRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/parent', parentRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/blockchain/status', (req, res) => {
    res.json({
        connected: !!BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS,
        channelUrl: BLOCKCHAIN_CONFIG.CHANNEL_URL,
        groupId: BLOCKCHAIN_CONFIG.GROUP_ID,
        chainId: BLOCKCHAIN_CONFIG.CHAIN_ID,
        contractAddress: BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS || null
    });
});

async function startServer() {
    try {
        if (!fs.existsSync(ATTENDANCE_STORAGE_PATH)) {
            fs.mkdirSync(ATTENDANCE_STORAGE_PATH, { recursive: true });
        }
        if (BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS) {
            validateConfig();
        } else {
            console.warn('⚠️ 合约地址未设置，请先部署合约');
        }
        app.listen(PORT, () => {
            console.log(`🚀 考勤系统后端启动成功！端口: ${PORT}`);
        });
    } catch (error) {
        console.error('❌ 服务启动失败:', error);
        process.exit(1);
    }
}

startServer();

export default app;