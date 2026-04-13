# 智慧课堂考勤存证系统 —— 项目说明（精简版 v1.3）

## 📌 项目简介

本项目是一个面向中小学的考勤数据区块链存证系统，基于 **FISCO BCOS 3.x** 联盟链与 **Vue 3** 构建。系统将考勤数据的默克尔根上链存证，支持多角色（管理员/教师/家长）管理及数据验真。经精简后聚焦 **默克尔根计算、数据持久化存证、三角色轻量化查询、一键批量验真** 四大核心功能。

---

## 🖥️ 环境与依赖

### 硬件/系统环境
- 平台：Ubuntu 22.04 虚拟机
- IP：192.168.171.157
- 用户：mmm

### 关键软件版本
| 组件 | 版本 |
|------|------|
| Node.js | v20.20.2 |
| FISCO BCOS | 3.11.0 |
| Java | 11.0.30 |
| solc (npm) | 0.8.11 |

### 服务端口
| 服务 | 端口 | 说明 |
|------|------|------|
| FISCO BCOS Channel | 20200 | 区块链节点通信 |
| FISCO BCOS HTTP RPC | 8545 | 查询接口 |
| 后端 API (Node.js) | 3002 | 业务接口 |
| 前端 Web (Vite) | 8000 | 用户访问入口 |

---

## 📁 目录结构与文件说明

### 1. 核心配置文件

| 文件路径 | 作用 |
|----------|------|
| `.env` | 区块链连接、合约地址、JWT 密钥、服务端口 |
| `fisco.config.js` | FISCO SDK 配置：Channel 地址、群组/链ID、证书路径 |
| `sdk-config.json` | FISCO SDK 初始化配置文件（JSON 格式） |
| `package.json`（根目录） | 项目脚本：`start`、`deploy` 等 |

### 2. 智能合约与区块链交互

| 文件路径 | 作用 |
|----------|------|
| `contracts/AttendanceProof.sol` | 存证合约：上链、验真、查询时间戳 |
| `build/AttendanceProof.abi` | 合约 ABI（编译产物） |
| `build/AttendanceProof.bin` | 合约字节码（编译产物） |
| `artifacts/AttendanceProof.json` | SDK 使用的合约 ABI（JSON 格式） |
| `sdk/` | FISCO 节点连接证书目录 |
| `scripts/deployFisco.js` | 合约部署脚本 |
| `scripts/test-core.js` | 核心功能自动化测试脚本 |

### 3. 后端服务 (`server/`)

| 文件路径 | 作用 |
|----------|------|
| `index.js` | 服务入口（端口 3002） |
| `config.js` | 加载区块链配置、JWT 密钥、合约 ABI |
| `db/index.js` | SQLite 数据库操作 |
| `data/users.db` | SQLite 数据库文件（持久化存储） |
| `middleware/auth.js` | JWT 验证与角色校验 |
| `utils/contractManager.js` | 区块链交互封装（SDK 初始化） |
| `routes/auth.js` | 登录、登出、令牌刷新 |
| `routes/attend.js` | 核心存证接口：计算默克尔根、上链、单条/批量验真 |
| `routes/admin.js` | 管理员接口：仪表盘统计、用户管理 |
| `routes/teacher.js` | 教师接口：班级考勤、历史统计 |
| `routes/parent.js` | 家长接口：孩子今日考勤、月度历史记录 |

### 4. 前端应用 (`simple-vue-app/`)

| 文件路径 | 作用 |
|----------|------|
| `src/api/index.ts` | Axios 实例，baseURL 指向后端 |
| `src/api/modules/auth.ts` | 认证 API |
| `src/api/modules/admin.ts` | 管理员 API（统计、用户管理） |
| `src/api/modules/teacher.ts` | 教师 API |
| `src/api/modules/parent.ts` | 家长 API |
| `src/api/modules/attend.ts` | 存证 API（单条/批量验真） |
| `src/router/index.ts` | 路由守卫，三角色权限控制 |
| `src/layouts/` | 三种角色布局组件 |
| `src/views/` | 11 个页面组件 |

