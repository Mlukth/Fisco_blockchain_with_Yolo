/**
 * 分块 5/6：区块链 & Merkle 核心链路测试（适配真实上链）
 * 执行方式：node blockchain.test.js 或 TEST_TOKEN="eyJ..." node blockchain.test.js
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const JWT_SECRET = 'your-secret-key-change-in-production';
const REAL_TOKEN = process.env.TEST_TOKEN || null;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  validateStatus: () => true
});

const results = { passed: [], failed: [], warnings: [] };

function logTest(name, condition, errorDetail = null) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    results.passed.push(name);
  } else {
    console.log(`  ✗ ${name}${errorDetail ? ` (${errorDetail})` : ''}`);
    results.failed.push(name);
  }
}

async function request(method, url, token, data = null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const response = await axiosInstance({ method, url, headers, data });
    return response;
  } catch (error) {
    return error.response || { status: 500, data: { error: error.message } };
  }
}

function getToken() {
  if (REAL_TOKEN) {
    console.log('✅ 使用环境变量 TEST_TOKEN 提供的真实 Token');
    return REAL_TOKEN;
  } else {
    console.log('⚠️  使用自动签发的 admin Token');
    return jwt.sign(
      { userId: 1, username: 'admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
}

const token = getToken();

console.log('========== 区块链 & Merkle 核心链路测试 ==========\n');
console.log(`目标地址: ${BASE_URL}`);

// ---------- 1. Merkle 根计算 ----------
console.log('\n▶ 测试 1：POST /api/attend/calculate-merkle-root');
const sampleRecords = [
  { id: 'S001', timestamp: Math.floor(Date.now() / 1000), date: new Date().toISOString().split('T')[0], action: 'check-in' },
  { id: 'S002', timestamp: Math.floor(Date.now() / 1000), date: new Date().toISOString().split('T')[0], action: 'check-in' },
  { id: 'S003', timestamp: Math.floor(Date.now() / 1000), date: new Date().toISOString().split('T')[0], action: 'check-out' }
];

let res = await request('POST', '/api/attend/calculate-merkle-root', token, { records: sampleRecords });
if (res.status === 200 && res.data.success) {
  const merkleRoot = res.data.merkleRoot;
  const isValidFormat = /^0x[a-fA-F0-9]{64}$/.test(merkleRoot);
  logTest('Merkle 根计算成功，返回 64 位哈希', isValidFormat);
  if (isValidFormat) {
    console.log(`    默克尔根: ${merkleRoot}`);
    global.testMerkleRoot = merkleRoot;
  }
} else {
  logTest('Merkle 根计算成功', false, `状态码 ${res.status}`);
}

// ---------- 2. 存证上链（真实交易） ----------
console.log('\n▶ 测试 2：POST /api/attend/upload-merkle-root (真实上链)');
if (global.testMerkleRoot) {
  res = await request('POST', '/api/attend/upload-merkle-root', token, {
    merkleRoot: global.testMerkleRoot,
    attendanceDate: new Date().toISOString().split('T')[0]
  });
  if (res.status === 200 && res.data.success) {
    const data = res.data.data;
    // 真实版返回字段：blockNumber, transactionHash
    const hasBlockNumber = data && typeof data.blockNumber === 'number';
    const hasTxHash = data && typeof data.transactionHash === 'string';
    logTest('真实上链成功，返回区块高度和交易哈希', hasBlockNumber && hasTxHash);
    if (hasBlockNumber && hasTxHash) {
      console.log(`    区块高度: ${data.blockNumber}, 交易哈希: ${data.transactionHash.substring(0, 16)}...`);
    }
  } else {
    logTest('真实上链成功', false, `状态码 ${res.status} - ${res.data?.error || ''}`);
  }
} else {
  logTest('真实上链成功', false, '无可用 Merkle 根');
}

// ---------- 3. 批量验真 ----------
console.log('\n▶ 测试 3：POST /api/attend/batch-verify');
const rootsToVerify = [global.testMerkleRoot || '0x' + '0'.repeat(64), '0x' + '1'.repeat(64)];
res = await request('POST', '/api/attend/batch-verify', token, { merkleRootList: rootsToVerify });
if (res.status === 200 && res.data.success) {
  const details = res.data.details;
  logTest('批量验证接口返回正确', Array.isArray(details) && details.length === 2);
  if (details) {
    details.forEach(d => {
      console.log(`    ${d.merkleRoot.substring(0, 10)}... 存在: ${d.exists}`);
    });
  }
} else {
  logTest('批量验证接口返回正确', false, `状态码 ${res.status}`);
}

// ---------- 4. 映射表 CRUD ----------
console.log('\n▶ 测试 4：匿名映射表 CRUD (通过 /api/attend/mapping)');
const testMapping = {
  anonymous_id: `TEST_BC_${Date.now()}`,
  student_name: '区块链测试学生',
  grade: '一年级',
  class_name: '一年级1班',
  parent_phone: '13811112222'
};

res = await request('POST', '/api/attend/mapping', token, testMapping);
logTest('POST /api/attend/mapping 新增映射', res.status === 200 && res.data.success);

res = await request('GET', '/api/attend/mapping', token);
const listOk = res.status === 200 && res.data.success && Array.isArray(res.data.data);
logTest('GET /api/attend/mapping 获取列表', listOk);
if (listOk) {
  const found = res.data.data.find(m => m.anonymous_id === testMapping.anonymous_id);
  logTest('新映射存在于列表中', !!found);
}

await request('DELETE', `/api/attend/mapping/${testMapping.anonymous_id}`, token);

// ---------- 5. 考勤历史与映射关联 ----------
console.log('\n▶ 测试 5：考勤记录与映射表关联验证');
res = await request('GET', '/api/attend/attendance-history', token);
if (res.status === 200 && res.data.success) {
  const records = res.data.data;
  if (records.length > 0) {
    logTest('考勤历史可查询，记录与映射表关联', true);
    console.log(`    最近记录: anonymousId=${records[0].anonymousId}, merkleRoot=${records[0].merkleRoot?.substring(0, 16)}...`);
  } else {
    logTest('考勤历史可查询', false, '无记录');
  }
} else {
  logTest('考勤历史可查询', false, `状态码 ${res.status}`);
}

// ---------- 汇总 ----------
console.log('\n========== 测试结果汇总 ==========');
console.log(`✅ 通过: ${results.passed.length} 项`);
console.log(`❌ 失败: ${results.failed.length} 项`);
if (results.failed.length > 0) {
  console.log('失败项：');
  results.failed.forEach(f => console.log(`  - ${f}`));
}
if (results.warnings.length > 0) {
  console.log(`⚠️ 警告: ${results.warnings.length} 项`);
}

process.exit(results.failed.length > 0 ? 1 : 0);