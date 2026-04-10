/**
 * 系统综合检查（FISCO BCOS 考勤存证版）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import db from '../server/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

async function systemCheck() {
    console.log('🛠️ 开始考勤存证系统检查');
    
    try {
        // 1. 数据库
        const records = db.getAllAttendanceHistory();
        console.log(`📊 数据库记录数: ${records.length}`);
        
        // 2. 考勤存储目录
        const storagePath = path.join(__dirname, '../server/attendance_storage');
        console.log(`📂 存储目录: ${storagePath}`);
        if (fs.existsSync(storagePath)) {
            const files = fs.readdirSync(storagePath);
            console.log(`  文件数: ${files.length}`);
        } else {
            console.log('  ❌ 目录不存在');
        }
        
        // 3. FISCO 区块链连接
        const config = require('./config.js');
        console.log(`🔗 RPC: ${config.rpcUrl}, 合约: ${config.contractAddress}`);
        
        const Web3 = (await import('@fisco/bcos-node-sdk')).default;
        const web3 = new Web3(config.rpcUrl);
        const blockNumber = await web3.eth.getBlockNumber();
        console.log(`  当前区块高度: ${blockNumber}`);
        
        // 检查合约
        const abi = config.getContractABI();
        const contract = new web3.eth.Contract(abi, config.contractAddress);
        const count = await contract.methods.getMerkleRootCount().call();
        console.log(`  链上默克尔根数量: ${count}`);
        
        console.log('✅ 系统检查完成');
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
    }
}

systemCheck();