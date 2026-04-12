# 智慧课堂考勤存证系统 —— 项目说明

## 📌 项目简介

本项目是一个面向中小学的考勤数据区块链存证系统，基于 **FISCO BCOS 3.x** 联盟链与 **Vue 3** 构建。系统通过将考勤数据的默克尔根上链存证，支持多角色（管理员/教师/家长）管理及数据验真。

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
| FISCO BCOS Channel | 20200 | 支持交易上链 |
| FISCO BCOS HTTP RPC | 8545 | 查询接口 |
| 后端 API (Node.js) | 3002 | 业务接口 |
| 前端 Web (Vite) | 8000 | 用户访问入口 |

---

## 📁 目录结构与文件说明

### 1. 环境与依赖配置

| 文件路径 | 作用 |
|----------|------|
| `.env` | 环境变量：FISCO 连接信息、合约地址、服务端口、JWT 密钥、存储路径等 |
| `package.json`（根目录） | 项目脚本：`start`（启动后端）、`deploy`（部署合约）、`sync`（同步考勤）<br>依赖：`@fiscobcos/nodejs-sdk`、`merkletreejs`、`better-sqlite3`、`bcrypt`、`jsonwebtoken`、`express`、`solc` 等 |
| `server/package.json` | 后端专属依赖及 `start` 脚本 |
| `simple-vue-app/package.json` | 前端依赖：`vue`、`vue-router`、`pinia`、`axios`<br>开发脚本：`dev`（端口 8000）、`build` |
| `simple-vue-app/vite.config.ts` | Vite 配置：插件、路径别名 `@`、开发服务器端口 8000 且允许外部访问 |

### 2. 智能合约与区块链交互

| 文件路径 | 作用 |
|----------|------|
| `contracts/AttendanceProof.sol` | 存证合约：`uploadMerkleRoot`（上链）、`isMerkleRootValid`（验真）、`getMerkleRootTimestamp`、`getAllMerkleRoots` 等 |
| `fisco.config.js` | Node.js SDK 配置：Channel 地址、群组/链ID、管理员私钥、合约地址、SSL 证书路径 |
| `sdk/ca.crt`、`sdk/sdk.crt`、`sdk/sdk.key`、`sdk/sdk.nodeid` | SDK 连接 FISCO 节点所需的证书文件 |
| `scripts/config.js` | 加载 `fisco.config.js` 和环境变量，导出区块链连接参数及 ABI 路径 |
| `scripts/deployFisco.js` | 合约部署脚本：编译合约、发送部署交易、自动更新 `fisco.config.js` 中的合约地址 |
| `scripts/uploadMerkleRoot.js` | 命令行工具：手动上链默克尔根 |
| `scripts/verifyMerkleRoot.js` | 命令行工具：验证默克尔根是否存在于链上 |
| `scripts/batchUpload.js` | 批量上链脚本：扫描目录中的 JSON/CSV 文件，计算默克尔根并上链，支持数据库记录 |

### 3. 后端服务 (`server/`)

| 文件路径 | 作用 |
|----------|------|
| `index.js` | 服务入口：加载配置、注册路由、启动 HTTP 服务（端口 3002） |
| `config.js` | 加载并验证区块链配置、JWT 密钥、存储路径，提供 `validateConfig()`、`getCertPaths()` 等函数 |
| `db/index.js` | SQLite 数据库初始化及表操作：用户、匿名映射、考勤记录、设备、操作日志、存证历史 |
| `middleware/auth.js` | JWT 验证中间件 `authenticateToken` 和角色校验 `requireRole` |
| `utils/contractManager.js` | 封装与 FISCO 合约的交互：初始化 SDK、调用合约只读方法、发送交易 |
| `utils/hashCalculator.js` | 哈希计算：文件 SHA-256、默克尔树构建、字节格式验证 |
| `routes/auth.js` | 认证接口：`POST /login`、`POST /refresh-token`、`POST /logout`、`GET /profile` |
| `routes/attend.js` | 考勤存证核心接口：计算默克尔根、上链、验证、存证历史、批量上传 |
| `routes/admin.js` | 管理员接口：仪表盘统计、用户/设备管理、配置、诊断、日志、异常提醒 |
| `routes/teacher.js` | 教师接口：班级考勤、历史统计、异常复核 |
| `routes/parent.js` | 家长接口：孩子今日考勤、月度历史记录 |
| `routes/history.js` | 存证历史管理：查看、软删除、完全重置 |
| `routes/debug.js` | 调试接口：存储状态、数据一致性验证 |
| `routes/protected.js` | 受保护资源示例：`GET /profile` 返回用户信息 |

