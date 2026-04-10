/**
 * 端到端数据流验证（考勤存证版）
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Web3 = require('@fisco/bcos-node-sdk');
const config = require('./config');

const SERVER_URL = 'http://localhost:3002';
const TEST_USER = { username: 'admin', password: 'password123' };
const TEST_DATA = [
    { studentId: 'S001', timestamp: Math.floor(Date.now()/1000) },
    { studentId: 'S002', timestamp: Math.floor(Date.now()/1000) }
];

async function login() {
    const res = await axios.post(`${SERVER_URL}/api/auth/login`, TEST_USER);
    return res.data.token;
}

async function main() {
    console.log('🚀 开始端到端考勤存证验证');
    try {
        const token = await login();
        const authHeader = { Authorization: `Bearer ${token}` };
        
        // 1. 生成默克尔根
        console.log('\n=== 1. 生成默克尔根 ===');
        const rootRes = await axios.post(`${SERVER_URL}/api/attend/calculate-merkle-root`, 
            { records: TEST_DATA }, { headers: authHeader });
        const merkleRoot = rootRes.data.merkleRoot;
        console.log(`✅ 默克尔根: ${merkleRoot}`);
        
        // 2. 上链
        console.log('\n=== 2. 上链存证 ===');
        const attendanceDate = Math.floor(Date.now() / 1000);
        const uploadRes = await axios.post(`${SERVER_URL}/api/attend/upload-merkle-root`,
            { merkleRoot, attendanceDate }, { headers: authHeader });
        console.log(`✅ 上链成功，区块: ${uploadRes.data.blockHeight}`);
        
        // 3. 链上验证
        console.log('\n=== 3. 链上验证 ===');
        const web3 = new Web3(config.rpcUrl);
        const abi = config.getContractABI();
        const contract = new web3.eth.Contract(abi, config.contractAddress);
        const exists = await contract.methods.isMerkleRootValid(merkleRoot).call();
        console.log(`🔗 链上存在: ${exists}`);
        
        // 4. 历史记录
        console.log('\n=== 4. 历史记录验证 ===');
        const historyRes = await axios.get(`${SERVER_URL}/api/attend/attendance-history`, { headers: authHeader });
        const record = historyRes.data.data.find(r => r.merkleRoot === merkleRoot);
        console.log(`📋 历史记录: ${record ? '已记录' : '缺失'}`);
        
        // 5. 删除（可选）
        console.log('\n=== 5. 删除记录 ===');
        await axios.delete(`${SERVER_URL}/api/attend/attendance-record/${merkleRoot}`, { headers: authHeader });
        console.log('🗑️ 记录已软删除');
        
        console.log('\n✅ 端到端验证完成');
    } catch (error) {
        console.error('❌ 验证失败:', error.response?.data || error.message);
    }
}

main();