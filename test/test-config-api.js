/**
 * 诊断 /api/admin/config 接口
 * 用法：node test/test-config-api.js [admin_token]
 * 若不提供 token，脚本会自动登录获取
 */

import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  validateStatus: () => true
});

async function getAdminToken() {
  try {
    const res = await axiosInstance.post('/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    if (res.data.success) {
      console.log('✅ 自动登录成功，获取 admin token');
      return res.data.token;
    } else {
      throw new Error('登录失败: ' + res.data.error);
    }
  } catch (e) {
    console.error('❌ 无法自动获取 token:', e.message);
    console.error('   请手动传入 token 参数: node test/test-config-api.js <your_admin_token>');
    process.exit(1);
  }
}

async function testConfigAPI(token) {
  console.log('\n========== /api/admin/config 接口诊断 ==========');
  console.log(`请求地址: ${BASE_URL}/api/admin/config`);
  
  const res = await axiosInstance.get('/api/admin/config', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('\n--- 原始响应（HTTP 状态码） ---');
  console.log(`status: ${res.status} ${res.statusText}`);

  console.log('\n--- 响应头 ---');
  console.log(res.headers);

  console.log('\n--- 响应体（原始 JSON） ---');
  console.log(JSON.stringify(res.data, null, 2));

  console.log('\n--- 数据结构分析 ---');
  const { data } = res;
  
  if (data && typeof data === 'object') {
    console.log(`✅ 响应是对象，success 字段: ${data.success}`);
    
    if (data.success) {
      const configData = data.data;
      console.log(`✅ data 字段存在，类型: ${typeof configData}`);
      
      if (configData && typeof configData === 'object') {
        console.log('✅ 配置数据包含字段:');
        console.log(`   - blockchainEnabled: ${configData.blockchainEnabled} (${typeof configData.blockchainEnabled})`);
        console.log(`   - autoSync: ${configData.autoSync} (${typeof configData.autoSync})`);
        console.log(`   - channelUrl: ${configData.channelUrl} (${typeof configData.channelUrl})`);
        console.log(`   - contractAddress: ${configData.contractAddress} (${typeof configData.contractAddress})`);
      } else {
        console.log('❌ data 字段为空或非对象');
      }
    } else {
      console.log(`❌ 接口返回失败: ${data.error}`);
    }
  } else {
    console.log('❌ 响应格式异常');
  }

  // 模拟前端响应拦截器行为
  console.log('\n--- 模拟前端 request.js 拦截器处理 ---');
  try {
    const intercepted = res.data;
    if (intercepted.success !== undefined && !intercepted.success) {
      throw new Error(intercepted.error || '请求失败');
    }
    const finalData = intercepted; // 前端直接返回整个 {success, data}，注意 Config.vue 中使用 config.value = res.data
    console.log('✅ 拦截器通过，返回对象:', Object.keys(finalData));
    console.log('   前端 Config.vue 会执行: config.value = res.data');
    console.log('   此时 config.value 应为:', JSON.stringify(finalData.data, null, 2));
    console.log('   模板中访问 config.channelUrl 实际是 finalData.data.channelUrl，需要确保 config 已赋值');
  } catch (e) {
    console.log('❌ 拦截器抛出异常:', e.message);
  }

  console.log('\n--- 诊断结论 ---');
  if (res.data?.success && res.data?.data?.channelUrl !== undefined) {
    console.log('✅ 后端接口完全正常，返回数据包含 channelUrl');
    console.log('⚠️  前端报错原因分析:');
    console.log('   1. Config.vue 在 onMounted 中异步获取数据，初始时 config 为 null');
    console.log('   2. 模板中直接访问 config.channelUrl，在数据加载完成前触发 TypeError');
    console.log('   3. 解决方案: 模板中使用 v-if="config" 或可选链 config?.channelUrl');
  } else {
    console.log('❌ 后端接口存在问题，需检查 admin.js 中 /config 路由');
  }
}

(async () => {
  let token = process.argv[2];
  if (!token) {
    token = await getAdminToken();
  }
  await testConfigAPI(token);
})();