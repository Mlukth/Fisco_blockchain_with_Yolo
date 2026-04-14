/**
 * 分块 2/6：管理员端接口测试（修正版 - 完全依赖环境变量 Token）
 * 用法：
 *   TEST_ADMIN_TOKEN="eyJ..." TEST_TEACHER_TOKEN="eyJ..." node admin-api.test.js
 * 若不提供 TEST_TEACHER_TOKEN，则教师 Token 测试会失败（预期行为）。
 */

import axios from 'axios';
import * as dbModule from '../server/db/index.js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN || process.env.TEST_TOKEN || '';
const TEACHER_TOKEN = process.env.TEST_TEACHER_TOKEN || '';

if (!ADMIN_TOKEN) {
  console.error('❌ 请设置环境变量 TEST_ADMIN_TOKEN 或 TEST_TOKEN');
  process.exit(1);
}

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

console.log('========== 管理员端接口测试 ==========\n');
console.log(`目标地址: ${BASE_URL}`);
console.log(`管理员 Token: ${ADMIN_TOKEN.substring(0, 20)}...`);
if (TEACHER_TOKEN) console.log(`教师 Token: ${TEACHER_TOKEN.substring(0, 20)}...`);

// ---------- 1. 权限隔离 ----------
console.log('\n▶ 测试 1：权限隔离');
let res;

res = await request('GET', '/api/admin/stats', null);
logTest('无 Token 返回 401', res.status === 401);

if (TEACHER_TOKEN) {
  res = await request('GET', '/api/admin/stats', TEACHER_TOKEN);
  logTest('教师 Token 返回 403', res.status === 403);
} else {
  console.log('  ⚠️ 未提供 TEST_TEACHER_TOKEN，跳过教师权限测试');
  results.warnings.push('未测试教师 Token 越权');
}

res = await request('GET', '/api/admin/stats', ADMIN_TOKEN);
logTest('管理员 Token 访问成功', res.status === 200 && res.data.success === true);

// ---------- 2. 统计接口 ----------
console.log('\n▶ 测试 2：GET /api/admin/stats');
if (res.status === 200 && res.data.success) {
  const data = res.data.data;
  const hasFields = typeof data.totalStudents === 'number' &&
                    typeof data.totalTeachers === 'number' &&
                    typeof data.totalParents === 'number' &&
                    typeof data.totalDevices === 'number' &&
                    typeof data.onlineDevices === 'number' &&
                    typeof data.todayAttendanceRate === 'number';
  logTest('返回数据结构正确', hasFields);
  console.log(`    今日出勤率: ${data.todayAttendanceRate}%`);
} else {
  logTest('返回数据结构正确', false, '请求失败');
}

// ---------- 3. 设备管理 CRUD ----------
console.log('\n▶ 测试 3：设备管理 CRUD');

const testDevice = {
  device_id: 'TEST-DEV-001',
  device_name: '测试设备',
  classroom_id: '一年级1班',
  ip_address: '192.168.1.100'
};

res = await request('POST', '/api/admin/devices', ADMIN_TOKEN, testDevice);
const createOk = res.status === 200 && res.data.success === true;
logTest('POST /api/admin/devices 新增设备', createOk);

res = await request('GET', '/api/admin/devices', ADMIN_TOKEN);
const listOk = res.status === 200 && res.data.success && Array.isArray(res.data.data);
logTest('GET /api/admin/devices 获取列表', listOk);
if (listOk) {
  const found = res.data.data.find(d => d.device_id === testDevice.device_id);
  logTest('列表包含新建设备', !!found);
}

res = await request('PUT', `/api/admin/devices/${testDevice.device_id}`, ADMIN_TOKEN, {
  ...testDevice,
  status: 'online'
});
logTest('PUT /api/admin/devices/:id 更新设备', res.status === 200 && res.data.success === true);

