#!/usr/bin/env node

/**
 * 智慧课堂考勤存证系统 - 核心功能自动化测试脚本（修正版 v2）
 * 跳过合约相关测试当合约未部署时
 */

const BASE_URL = process.env.API_BASE_URL || 'http://192.168.171.157:3002/api';

const TEST_ACCOUNTS = {
  admin: { username: 'admin', password: 'password123' },
  teacher: { username: 'teacher', password: 'password123' },
  parent: { username: 'parent', password: 'password123' }
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testResults = [];
let authTokens = {};

async function request(method, endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  const config = { method, headers };
  if (options.body) config.body = JSON.stringify(options.body);
  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

function log(level, message) {
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[✓]${colors.reset}`,
    error: `${colors.red}[✗]${colors.reset}`,
    warning: `${colors.yellow}[!]${colors.reset}`,
    test: `${colors.cyan}[TEST]${colors.reset}`
  }[level] || '';
  console.log(`${prefix} ${message}`);
}

function recordTest(name, passed, details = '') {
  testResults.push({ name, passed, details });
  const status = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
  console.log(`  ${status} ${name}${details ? ` - ${details}` : ''}`);
}

// ==================== 测试用例 ====================

async function testHealthCheck() {
  log('test', '健康检查');
  const res = await request('GET', '/health');
  const passed = res.status === 200 && res.data.status === 'ok';
  recordTest('GET /health', passed, res.status === 200 ? '服务正常' : `状态码 ${res.status}`);
  return passed;
}

async function testLogin(role) {
  const account = TEST_ACCOUNTS[role];
  log('test', `登录 - ${role} (${account.username})`);
  const res = await request('POST', '/auth/login', { body: account });
  const passed = res.status === 200 && res.data.success && res.data.token;
  if (passed) {
    authTokens[role] = res.data.token;
    recordTest(`POST /auth/login (${role})`, true, '获取 token 成功');
  } else {
    recordTest(`POST /auth/login (${role})`, false, res.data.error || '登录失败');
  }
  return passed;
}

async function testAdminEndpoints() {
  const token = authTokens.admin;
  if (!token) {
    recordTest('管理员 API', false, '未获取到 token');
    return false;
  }
  log('test', '管理员 API 测试');
  let res = await request('GET', '/admin/stats', { token });
  let passed = res.status === 200 && res.data.success;
  recordTest('GET /admin/stats', passed, passed ? '统计正常' : res.data.error);
  res = await request('GET', '/admin/users', { token });
  passed = res.status === 200 && res.data.success;
  recordTest('GET /admin/users', passed, passed ? `用户数 ${res.data.data?.length || 0}` : res.data.error);
  return true;
}

async function testTeacherEndpoints() {
  const token = authTokens.teacher;
  if (!token) {
    recordTest('教师 API', false, '未获取到 token');
    return false;
  }
  log('test', '教师 API 测试');
  const classId = '一年级1班';
  let res = await request('GET', `/teacher/class/${encodeURIComponent(classId)}`, { token });
  let passed = res.status === 200 && res.data.success;
  recordTest(`GET /teacher/class/${classId}`, passed, passed ? '返回数据' : res.data.error);
  const month = new Date().toISOString().slice(0, 7);
  res = await request('GET', `/teacher/history/${encodeURIComponent(classId)}?month=${month}`, { token });
  passed = res.status === 200 && res.data.success;
  recordTest(`GET /teacher/history/${classId}`, passed, passed ? `${month} 数据` : res.data.error);
  return true;
}

async function testParentEndpoints() {
  const token = authTokens.parent;
  if (!token) {
    recordTest('家长 API', false, '未获取到 token');
    return false;
  }
  log('test', '家长 API 测试');
  let res = await request('GET', '/parent/attendance', { token });
  let passed = res.status === 200 && res.data.success;
  recordTest('GET /parent/attendance', passed, passed ? `孩子数 ${res.data.data?.length || 0}` : res.data.error);
  if (res.data.data && res.data.data.length > 0) {
    const child = res.data.data[0];
    const anonymousId = child.anonymousId;
    const month = new Date().toISOString().slice(0, 7);
    const histRes = await request('GET', `/parent/history/${anonymousId}?month=${month}`, { token });
    const histPassed = histRes.status === 200 && histRes.data.success;
    recordTest(`GET /parent/history/${anonymousId}`, histPassed, histPassed ? `${month} 记录` : histRes.data.error);
  }
  return true;
}

async function testAttendanceEndpoints() {
  const token = authTokens.admin || authTokens.teacher;
  if (!token) {
    recordTest('考勤存证 API', false, '未获取到 token');
    return false;
  }
  log('test', '考勤存证 API 测试');
  const mockRecords = [
    { id: 'S001', timestamp: Date.now(), date: '2026-04-12', action: 'check-in' },
    { id: 'S002', timestamp: Date.now(), date: '2026-04-12', action: 'check-in' }
  ];
  let res = await request('POST', '/attend/calculate-merkle-root', { token, body: { records: mockRecords } });
  let passed = res.status === 200 && res.data.success && res.data.merkleRoot;
  const testMerkleRoot = res.data?.merkleRoot;
  recordTest('POST /attend/calculate-merkle-root', passed, passed ? `根 ${testMerkleRoot?.slice(0,10)}...` : res.data.error);
  
  // 上链与验真测试（若合约未部署则跳过）
  const uploadRes = await request('POST', '/attend/upload-merkle-root', {
    token,
    body: { merkleRoot: testMerkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000', attendanceDate: Math.floor(Date.now() / 1000) }
  });
  const contractDeployed = !(uploadRes.data.error && uploadRes.data.error.includes('合约未部署'));
  
  if (contractDeployed) {
    const uploadPassed = uploadRes.status === 200 && uploadRes.data.success;
    recordTest('POST /attend/upload-merkle-root', uploadPassed, uploadPassed ? '上链成功' : uploadRes.data.error);
    
    if (testMerkleRoot) {
      const verifyRes = await request('POST', '/attend/verify-merkle-root', { token, body: { merkleRoot: testMerkleRoot } });
      const verifyPassed = verifyRes.status === 200 && verifyRes.data.success;
      recordTest('POST /attend/verify-merkle-root', verifyPassed, verifyPassed ? (verifyRes.data.exists ? '存证有效' : '不存在') : verifyRes.data.error);
      
      const batchRes = await request('POST', '/attend/batch-verify', { token, body: { merkleRootList: [testMerkleRoot] } });
      const batchPassed = batchRes.status === 200 && batchRes.data.success;
      recordTest('POST /attend/batch-verify', batchPassed, batchPassed ? `有效 ${batchRes.data.validCount} 条` : batchRes.data.error);
    }
    
    res = await request('GET', '/attend/stats', { token });
    passed = res.status === 200 && res.data.success;
    recordTest('GET /attend/stats', passed, passed ? `链上记录 ${res.data.data?.chainRecordCount}` : res.data.error);
  } else {
    recordTest('合约部署状态', false, '合约未部署，跳过上链/验真测试');
    recordTest('POST /attend/upload-merkle-root', false, '跳过 (合约未部署)');
    recordTest('POST /attend/verify-merkle-root', false, '跳过 (合约未部署)');
    recordTest('POST /attend/batch-verify', false, '跳过 (合约未部署)');
    recordTest('GET /attend/stats', false, '跳过 (合约未部署)');
  }
  return true;
}

async function runAllTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  智慧课堂考勤存证系统 - 核心功能测试      ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`目标服务器: ${BASE_URL}\n`);

  const healthOk = await testHealthCheck();
  if (!healthOk) {
    log('error', '服务未正常运行，测试终止');
    process.exit(1);
  }

  console.log('');
  await testLogin('admin');
  await testLogin('teacher');
  await testLogin('parent');

  console.log('');
  await testAdminEndpoints();
  console.log('');
  await testTeacherEndpoints();
  console.log('');
  await testParentEndpoints();
  console.log('');
  await testAttendanceEndpoints();

  console.log(`\n${colors.cyan}════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}              测试结果汇总                  ${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);

  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  testResults.forEach(r => {
    const icon = r.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${icon} ${r.name}${r.details ? ` (${r.details})` : ''}`);
  });

  console.log(`\n${colors.cyan}────────────────────────────────────────────${colors.reset}`);
  console.log(`通过率: ${passedCount}/${totalCount} (${passRate}%)`);
  if (passedCount === totalCount) {
    console.log(`${colors.green}✅ 所有核心功能测试通过！${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️ 部分测试未通过，请检查日志。${colors.reset}\n`);
    process.exit(1);
  }
}

if (typeof fetch === 'undefined') {
  console.error(`${colors.red}错误：需要 Node.js 18+ 或安装 node-fetch${colors.reset}`);
  process.exit(1);
}

runAllTests().catch(err => {
  console.error(`${colors.red}测试运行异常:${colors.reset}`, err);
  process.exit(1);
});