---

## 🔗 模块调用关系

```
前端 → Express 路由 → JWT 中间件 → 业务逻辑
                ↓
       db/index.js (SQLite)  ←→  users.db（持久化存储）
                ↓
     utils/contractManager.js → FISCO BCOS SDK
                ↓
       默克尔根计算（attend.js 内置，真实密码学算法）
```

**上链流程**：
1. 教师/管理员触发考勤数据上链
2. 后端计算默克尔根（真实 SHA-256 + MerkleTree 算法）
3. 数据存入 SQLite 数据库（持久化）
4. 返回模拟交易哈希（当前方案）

---

## 🚀 快速启动

### 一键启动脚本

```bash
#!/bin/bash
echo "🚀 启动智慧课堂考勤存证系统..."

# 1. 启动 FISCO BCOS 节点
echo "📍 启动区块链节点..."
cd /home/mmm/fisco/nodes/127.0.0.1 && bash start_all.sh

# 2. 等待节点启动
sleep 2

# 3. 启动后端
echo "📍 启动后端服务..."
pkill -f "node index.js" 2>/dev/null
cd /home/mmm/Fisco_blockchain_with_Yolo/server
nohup node index.js > backend.log 2>&1 &

# 4. 启动前端
echo "📍 启动前端服务..."
pkill -f "vite" 2>/dev/null
cd /home/mmm/simple-vue-app
nohup npm run dev > frontend.log 2>&1 &

# 5. 等待服务启动
sleep 3

# 6. 检查状态
echo ""
echo "========== 服务状态 =========="
echo -n "区块链节点: "
ps aux | grep fisco-bcos | grep -v grep > /dev/null && echo "✅ 运行中" || echo "❌ 未运行"
echo -n "后端服务: "
curl -s http://localhost:3002/api/health > /dev/null && echo "✅ 正常" || echo "❌ 异常"
echo -n "前端服务: "
FRONTEND_URL=$(grep -o "http://192.168.171.157:[0-9]*" /home/mmm/simple-vue-app/frontend.log 2>/dev/null | tail -1)
[ -n "$FRONTEND_URL" ] && echo "✅ $FRONTEND_URL" || echo "❌ 未启动"
echo "==============================="
echo ""
echo "🌐 访问地址: ${FRONTEND_URL:-http://192.168.171.157:8000}"
echo "🔐 测试账号: admin / password123"
```

### 手动启动步骤

```bash
# 步骤1：启动区块链节点
cd /home/mmm/fisco/nodes/127.0.0.1 && bash start_all.sh

# 步骤2：启动后端
cd /home/mmm/Fisco_blockchain_with_Yolo/server
nohup node index.js > backend.log 2>&1 &

# 步骤3：启动前端
cd /home/mmm/simple-vue-app
nohup npm run dev > frontend.log 2>&1 &

# 步骤4：查看前端地址
grep -o "http://192.168.171.157:[0-9]*" frontend.log | tail -1
```

### 访问地址
- 前端：http://192.168.171.157:8000（或查看 frontend.log 中的实际端口）
- 后端健康检查：http://192.168.171.157:3002/api/health

### 演示账号
| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | password123 |
| 教师 | teacher | password123 |
| 家长 | parent | password123 |

---

## ✅ 核心功能测试

运行自动化测试脚本：

```bash
cd ~/Fisco_blockchain_with_Yolo
node scripts/test-core.js
```

**测试覆盖**：
- ✅ 健康检查
- ✅ 用户登录（三种角色）
- ✅ 管理员功能（统计、用户管理）
- ✅ 教师功能（班级考勤、历史统计）
- ✅ 家长功能（孩子考勤查询）
- ✅ 考勤存证（默克尔根计算、上链、验真、批量验证、统计）

---

## ⚠️ 当前技术方案说明

### 已实现功能