### 4. 前端应用 (`simple-vue-app/`)

| 文件路径 | 作用 |
|----------|------|
| `src/api/index.ts` | Axios 实例：baseURL 指向 `http://192.168.171.157:3002/api`，请求拦截器附加 token，响应拦截器处理 401 跳转 |
| `src/api/modules/auth.ts` | 认证 API：`login`、`refreshToken`、`getProfile`、`logout` |
| `src/api/modules/admin.ts` | 管理员 API：统计、用户管理、设备管理、配置、诊断、日志、异常 |
| `src/api/modules/teacher.ts` | 教师 API：班级考勤、历史统计、异常列表、提交复核 |
| `src/api/modules/parent.ts` | 家长 API：获取孩子列表、今日考勤、历史记录 |
| `src/stores/auth.ts` | Pinia 认证状态：存储 token 和用户信息，提供 `login`、`logout` |
| `src/router/index.ts` | 路由定义及守卫：基于角色权限重定向，未登录跳转登录页 |
| `src/layouts/AdminLayout.vue` | 管理员布局：侧边栏导航（仪表盘/用户/设备/配置/诊断）、顶部用户信息及退出 |
| `src/layouts/TeacherLayout.vue` | 教师布局：侧边栏导航（班级考勤/历史统计/异常复核） |
| `src/layouts/ParentLayout.vue` | 家长布局：侧边栏导航（孩子考勤/历史记录） |
| `src/layouts/AuthLayout.vue` | 认证页布局（仅 `<router-view />`） |
| `src/views/Login.vue` | 登录页：角色切换、演示账号、表单提交 |
| `src/views/Upload.vue` | 手动考勤上报页（模拟提交，未调用后端 API） |
| `src/views/Verify.vue` | 独立验真页（模拟验证，未调用真实验真接口） |
| `src/views/admin/Dashboard.vue` | 管理员仪表盘：统计卡片、设备监控、异常提醒 |
| `src/views/admin/Users.vue` | 用户管理：增删改查、角色过滤、搜索 |
| `src/views/admin/Devices.vue` | 设备管理：增删改查、心跳检测 |
| `src/views/admin/Config.vue` | 系统配置：区块链参数、系统设置、数据备份（模拟） |
| `src/views/admin/Diagnosis.vue` | 系统诊断：检测项状态、系统日志 |
| `src/views/teacher/ClassAttendance.vue` | 今日班级考勤统计及记录列表 |
| `src/views/teacher/History.vue` | 班级历史统计（日期范围查询） |
| `src/views/teacher/Review.vue` | 异常考勤复核（单条/批量） |
| `src/views/parent/Attendance.vue` | 孩子今日考勤及一键验真（验真参数不完整，待完善） |
| `src/views/parent/History.vue` | 孩子月度历史记录及统计（验真按钮仅占位） |

---

## 🔗 模块调用关系

### 后端核心调用链

```
前端请求 → Express 路由 → 中间件 (JWT 验证) → 业务逻辑
                    ↓
         db/index.js (SQLite)  ←→  数据库文件 users.db
                    ↓
         utils/contractManager.js → @fiscobcos/nodejs-sdk → FISCO BCOS 节点 (Channel 20200)
                    ↓
         utils/hashCalculator.js (默克尔根计算)
```

### 上链存证流程

