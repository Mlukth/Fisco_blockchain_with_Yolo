# FISCO BCOS 3.x 迁移完成报告

## 一、迁移概述

将基于 Hardhat 的图像存证系统成功迁移至 **FISCO BCOS 3.11.0**，改造为匿名考勤存证系统。

### 核心变更点

| 变更类型 | 原版本 | 目标版本 |
|---------|-------|---------|
| 区块链平台 | Hardhat (本地开发网络) | FISCO BCOS 3.11.0 |
| SDK 包名 | `@fisco/bcos-node-sdk` | `@fiscobcos/nodejs-sdk@3.8.0` |
| 连接协议 | HTTP RPC (8545) | Channel (20200) |
| Solidity 版本 | ^0.8.28 | ^0.8.11 |
| 模块格式 | 混合 (CJS/ESM) | 统一 ES Module |

---

## 二、文件修改清单

### 2.1 核心配置文件 (4个)

| 文件 | 主要修改 |
|-----|---------|
| `.env` | RPC地址改为 Channel 协议，群组/链ID改为字符串格式，添加证书路径配置 |
| `fisco.config.js` | 完全重写为 ES Module，添加 SSL 证书配置，gas 参数调整 |
| `package.json` | SDK 包名更新为 `@fiscobcos/nodejs-sdk`，移除 Hardhat 依赖 |
| `server/package.json` | 移除 web3.js 依赖，确保 ES Module 支持 |

### 2.2 智能合约 (1个)

| 文件 | 主要修改 |
|-----|---------|
| `contracts/AttendanceProof.sol` | Solidity 版本降级至 ^0.8.11，手动实现 Ownable 功能，移除 OpenZeppelin 依赖 |

### 2.3 脚本文件 (4个)

| 文件 | 主要修改 |
|-----|---------|
| `scripts/config.js` | 重写为 ES Module，添加证书路径配置，移除 artifacts 依赖 |
| `scripts/deployFisco.js` | 重写为 ES Module，使用 3.x SDK 部署逻辑，支持 Channel 协议 |
| `scripts/uploadMerkleRoot.js` | 重写为 ES Module，使用 3.x SDK，错误处理增强 |
| `scripts/verifyMerkleRoot.js` | 重写为 ES Module，使用 3.x SDK，输出格式优化 |

### 2.4 后端文件 (5个)

| 文件 | 主要修改 |
|-----|---------|
| `server/config.js` | 适配 3.x 配置格式，添加证书路径，更新验证逻辑 |
| `server/index.js` | 更新导入语句，确保 ES Module 兼容 |
| `server/utils/contractManager.js` | 重写为 3.x SDK 交互方式，移除 Hardhat 部署逻辑 |
| `server/utils/hashCalculator.js` | 优化导入结构，确保 ES Module 兼容 |
| `server/routes/attend.js` | 移除外部脚本调用，改用 contractManager 直接交互 |

---

## 三、关键配置参数

### 3.1 节点连接配置

```bash
# FISCO BCOS 3.x 节点信息
RPC URL: 127.0.0.1:20200 (Channel 协议)
群组ID: group0 (字符串格式)
链ID: chain0 (字符串格式)
```

### 3.2 证书路径

```bash
# SDK 证书位置（相对于项目根目录）
CA 证书: ./nodes/127.0.0.1/sdk/ca.crt
SDK 证书: ./nodes/127.0.0.1/sdk/sdk.crt
SDK 私钥: ./nodes/127.0.0.1/sdk/sdk.key
```

### 3.3 管理员账户

```bash
# 默认管理员账户（建链时生成）
地址: 0x6085fb959fe369e0ab1aa87e75e78731cb00d69f
私钥: 需从 nodes/127.0.0.1/sdk/.account 私钥文件中获取
```

---

## 四、部署验证步骤

### 步骤1：准备环境

```bash
# 确认 FISCO BCOS 节点已启动
cd ~/fisco
bash nodes/127.0.0.1/start_all.sh
ps aux | grep fisco-bcos
```

### 步骤2：进入项目目录

```bash
cd ~/Fisco_blockchain_with_Yolo
```

### 步骤3：安装依赖

```bash
# 安装 FISCO BCOS 3.x Node.js SDK
npm install @fiscobcos/nodejs-sdk@3.8.0

# 安装其他依赖
npm install
cd server && npm install && cd ..
cd vue-app && npm install && cd ..
```

### 步骤4：配置环境变量