res = await request('POST', '/api/admin/devices/heartbeat', ADMIN_TOKEN, {
  device_id: testDevice.device_id,
  ip_address: '192.168.1.101'
});
logTest('POST /api/admin/devices/heartbeat 更新心跳', res.status === 200 && res.data.success === true);

res = await request('DELETE', `/api/admin/devices/${testDevice.device_id}`, ADMIN_TOKEN);
logTest('DELETE /api/admin/devices/:id 删除设备', res.status === 200 && res.data.success === true);

// ---------- 4. 用户管理 CRUD ----------
console.log('\n▶ 测试 4：用户管理 CRUD');

const testUser = {
  username: `testuser_${Date.now()}`,
  password: 'test123',
  role: 'teacher'
};

res = await request('POST', '/api/admin/users', ADMIN_TOKEN, testUser);
const userCreateOk = res.status === 200 && res.data.success === true;
const userId = res.data?.data?.id;
logTest('POST /api/admin/users 创建用户', userCreateOk);

res = await request('GET', '/api/admin/users?role=teacher', ADMIN_TOKEN);
const listUserOk = res.status === 200 && res.data.success && Array.isArray(res.data.data);
logTest('GET /api/admin/users 获取用户列表', listUserOk);
if (listUserOk && userId) {
  const found = res.data.data.find(u => u.id === userId);
  logTest('列表中包含新用户', !!found);
}

if (userId) {
  res = await request('PUT', `/api/admin/users/${userId}`, ADMIN_TOKEN, { role: 'parent' });
  logTest('PUT /api/admin/users/:id 更新用户角色', res.status === 200 && res.data.success === true);
}

if (userId) {
  res = await request('DELETE', `/api/admin/users/${userId}`, ADMIN_TOKEN);
  logTest('DELETE /api/admin/users/:id 删除用户', res.status === 200 && res.data.success === true);
} else {
  logTest('DELETE /api/admin/users/:id 删除用户', false, '未获得用户ID');
}

// ---------- 5. 异常提醒 ----------
console.log('\n▶ 测试 5：GET /api/admin/exceptions');
res = await request('GET', '/api/admin/exceptions', ADMIN_TOKEN);
const exceptionOk = res.status === 200 && res.data.success && res.data.data;
logTest('异常接口正常返回', exceptionOk);
if (exceptionOk) {
  console.log(`    考勤异常数: ${res.data.data.attendance?.length || 0}, 离线设备数: ${res.data.data.devices?.length || 0}`);
}

// ---------- 6. 匿名映射 CRUD（直接 db 测试） ----------
console.log('\n▶ 测试 6：匿名映射 CRUD（通过 db 模块）');
try {
  const allMappings = dbModule.getAllMappings();
  logTest('getAllMappings() 正常返回', Array.isArray(allMappings));

  const testMapping = {
    anonymous_id: `TEST_${Date.now()}`,
    student_name: '测试学生',
    grade: '一年级',
    class_name: '一年级1班',
    parent_phone: '13800000000'
  };
  const addResult = dbModule.addMapping(testMapping);
  const addOk = addResult && addResult.changes > 0;
  logTest('addMapping() 新增映射', addOk);

  const afterMappings = dbModule.getAllMappings();
  const foundTest = afterMappings.find(m => m.anonymous_id === testMapping.anonymous_id);
  logTest('新增后映射存在于列表中', !!foundTest);

  if (foundTest) {
    const db = dbModule.getDb();
    db.prepare('DELETE FROM anonymous_map WHERE anonymous_id = ?').run(testMapping.anonymous_id);
  }
} catch (e) {
  logTest('匿名映射 CRUD', false, e.message);
}

// ---------- 7. 配置接口 ----------
console.log('\n▶ 测试 7：GET /api/admin/config');
res = await request('GET', '/api/admin/config', ADMIN_TOKEN);
const configOk = res.status === 200 && res.data.success && res.data.data.blockchainEnabled !== undefined;
logTest('配置接口返回区块链启用状态', configOk);

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