1. 教师/管理员通过前端上传考勤数据（或调用批量上传接口）
2. 后端 `attend.js` 调用 `hashCalculator.calculateMerkleRoot` 生成根哈希
3. 调用 `contractManager.uploadMerkleRoot` 发送交易至区块链
4. 交易成功后，将默克尔根、区块高度等信息存入 `attendance_history` 表

### 验真功能现状

- **后端已支持**：`POST /api/attend/verify-merkle-root` 可查询任意默克尔根是否存在
- **前端家长端问题**：
  - `parent/History.vue` 中“验真”按钮仅弹出 `alert`，未调用 API
  - `parent/Attendance.vue` 中调用 `attendApi.verifyMerkleRoot` 时传入 `merkleRoot` 为空字符串
  - 考勤记录表 `attendance_records` 未存储 `merkle_root` 字段，导致无法获取验真所需根哈希

---

## 🚀 快速启动

### 一键启动脚本

```bash
# 1. 启动 FISCO BCOS 节点
cd /home/mmm/fisco/nodes/127.0.0.1 && bash start_all.sh

# 2. 启动后端（后台运行）
cd /home/mmm/Fisco_blockchain_with_Yolo/server && nohup node index.js > backend.log 2>&1 &

# 3. 启动前端（后台运行）
cd /home/mmm/simple-vue-app && nohup npm run dev > frontend.log 2>&1 &

# 4. 等待启动完成
sleep 3

# 5. 检查状态
echo "========== 服务状态 =========="
ps aux | grep fisco | grep -v grep | head -1 && echo "✅ FISCO 节点运行中"
curl -s http://localhost:3002/api/health && echo " ✅ 后端运行中"
cat /home/mmm/simple-vue-app/frontend.log | grep -o "http://[^\"]*" | tail -1
```

### 访问地址

- 前端：http://192.168.171.157:8000
- 后端健康检查：http://192.168.171.157:3002/api/health

### 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | password123 |
| 教师 | teacher | password123 |
| 家长 | parent | password123 |

---

## 🔧 首次部署注意事项

1. **FISCO BCOS 节点**：确保节点已运行在 `127.0.0.1:20200`，且 `sdk/` 目录证书已复制到项目 `sdk/` 下。
2. **合约部署**：在项目根目录执行 `npm run deploy`，该命令会编译合约、发送部署交易、自动更新 `fisco.config.js` 中的合约地址。
3. **环境变量**：检查 `.env` 文件，确保 `ADMIN_PRIVATE_KEY` 已填写实际私钥。
4. **数据库**：后端首次启动时会自动创建 `server/data/users.db` 并初始化表结构。

---

## ❓ 常见问题

### Q1：启动后端时报证书错误
- 确认 `fisco.config.js` 中 `ssl.certPath` 指向正确的 SDK 证书目录（通常为 `/home/mmm/fisco/nodes/127.0.0.1/sdk`）
- 检查证书文件是否完整：`ca.crt`、`sdk.crt`、`sdk.key`

### Q2：前端验真功能无法使用
- 当前前端代码中验真功能尚未完整实现，需完善以下内容：
  1. 在 `attendance_records` 表增加 `merkle_root` 字段
  2. 修改家长历史 API 返回该字段
  3. 前端 `parent/History.vue` 中 `verifyRecord` 调用 `attendApi.verifyMerkleRoot` 并传入正确根哈希

### Q3：如何新增考勤测试数据？
- 使用 `scripts/batchUpload.js` 脚本批量导入（需准备 JSON/CSV 格式数据）
- 或通过前端 `Upload.vue` 手动录入（当前为模拟实现，未实际调用后端）

---

## 📚 相关文档

- 项目详细设计文档：`项目总文档.md`
- FISCO BCOS 官方文档：https://fisco-bcos-documentation.readthedocs.io/

---

**文档生成说明**：本文件内容严格基于已提供的实际代码文件，未包含任何推断或未提供原文的文件描述。  
**最后更新**：2026-04-12