/**
 * 三方状态一致性校验（链上-数据库-文件系统）
 */
const fs = require('fs');
const path = require('path');
const Web3 = require('@fisco/bcos-node-sdk');
const config = require('./config');
const db = require('../server/db/index.js');

async function verifyConsistency() {
    console.log('🔗 考勤存证状态一致性验证');
    
    // 1. 链上状态
    const web3 = new Web3(config.rpcUrl);
    const abi = config.getContractABI();
    const contract = new web3.eth.Contract(abi, config.contractAddress);
    const chainRoots = await contract.methods.getAllMerkleRoots().call();
    console.log(`- 链上默克尔根数量: ${chainRoots.length}`);
    
    // 2. 数据库状态
    const dbRecords = db.getActiveAttendanceRecords();
    console.log(`- 数据库活跃记录数: ${dbRecords.length}`);
    
    // 3. 文件系统（考勤元数据文件）
    const storagePath = path.join(__dirname, '../server/attendance_storage');
    let fileCount = 0;
    if (fs.existsSync(storagePath)) {
        fileCount = fs.readdirSync(storagePath).length;
    }
    console.log(`- 存储文件数: ${fileCount}`);
    
    // 一致性检查
    const chainSet = new Set(chainRoots.map(r => r.toLowerCase()));
    const dbSet = new Set(dbRecords.map(r => r.merkle_root.toLowerCase()));
    
    const missingInDb = [...chainSet].filter(r => !dbSet.has(r));
    const missingInChain = [...dbSet].filter(r => !chainSet.has(r));
    
    if (missingInDb.length) console.log(`❌ 链上有 ${missingInDb.length} 个根不在数据库中`);
    if (missingInChain.length) console.log(`❌ 数据库有 ${missingInChain.length} 个根未上链`);
    
    if (missingInDb.length === 0 && missingInChain.length === 0) {
        console.log('✅ 链上与数据库状态一致');
    } else {
        console.log('⚠️ 建议运行同步脚本');
    }
}

verifyConsistency().catch(console.error);