| 功能 | 实现方式 | 状态 |
|------|---------|------|
| 默克尔根计算 | SHA-256 + MerkleTree 真实算法 | ✅ 完整实现 |
| 数据持久化 | SQLite 数据库存储 | ✅ 完整实现 |
| 用户认证 | JWT Token | ✅ 完整实现 |
| 三角色权限控制 | 路由守卫 + 中间件 | ✅ 完整实现 |
| 上链交易 | 模拟交易哈希 + 数据库存储 | ⚠️ 部分实现 |
| 链上验证 | 数据库查询模拟 | ⚠️ 部分实现 |

### 已知问题与解决方案

#### 问题1：FISCO Node.js SDK 与 Node.js v20 兼容性问题

**现象**：
```
invalid type
at toBuffer (/node_modules/@fiscobcos/nodejs-sdk/.../utils.js:54:19)
```

**原因**：
- FISCO SDK 的 `_parsePrivateKey` 解析私钥后返回字符串
- `privateKeyToAddress` 期望 Buffer 类型
- Node.js v20 的 Buffer 行为与 SDK 不兼容

**临时解决方案**：
```json
// sdk-config.json 使用空 accounts
{
  "accounts": {}
}
```

**完整解决方案（待实现）**：
1. 等待 FISCO 官方更新 SDK 支持 Node.js v20
2. 或使用 Java 控制台发送交易
3. 或修复 SDK 源码的私钥解析逻辑

#### 问题2：合约 ABI 文件格式

**解决**：将 `.abi` 文件转换为 JSON 格式
```bash
cat build/AttendanceProof.abi | jq '{abi: .}' > artifacts/AttendanceProof.json
```

---

## 🔧 首次部署注意事项

1. **FISCO BCOS 节点**：确保节点运行在 `127.0.0.1:20200`
2. **证书文件**：确认 `sdk/` 目录包含 `ca.crt`、`sdk.crt`、`sdk.key`
3. **合约 ABI**：确保 `artifacts/AttendanceProof.json` 存在
4. **数据库**：后端首次启动自动创建 `server/data/users.db`

---

## ✨ 核心功能亮点（答辩重点）

### 1. 默克尔根存证
- 每日考勤数据生成默克尔根（真实密码学算法）
- 数据持久化存储在 SQLite 数据库
- 支持单条/批量验真，实时校验数据真实性

### 2. 三角色轻量化设计
- **管理员**：仪表盘统计 + 用户管理
- **教师**：查看班级考勤与历史统计
- **家长**：查看孩子今日状态、月度历史，**一键批量验真**

### 3. 高效批量验真
- 家长在历史记录页点击"一键批量验真"
- 1 秒内完成月度所有记录的校验
- 返回有效存证数量，直观展示数据可信度

---

## ❓ 常见问题

### Q1：启动后端时报证书错误
- 确认 `sdk-config.json` 中 `authentication` 路径正确
- 检查证书文件：`ca.crt`、`sdk.crt`、`sdk.key`

### Q2：测试脚本提示 "invalid type"
- 检查 `sdk-config.json` 中 `accounts` 是否为空对象 `{}`
- 确认 Node.js 版本为 v20.20.2

### Q3：前端无法连接后端
- 检查后端是否启动：`curl http://localhost:3002/api/health`
- 检查前端 API 配置：`src/api/index.ts` 中的 baseURL

### Q4：上链后数据丢失
- 当前方案使用数据库持久化，重启后数据不会丢失
- 如果数据丢失，检查 `server/data/users.db` 是否正常

---

## 📚 相关文档

- FISCO BCOS 官方文档：https://fisco-bcos-documentation.readthedocs.io/
- 项目部署记录：`PROJECT_STATUS_REPORT.md`
- 迁移总结：`MIGRATION_SUMMARY.md`

---

**文档版本**：v1.3  
**最后更新**：2026-04-12  
**更新说明**：
- 更新启动命令和访问地址
- 说明 FISCO SDK 兼容性问题及解决方案
- 明确当前技术方案（数据库持久化 + 模拟上链）
- 添加自动化测试说明
