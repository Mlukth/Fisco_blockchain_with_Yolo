/**
 * 考勤存证系统一键启动脚本 (FISCO BCOS 版)
 * 功能：
 * 1. 检查 FISCO BCOS 节点是否运行
 * 2. 启动后端服务 (Express)
 * 3. 启动前端服务 (Vue)
 * 4. 监听考勤数据目录，自动批量上链
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const chokidar = require('chokidar');
const fs = require('fs');
const axios = require('axios');

const CONFIG = {
  // 服务路径
  SERVER_PATH: path.join(__dirname, 'server'),
  WEB_PATH: path.join(__dirname, 'vue-app'), // 注意：Vue 前端目录
  
  // FISCO BCOS 配置
  FISCO_RPC: process.env.FISCO_RPC_URL || 'http://127.0.0.1:8545',
  
  // 考勤数据监听目录
  WATCH_DIR: path.join(__dirname, 'attendance_data'),
  
  // 批量上传脚本
  BATCH_UPLOAD_SCRIPT: path.join(__dirname, 'scripts', 'batchUpload.js'),
  
  // 空闲等待时间（毫秒）
  IDLE_TIMEOUT: 10000,
};

let serverProcess = null;
let webProcess = null;
let isProcessing = false;
let idleTimer = null;
let initialFiles = new Set();
let changedFiles = new Set();

// 检查 FISCO 节点是否可用
async function checkFiscoNode() {
  console.log(`🔗 检查 FISCO BCOS 节点: ${CONFIG.FISCO_RPC}`);
  try {
    const Web3 = require('@fisco/bcos-node-sdk');
    const web3 = new Web3(CONFIG.FISCO_RPC);
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ FISCO 节点运行中，当前区块高度: ${blockNumber}`);
    return true;
  } catch (error) {
    console.error(`❌ FISCO 节点连接失败: ${error.message}`);
    console.error('请确保 FISCO BCOS 节点已启动，或修改 FISCO_RPC_URL 环境变量');
    return false;
  }
}

// 启动服务
function startService(name, command, args, cwd, delay) {
  return new Promise((resolve) => {
    console.log(`🚀 启动 ${name}...`);
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      stdio: 'inherit'
    });
    
    proc.on('error', (err) => {
      console.error(`❌ ${name} 启动失败:`, err);
      resolve(null);
    });
    
    setTimeout(() => {
      if (proc.exitCode === null) {
        console.log(`✅ ${name} 已启动`);
        resolve(proc);
      } else {
        console.log(`❌ ${name} 启动失败，退出码: ${proc.exitCode}`);
        resolve(null);
      }
    }, delay);
  });
}

// 启动后端和前端服务
async function startServices() {
  // 启动后端
  serverProcess = await startService(
    '后端服务',
    'node',
    ['index.js'],
    CONFIG.SERVER_PATH,
    5000
  );
  if (!serverProcess) {
    throw new Error('后端服务启动失败');
  }
  
  // 启动前端 (Vue)
  webProcess = await startService(
    '前端服务 (Vue)',
    'npm',
    ['run', 'dev'],
    CONFIG.WEB_PATH,
    8000
  );
  if (!webProcess) {
    throw new Error('前端服务启动失败');
  }
  
  console.log('✅ 所有服务已启动');
  console.log(`🌐 前端地址: http://localhost:5173 (默认)`);
  console.log(`🔌 后端API: http://localhost:3002`);
}

// 获取当前文件快照
function getFileSnapshot() {
  try {
    const files = fs.readdirSync(CONFIG.WATCH_DIR, { withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => d.name);
    return new Set(files);
  } catch (error) {
    console.error(`❌ 读取目录失败: ${error.message}`);
    return new Set();
  }
}

// 执行批量上传
function runBatchUpload() {
  return new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0];
    const reportsDir = path.join(CONFIG.WATCH_DIR, 'reports');
    const cmd = `node "${CONFIG.BATCH_UPLOAD_SCRIPT}" "${CONFIG.WATCH_DIR}" "${reportsDir}" "${today}"`;
    
    console.log(`🔁 执行批量上链: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
    resolve(true);
  });
}

// 处理新增文件
async function processNewFiles() {
  if (isProcessing || changedFiles.size === 0) return;
  isProcessing = true;
  
  console.log(`📁 处理 ${changedFiles.size} 个新文件...`);
  try {
    await runBatchUpload();
    initialFiles = getFileSnapshot();
    changedFiles.clear();
    console.log('✅ 批量处理完成');
  } catch (error) {
    console.error('❌ 处理失败:', error.message);
  } finally {
    isProcessing = false;
  }
}

// 重置空闲计时器
function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (changedFiles.size > 0) {
      await processNewFiles();
    }
  }, CONFIG.IDLE_TIMEOUT);
}

// 启动文件监听
function startWatcher() {
  // 确保目录存在
  if (!fs.existsSync(CONFIG.WATCH_DIR)) {
    fs.mkdirSync(CONFIG.WATCH_DIR, { recursive: true });
    console.log(`📂 创建监听目录: ${CONFIG.WATCH_DIR}`);
  }
  
  initialFiles = getFileSnapshot();
  console.log(`👀 开始监听目录: ${CONFIG.WATCH_DIR}`);
  
  const watcher = chokidar.watch(CONFIG.WATCH_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 }
  });
  
  watcher.on('add', (filePath) => {
    const fileName = path.basename(filePath);
    if (!initialFiles.has(fileName)) {
      console.log(`📂 新增文件: ${fileName}`);
      changedFiles.add(fileName);
      resetIdleTimer();
    }
  });
  
  watcher.on('error', (err) => console.error('监听错误:', err));
  
  return watcher;
}

// 优雅退出
function gracefulShutdown(watcher) {
  console.log('\n🛑 正在关闭...');
  if (watcher) watcher.close();
  if (webProcess) webProcess.kill();
  if (serverProcess) serverProcess.kill();
  process.exit(0);
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 考勤存证系统一键启动 (FISCO BCOS 版)');
  console.log('='.repeat(60));
  
  // 检查 FISCO 节点
  const nodeOk = await checkFiscoNode();
  if (!nodeOk) {
    console.error('❌ FISCO BCOS 节点未就绪，退出');
    process.exit(1);
  }
  
  // 启动服务
  await startServices();
  
  // 启动文件监听
  const watcher = startWatcher();
  
  process.on('SIGINT', () => gracefulShutdown(watcher));
  process.on('SIGTERM', () => gracefulShutdown(watcher));
  
  console.log('\n✅ 系统就绪，等待考勤数据文件...');
  console.log(`📁 将 JSON/CSV 文件放入 ${CONFIG.WATCH_DIR} 即可自动上链`);
  console.log('👉 按 Ctrl+C 退出');
}

main().catch(console.error);