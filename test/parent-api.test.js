/**
 * 分块 4/6：家长端接口测试（基于实际代码修正版）
 * 支持通过环境变量 TEST_TOKEN 直接使用真实 Token 绕过密钥问题
 * 执行方式：TEST_TOKEN="eyJ..." node parent-api.test.js
 */

import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
// 优先使用环境变量传入的真实 Token
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

console.log('========== 家长端接口测试 ==========\n');
console.log(`目标地址: ${BASE_URL}`);

let parentToken;
if (REAL_TOKEN) {
  console.log('✅ 使用环境变量 TEST_TOKEN 提供的真实 Token');
  parentToken = REAL_TOKEN;
} else {
  console.log('⚠️  未提供 TEST_TOKEN，测试将失败。请通过环境变量传入真实 Token。');
  parentToken = 'invalid_token';
}

// 从真实 Token 解析用户名（用于日志）
try {
  const payload = JSON.parse(Buffer.from(parentToken.split('.')[1], 'base64').toString());
  console.log(`   当前用户: ${payload.username} (${payload.role})`);
} catch (e) {}

// ---------- 1. 权限隔离 ----------
console.log('\n▶ 测试 1：权限隔离');
let res;

res = await request('GET', '/api/parent/attendance', null);
logTest('无 Token 返回 401', res.status === 401);

// ---------- 2. 今日考勤（姓名展示） ----------
console.log('\n▶ 测试 2：GET /api/parent/attendance - 今日考勤');
res = await request('GET', '/api/parent/attendance', parentToken);
if (res.status === 200 && res.data.success) {
  logTest('接口正常返回', true);
  const data = res.data.data || [];
  console.log(`    绑定孩子数: ${data.length}`);
  if (data.length > 0) {
    const first = data[0];
    logTest('返回数据包含学生姓名 (name 字段)', first.name !== undefined);
    logTest('返回数据不包含学号字段', !('studentId' in first) && !('student_id' in first));
    console.log(`    示例: ${first.name} (${first.anonymousId}) - ${first.attendance?.status || 'unknown'}`);
  } else {
    console.log('    该家长无绑定孩子，无法验证字段');
  }
} else {
  logTest('接口正常返回', false, `状态码 ${res.status}`);
}

// ---------- 3. 历史考勤（权限校验 + 月份参数） ----------
console.log('\n▶ 测试 3：GET /api/parent/history - 历史考勤');
// 先获取一个绑定的孩子ID（若今日考勤有数据，取第一个；否则使用种子数据 S001）
let testAnonymousId = 'S001'; // 种子数据中 parent 绑定 S001
if (res.status === 200 && res.data.data && res.data.data.length > 0) {
  testAnonymousId = res.data.data[0].anonymousId;
}

const testMonth = new Date().toISOString().slice(0, 7); // 当前月份 YYYY-MM
res = await request('GET', `/api/parent/history?month=${testMonth}&anonymousId=${testAnonymousId}`, parentToken);
if (res.status === 200 && res.data.success) {
  logTest('支持月份参数查询', true);
  const summary = res.data.data.summary;
  console.log(`    ${testMonth} 考勤统计: 出勤 ${summary.present} 次, 迟到 ${summary.late} 次`);
} else if (res.status === 403) {
  logTest('支持月份参数查询', false, '权限拒绝，可能孩子未绑定当前家长');
} else {
  logTest('支持月份参数查询', false, `状态码 ${res.status}`);
}

// ---------- 4. 越权测试：访问其他孩子 ----------
console.log('\n▶ 测试 4：越权测试 - 访问未绑定的孩子');
const otherId = 'S999';
res = await request('GET', `/api/parent/history?month=${testMonth}&anonymousId=${otherId}`, parentToken);
// 预期返回 403（无权访问）
logTest('未授权访问返回 403', res.status === 403);

// ---------- 5. 家长访问教师接口 ----------
console.log('\n▶ 测试 5：家长访问教师接口');
res = await request('GET', '/api/teacher/class/attendance', parentToken);
// 教师接口要求 teacher/admin 角色，parent 应返回 403
logTest('家长 Token 访问教师接口返回 403', res.status === 403);

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