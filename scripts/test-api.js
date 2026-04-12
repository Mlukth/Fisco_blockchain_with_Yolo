/**
 * 后端 API 自动化测试脚本
 * 运行方式：node scripts/test-api.js
 * 依赖：axios（已在根 package.json 中）
 */

import axios from 'axios';
import assert from 'assert';

const BASE_URL = 'http://localhost:3002/api';
let adminToken = '';
let teacherToken = '';
let parentToken = '';
let testMerkleRoot = '';

// 工具函数：打印测试结果
function logTest(name, success, error = null) {
  const symbol = success ? '✅' : '❌';
  console.log(`${symbol} ${name}`);
  if (error) console.log(`   错误: ${error}`);
}

// 1. 登录测试
async function testLogin(role, username, password) {
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, { username, password });
    assert(res.data.success === true);
    assert(res.data.token);
    assert(res.data.user.role === role);
    return res.data.token;
  } catch (e) {
    throw new Error(`登录失败: ${e.response?.data?.error || e.message}`);
  }
}

// 2. 管理员功能测试
async function testAdmin(token) {
  const headers = { Authorization: `Bearer ${token}` };
  
  // 2.1 仪表盘统计
  const stats = await axios.get(`${BASE_URL}/admin/stats`, { headers });
  assert(stats.data.success === true);
  assert(typeof stats.data.data.totalStudents === 'number');
  logTest('管理员-仪表盘统计', true);

  // 2.2 用户列表
  const users = await axios.get(`${BASE_URL}/admin/users`, { headers });
  assert(users.data.success === true);
  assert(Array.isArray(users.data.data));
  logTest('管理员-用户列表', true);

  // 2.3 设备列表
  const devices = await axios.get(`${BASE_URL}/admin/devices`, { headers });
  assert(devices.data.success === true);
  logTest('管理员-设备列表', true);

  // 2.4 配置获取
  const config = await axios.get(`${BASE_URL}/admin/config`, { headers });
  assert(config.data.success === true);
  logTest('管理员-获取配置', true);

  // 2.5 诊断
  const diag = await axios.get(`${BASE_URL}/admin/diagnosis`, { headers });
  assert(diag.data.success === true);
  logTest('管理员-系统诊断', true);

  // 2.6 日志
  const logs = await axios.get(`${BASE_URL}/admin/logs`, { headers });
  assert(logs.data.success === true);
  logTest('管理员-操作日志', true);
}

// 3. 教师功能测试
async function testTeacher(token) {
  const headers = { Authorization: `Bearer ${token}` };
  
  // 3.1 班级考勤
  const attendance = await axios.get(`${BASE_URL}/teacher/class/attendance`, { headers });
  assert(attendance.data.success === true);
  assert(attendance.data.data.stats);
  logTest('教师-班级考勤', true);

  // 3.2 历史统计
  const history = await axios.get(`${BASE_URL}/teacher/class/history`, { headers });
  assert(history.data.success === true);
  logTest('教师-历史统计', true);

  // 3.3 异常列表
  const exceptions = await axios.get(`${BASE_URL}/teacher/exceptions`, { headers });
  assert(exceptions.data.success === true);
  logTest('教师-异常列表', true);
}

// 4. 家长功能测试
async function testParent(token) {
  const headers = { Authorization: `Bearer ${token}` };
  
  // 4.1 今日考勤
  const attendance = await axios.get(`${BASE_URL}/parent/attendance`, { headers });
  assert(attendance.data.success === true);
  logTest('家长-今日考勤', true);

  // 4.2 历史记录（需要测试数据中存在 anonymousId）
  const children = attendance.data.data;
  if (children.length > 0) {
    const anonymousId = children[0].anonymousId;
    const month = new Date().toISOString().slice(0, 7);
    const history = await axios.get(`${BASE_URL}/parent/history`, {
      headers,
      params: { anonymousId, month }
    });
    assert(history.data.success === true);
    logTest('家长-历史记录', true);
  } else {
    logTest('家长-历史记录', false, '无绑定孩子，跳过');
  }
}

// 5. 存证功能测试
async function testAttendance(token) {
  const headers = { Authorization: `Bearer ${token}` };
  
  // 5.1 计算默克尔根
  const testRecords = [
    { id: 'S001', timestamp: Date.now(), date: '2026-04-12', action: 'check-in' },
    { id: 'S002', timestamp: Date.now(), date: '2026-04-12', action: 'check-in' }
  ];
  const calcRes = await axios.post(`${BASE_URL}/attend/calculate-merkle-root`, { records: testRecords }, { headers });
  assert(calcRes.data.success === true);
  assert(calcRes.data.merkleRoot.startsWith('0x'));
  testMerkleRoot = calcRes.data.merkleRoot;
  logTest('存证-计算默克尔根', true);

  // 5.2 上链（需 ADMIN_PRIVATE_KEY 配置正确且合约已部署）
  try {
    const uploadRes = await axios.post(`${BASE_URL}/attend/upload-merkle-root`, {
      merkleRoot: testMerkleRoot,
      attendanceDate: Math.floor(Date.now() / 1000)
    }, { headers });
    assert(uploadRes.data.success === true);
    logTest('存证-上链', true);
  } catch (e) {
    logTest('存证-上链', false, e.response?.data?.error || e.message);
  }

  // 5.3 验证
  try {
    const verifyRes = await axios.post(`${BASE_URL}/attend/verify-merkle-root`, {
      merkleRoot: testMerkleRoot
    }, { headers });
    assert(verifyRes.data.success === true);
    logTest('存证-验证默克尔根', true, `exists: ${verifyRes.data.exists}`);
  } catch (e) {
    logTest('存证-验证默克尔根', false, e.message);
  }

  // 5.4 存证历史
  const historyRes = await axios.get(`${BASE_URL}/attend/attendance-history`, { headers });
  assert(historyRes.data.success === true);
  logTest('存证-获取历史', true);
}

// 主流程
(async () => {
  console.log('========== API 自动化测试开始 ==========\n');
  
  try {
    // 登录获取 token
    console.log('--- 1. 认证测试 ---');
    adminToken = await testLogin('admin', 'admin', 'password123');
    logTest('登录-管理员', true);
    teacherToken = await testLogin('teacher', 'teacher', 'password123');
    logTest('登录-教师', true);
    parentToken = await testLogin('parent', 'parent', 'password123');
    logTest('登录-家长', true);

    // 测试各角色功能
    console.log('\n--- 2. 管理员功能测试 ---');
    await testAdmin(adminToken);

    console.log('\n--- 3. 教师功能测试 ---');
    await testTeacher(teacherToken);

    console.log('\n--- 4. 家长功能测试 ---');
    await testParent(parentToken);

    console.log('\n--- 5. 存证功能测试 ---');
    await testAttendance(adminToken);

    console.log('\n========== 测试完成 ==========');
  } catch (error) {
    console.error('\n❌ 测试过程中发生未捕获错误:', error.message);
    process.exit(1);
  }
})();
