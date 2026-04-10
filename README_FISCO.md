# 区块链匿名考勤存证系统 - 项目文档 (FISCO BCOS 版)

> **项目简介**：本系统基于 FISCO BCOS 区块链，提供考勤数据采集、默克尔根生成、链上存证、验真查询等功能。系统包含智能合约、后端 API、Vue 前端、自动化脚本，是一套完整的 DApp 解决方案。

---

## 目录
1. [系统架构](#1-系统架构)
2. [环境要求](#2-环境要求)
3. [快速启动](#3-快速启动)
4. [合约部署](#4-合约部署)
5. [后端服务](#5-后端服务)
6. [前端界面](#6-前端界面)
7. [核心脚本说明](#7-核心脚本说明)
8. [API 接口文档](#8-api-接口文档)
9. [常见问题](#9-常见问题)

---

## 1. 系统架构

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Vue 前端      │ ───▶ │   Express 后端  │ ───▶ │  FISCO BCOS     │
│  (考勤采集/验真) │      │  (API/数据库)   │      │  区块链节点     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                │                         │
                                ▼                         ▼
                         ┌─────────────┐          ┌─────────────┐
                         │  SQLite 数据库│          │ 智能合约     │
                         │ (考勤记录)   │          │ AttendanceProof│
                         └─────────────┘          └─────────────┘
```

**数据流**：
1. 前端上传考勤数据文件(JSON/CSV) → 后端生成默克尔根
2. 默克尔根 + 考勤日期 → 调用合约上链
3. 链上存储根哈希和时间戳，事件可追溯
4. 验真时输入默克尔根，查询链上是否存在

---

## 2. 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 16.0 | 运行前后端及脚本 |
| FISCO BCOS | 3.0+ | 需提前搭建单节点或连接现有链 |
| SQLite3 | - | 数据库，无需单独安装 |
| npm / yarn | 最新 | 包管理工具 |

**FISCO BCOS 节点搭建**（若本地无节点）：
```bash
# 参考 FISCO BCOS 官方文档搭建单节点
cd ~ && mkdir fisco && cd fisco
curl -LO https://github.com/FISCO-BCOS/FISCO-BCOS/releases/download/v3.6.0/build_chain.sh
bash build_chain.sh -l 127.0.0.1:1 -p 30300,20200,8545
bash nodes/127.0.0.1/start_all.sh
```

---

## 3. 快速启动

### 方式一：一键启动（推荐）
```bash
# 安装依赖
npm install
cd server && npm install && cd ..
cd vue-app && npm install && cd ..

# 配置环境变量（复制 .env.example 为 .env 并填写）
cp .env.example .env

# 启动所有服务
node auto-process.js
```
启动后：
- 前端访问：`http://localhost:5173`
- 后端 API：`http://localhost:3002`
- 自动监听 `attendance_data/` 目录，放入考勤文件即可自动上链

### 方式二：手动启动
```bash
# 1. 部署合约（首次运行）
node scripts/deployFisco.js

# 2. 启动后端
cd server && node index.js

# 3. 启动前端（新终端）
cd vue-app && npm run dev
```

---

## 4. 合约部署

**合约文件**：`contracts/AttendanceProof.sol`  
**部署脚本**：`scripts/deployFisco.js`

```bash
# 确保 .env 中配置了 ADMIN_PRIVATE_KEY（部署账户私钥）
node scripts/deployFisco.js
```

部署成功后：
- 合约地址自动写入 `fisco.config.js` 和 `.env`
- 部署记录保存在 `deployments/fisco/AttendanceProof.json`

---

## 5. 后端服务

**主入口**：`server/index.js`  
**端口**：3002（可在 `.env` 修改）

### 目录结构
```
server/
├── db/                # 数据库操作
├── routes/            # API 路由
│   ├── auth.js        # 认证
│   ├── attend.js      # 考勤存证核心
│   └── history.js     # 历史管理
├── middleware/        # 中间件
├── utils/             # 工具函数
├── attendance_storage/# 考勤元数据存储
└── config.js          # 配置加载
```

### 数据库表
- `users`：用户表
- `attendance_history`：考勤记录（默克尔根、日期、区块高度等）

---

## 6. 前端界面

**技术栈**：Vue 3 + TypeScript + TailwindCSS

### 主要页面
| 页面 | 功能 |
|------|------|
| 登录 | 用户认证（admin/password123） |
| 控制台 | 统计概览（模拟数据） |
| 考勤采集 | 上传考勤文件，生成默克尔根并上链 |
| 考勤验真 | 输入默克尔根，验证链上存在性 |
| 历史记录 | 查看、删除、重置考勤记录 |
| 调试工具 | 存储诊断、路径查看 |

### API 模块
- `vue-app/src/api/modules/attend.ts`：考勤相关接口
- `vue-app/src/api/modules/auth.ts`：认证接口

---

## 7. 核心脚本说明

所有脚本位于 `scripts/` 目录，需在项目根目录执行。

| 脚本 | 功能 | 命令示例 |
|------|------|----------|
| `deployFisco.js` | 部署考勤合约 | `node scripts/deployFisco.js` |
| `uploadMerkleRoot.js` | 单条默克尔根上链 | `node scripts/uploadMerkleRoot.js <root> <timestamp>` |
| `verifyMerkleRoot.js` | 验证默克尔根 | `node scripts/verifyMerkleRoot.js <root>` |
| `batchUpload.js` | 批量处理考勤文件 | `node scripts/batchUpload.js <目录> [报告目录] [日期]` |
| `syncState.js` | 同步数据库记录到链上 | `node scripts/syncState.js` |
| `systemCheck.js` | 系统综合检查 | `node scripts/systemCheck.js` |
| `testContractConnection.js` | 测试合约连接 | `node scripts/testContractConnection.js` |
| `validateDataFlow.js` | 端到端数据流验证 | `node scripts/validateDataFlow.js` |
| `verify_state_consistency.js` | 三方状态一致性校验 | `node scripts/verify_state_consistency.js` |

---

## 8. API 接口文档

### 认证相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录，返回 JWT |

### 考勤存证（需认证）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/attend/calculate-merkle-root` | 生成默克尔根 |
| POST | `/api/attend/upload-merkle-root` | 上链存证 |
| POST | `/api/attend/verify-merkle-root` | 验真查询 |
| GET  | `/api/attend/attendance-history` | 获取历史记录 |
| DELETE | `/api/attend/attendance-record/:root` | 软删除记录 |

### 历史管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/api/history` | 获取全部历史（含已删除） |
| DELETE | `/api/history/clear-all` | 清除已删除记录 |
| POST   | `/api/history/reset-all` | 完全重置（需 `ALLOW_FULL_RESET=true`） |

---

## 9. 常见问题

**Q1: 部署合约时提示 "CONTRACT_ADDRESS 未设置"**  
A: 检查 `.env` 或 `fisco.config.js` 中 `ADMIN_PRIVATE_KEY` 是否正确。

**Q2: 上链失败，报 "connection refused"**  
A: 确保 FISCO BCOS 节点已启动，RPC 端口正确（默认 8545）。

**Q3: 前端无法连接后端 API**  
A: 检查后端是否运行在 3002 端口，Vue 代理配置 (`vite.config.ts`) 是否正确。

**Q4: 如何重置所有数据？**  
A: 调用 `POST /api/history/reset-all`，或在历史记录页面点击“完全重置”。

---

**文档版本**：v1.0 (FISCO BCOS 迁移版)  
**更新日期**：2026-04-10  
**项目仓库**：fisco-attendance-proof-system