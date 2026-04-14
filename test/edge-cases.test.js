/**
 * 分块 6/6：异常与容错场景测试
 * 执行方式：node edge-cases.test.js 或 TEST_TOKEN="eyJ..." node edge-cases.test.js
 * 依赖：axios, jsonwebtoken
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const JWT_SECRET = 'your-secret-key-change-in-production';
const REAL_TOKEN = process.env.TEST_TOKEN || null;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
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

// 生成不同角色的 Token
function getToken(role = 'admin') {
  if (REAL_TOKEN) {
    console.log(`✅ 使用环境变量 TEST_TOKEN (角色信息将从 payload 解析)`);
    return REAL_TOKEN;
  }
  const users = {
    admin: { userId: 1, username: 'admin', role: 'admin' },
    teacher: { userId: 2, username: 'teacher', role: 'teacher' },
    parent: { userId: 3, username: 'parent', role: 'parent' }
  };
  return jwt.sign(users[role] || users.admin, JWT_SECRET, { expiresIn: '1h' });
}

console.log('========== 异常与容错场景测试 ==========\n');
console.log(`目标地址: ${BASE_URL}`);

// 使用管理员 Token 作为有效凭证进行多数测试
const adminToken = getToken('admin');
const teacherToken = getToken('teacher');
const parentToken = getToken('parent');

// ---------- 1. 参数异常测试 ----------
console.log('\n▶ 测试 1：参数异常（空值/错误格式）');

// 1.1 必填字段缺失（POST /api/admin/devices 缺少 device_id）
let res = await request('POST', '/api/admin/devices', adminToken, { device_name: 'test' });
logTest('POST /api/admin/devices 缺少 device_id 返回 400', res.status === 400);

// 1.2 非法日期格式（教师历史接口）
res = await request('GET', '/api/teacher/class/history?start=invalid&end=2024-01-01', teacherToken);
// SQLite 对无效日期可能返回空结果或报错，验收要求无 500 崩溃
const noCrash = res.status !== 500;
logTest('教师历史接口传入非法日期不导致 500 崩溃', noCrash);

// 1.3 非法班级ID（管理员统计接口无班级参数，跳过）

// ---------- 2. 权限越权测试 ----------
console.log('\n▶ 测试 2：权限越权');

// 2.1 家长令牌调用教师接口
res = await request('GET', '/api/teacher/class/attendance', parentToken);
logTest('家长访问教师接口返回 403', res.status === 403);

// 2.2 教师令牌调用管理员用户创建接口
res = await request('POST', '/api/admin/users', teacherToken, { username: 'test', password: '123', role: 'teacher' });
logTest('教师访问管理员用户创建接口返回 403', res.status === 403);

// ---------- 3. 设备离线场景测试 ----------
console.log('\n▶ 测试 3：设备离线状态展示');

// 确保至少有一台离线设备（若没有则插入测试设备）
const testDeviceId = 'TEST-OFFLINE-001';
await request('POST', '/api/admin/devices', adminToken, {
  device_id: testDeviceId,
  device_name: '离线测试设备',
  classroom_id: '一年级1班',
  ip_address: '192.168.1.200'
});
// 不发送心跳，保持离线状态

res = await request('GET', '/api/admin/devices', adminToken);
if (res.status === 200 && res.data.success) {
  const devices = res.data.data;
  const offlineDevice = devices.find(d => d.device_id === testDeviceId && d.status === 'offline');
  logTest('管理员接口可正确展示离线设备状态', !!offlineDevice);
} else {
  logTest('管理员接口可正确展示离线设备状态', false, '无法获取设备列表');
}

// 清理测试设备
await request('DELETE', `/api/admin/devices/${testDeviceId}`, adminToken);

// ---------- 4. 空数据场景测试 ----------
console.log('\n▶ 测试 4：空数据场景');

// 4.1 查询无考勤记录的日期（教师历史接口，未来日期）
res = await request('GET', '/api/teacher/class/history?start=2099-01-01&end=2099-01-01', teacherToken);
if (res.status === 200 && res.data.success) {
  const history = res.data.data.history;
  logTest('查询无数据日期返回空数组', Array.isArray(history) && history.length === 0);
} else {
  logTest('查询无数据日期返回空数组', false, `状态码 ${res.status}`);
}

// 4.2 家长查询无绑定孩子的考勤
res = await request('GET', '/api/parent/attendance', parentToken);
if (res.status === 200 && res.data.success) {
  logTest('家长无绑定孩子时返回空数组', Array.isArray(res.data.data));
} else {
  logTest('家长无绑定孩子时返回空数组', false, `状态码 ${res.status}`);
}

// ---------- 5. 无效 Token 测试 ----------
console.log('\n▶ 测试 5：无效/过期 Token');
res = await request('GET', '/api/admin/stats', 'Bearer invalid.token.here');
logTest('无效 Token 返回 401', res.status === 401);

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