#!/usr/bin/env node

/**
 * 端到端测试：考勤数据上链完整流程
 */

import axios from 'axios';
import { Web3 } from 'web3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const BASE_URL = 'http://192.168.171.157:3002/api';
const RPC_URL = 'http://192.168.171.157:8545';

const credentials = { username: 'admin', password: 'password123' };

function generateMockRecords(count = 5) {
  const records = [];
  for (let i = 0; i < count; i++) {
    records.push({
      id: `S00${i+1}`,
      studentId: `S00${i+1}`,
      timestamp: Math.floor(Date.now() / 1000) - i * 60,
      date: new Date().toISOString().split('T')[0],
      action: 'check-in'
    });
  }
  return records;
}

async function main() {
  console.log('🚀 端到端测试开始\n');

  try {
    // 1. 登录
    console.log('1️⃣ 登录获取 token...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, credentials);
    const token = loginRes.data.token;
    console.log(`   ✅ token 获取成功 (${token.substring(0, 20)}...)`);

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. 计算默克尔根
    console.log('\n2️⃣ 计算默克尔根...');
    const records = generateMockRecords(3);
    const calcRes = await axios.post(
      `${BASE_URL}/attend/calculate-merkle-root`,
      { records },
      { headers: authHeaders }
    );
    const merkleRoot = calcRes.data.merkleRoot;
    console.log(`   ✅ 默克尔根: ${merkleRoot}`);

    // 3. 上链存证
    console.log('\n3️⃣ 上链存证...');
    const uploadRes = await axios.post(
      `${BASE_URL}/attend/upload-merkle-root`,
      { merkleRoot, attendanceDate: new Date().toISOString().split('T')[0] },
      { headers: authHeaders }
    );
    const { transactionHash, blockNumber } = uploadRes.data.data;
    console.log(`   ✅ 交易哈希: ${transactionHash}`);
    console.log(`   ✅ 区块高度: ${blockNumber}`);

    // 4. 验证链上数据
    console.log('\n4️⃣ 验证链上数据...');
    const web3 = new Web3(RPC_URL);
    const contractAddr = '0xd24180cc0feF2f3E545de4F9AAFc09345cD08903';
    const artifactPath = join(projectRoot, 'artifacts', 'AttendanceProof.json');
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;
    const contract = new web3.eth.Contract(abi, contractAddr);
    const count = await contract.methods.getMerkleRootCount().call();
    console.log(`   ✅ 链上存证总数: ${count}`);

    // 5. 验证本地数据库记录
    console.log('\n5️⃣ 验证本地数据库...');
    const historyRes = await axios.get(`${BASE_URL}/attend/attendance-history`, { headers: authHeaders });
    const latestRecord = historyRes.data.data[0];
    console.log(`   ✅ 最新存证记录:`);
    console.log(`      - 默克尔根: ${latestRecord.merkleRoot}`);
    console.log(`      - 时间: ${latestRecord.uploadTime}`);

    console.log('\n🎉 端到端测试全部通过！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();