```bash
# 复制证书到项目目录
mkdir -p sdk
cp ~/fisco/nodes/127.0.0.1/sdk/* ./sdk/

# 获取管理员私钥（如果不知道私钥）
# 方法1: 从 .account 文件读取
cat ~/fisco/nodes/127.0.0.1/sdk/.account

# 方法2: 生成新账户（需重新授权）
node -e "const Web3 = require('@fiscobcos/nodejs-sdk'); const web3 = new Web3(); const acc = web3.eth.accounts.create(); console.log('地址:', acc.address); console.log('私钥:', acc.privateKey);"
```

### 步骤5：编辑 .env 文件

```bash
# 编辑 .env，填写私钥
nano .env

# 关键配置：
# FISCO_RPC_URL=127.0.0.1:20200
# FISCO_GROUP_ID=group0
# FISCO_CHAIN_ID=chain0
# ADMIN_PRIVATE_KEY=<你的私钥>
# CONTRACT_ADDRESS=（部署后自动填写）
```

### 步骤6：部署合约

```bash
# 部署考勤存证合约
node scripts/deployFisco.js

# 预期输出：
# ✅ 合约部署成功！
# 📜 合约地址: 0x...
# 📝 部署记录已保存至: deployments/fisco/AttendanceProof.json
```

### 步骤7：启动后端服务

```bash
cd server
node index.js

# 预期输出：
# 🔧 FISCO BCOS 考勤存证系统配置
# - RPC URL: 127.0.0.1:20200
# ✅ 合约验证成功
# 🚀 考勤存证后端服务启动成功！
# 📍 端口: 3002
```

### 步骤8：启动前端服务

```bash
cd vue-app
npm run dev -- --host 0.0.0.0

# 访问: http://192.168.171.157:5173
```

### 步骤9：功能测试

```bash
# 测试1: 上传默克尔根
node scripts/uploadMerkleRoot.js 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef 1712851200

# 预期输出：
# ✅ 默克尔根上链成功！
# blockNumber: 1

# 测试2: 验证默克尔根
node scripts/verifyMerkleRoot.js 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# 预期输出：
# {"exists":true,"timestamp":1712851200,"message":"✅ 默克尔根已存在于链上"}
```

---

## 五、常见问题排查

### 问题1: 连接节点失败

**现象**: `ECONNREFUSED` 或 `connect error`

**排查**:
```bash
# 检查节点是否运行
ps aux | grep fisco-bcos

# 检查端口是否监听
netstat -tlnp | grep 20200

# 查看节点日志
tail -f ~/fisco/nodes/127.0.0.1/node0/log/* | grep -i error
```

### 问题2: 证书错误

**现象**: `certificate verify failed` 或 `SSL error`

**排查**:
```bash
# 确认证书文件存在
ls -la sdk/
# 应包含: ca.crt, sdk.crt, sdk.key

# 检查证书权限
chmod 644 sdk/*
```

### 问题3: 合约部署失败

**现象**: `contract creation error` 或 `out of gas`

**排查**:
```bash
# 检查私钥是否正确
# 检查 gas limit 是否足够（默认 300000）

# 尝试增加 gas limit
# 在 fisco.config.js 中修改: gasLimit: 500000
```

### 问题4: 私钥格式错误

**现象**: `invalid private key`

**解决**:
```bash
# 私钥必须包含 0x 前缀
# 正确格式: 0x1234567890abcdef...
# 错误格式: 1234567890abcdef...
```

---

## 六、与原项目的差异说明

### 6.1 移除的功能
- Hardhat 测试网络支持
- OpenZeppelin 合约库依赖
- ethers.js 库

### 6.2 新增的功能
- FISCO BCOS 3.x Channel 协议支持
- SSL 证书认证
- 本地默克尔树计算与验证

### 6.3 性能优化
- 直接合约调用替代外部脚本调用
- ES Module 统一模块格式
- 证书缓存机制

---

## 七、后续维护建议

1. **备份证书**: 定期备份 `sdk/` 目录下的证书文件
2. **监控节点**: 使用 FISCO BCOS 监控工具监控节点状态
3. **合约升级**: 如需升级合约，请参考 FISCO BCOS 合约升级文档
4. **安全加固**: 生产环境请修改 `.env` 中的默认密钥

---

**迁移完成时间**: 2026-04-11  
**FISCO BCOS 版本**: 3.11.0  
**Node.js SDK 版本**: 3.8.0