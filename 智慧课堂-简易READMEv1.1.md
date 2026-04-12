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

## ⚠️ 已知问题与待完善项

> 以下问题均基于 **实际代码审查** 和 **API 自动化测试** 结果，截至 2026-04-12。

### 1. 后端 SDK 依赖加载失败（阻塞上链功能）

- **现象**：调用 `/api/attend/upload-merkle-root` 时报错 `Cannot find package '@fiscobcos/nodejs-sdk/index.js'`
- **原因**：
  - `@fiscobcos/nodejs-sdk` 采用 monorepo 结构，无标准 ESM 入口文件
  - `server/utils/contractManager.js` 使用动态 `import()` 加载，Node.js ESM 解析失败
- **影响**：无法完成上链存证和验真查询，**核心区块链功能不可用**
- **测试结果**：`scripts/test-api.js` 中“存证-上链”和“存证-验证默克尔根”项失败

### 2. 前端验真功能未完整实现

- **`parent/Attendance.vue`**：
  - 调用 `attendApi.verifyMerkleRoot` 时传入 `merkleRoot` 为空字符串
  - 实际无法获取验真结果
- **`parent/History.vue`**：
  - “验真”按钮仅触发 `alert('验证...功能需完善')`，未调用任何 API
- **根本原因**：
  - 考勤记录表 `attendance_records` 缺少 `merkle_root` 字段
  - 家长端 API 未返回考勤记录对应的默克尔根
- **影响**：家长端“一键验真”功能形同虚设

### 3. 手动上传页面未对接后端

- **`Upload.vue`**：使用 `setTimeout` 模拟提交，未调用任何后端 API
- **影响**：无法通过前端界面上报考勤数据，只能依赖脚本或直接调用接口

### 4. 独立验真页面为前端模拟

- **`Verify.vue`**：使用 `setTimeout` 模拟验真结果，未调用真实后端接口
- **影响**：独立验真功能不可用

### 5. 匿名映射管理功能缺失

- **现状**：后端无 `/admin/anonymous-map` 相关接口，前端无管理界面
- **影响**：家长与学生的绑定关系只能通过手动操作数据库完成，无法在系统中管理

### 6. 数据库字段缺失问题（已在测试环境中手动修复）

- **现象**：`users` 表初始缺少 `phone`、`name`、`classroom_id` 字段
- **状态**：已通过 `ALTER TABLE` 手动添加，但新部署环境需重复执行

### 7. 依赖安装存在权限问题

- **现象**：`npm install @fiscobcos/nodejs-sdk` 时执行 `lerna bootstrap` 报 `Permission denied`
- **临时方案**：使用 `--ignore-scripts` 跳过安装脚本
- **影响**：部署过程需额外手动处理

---

## ❓ 常见问题

### Q1：启动后端时报证书错误
- 确认 `fisco.config.js` 中 `ssl.certPath` 指向正确的 SDK 证书目录（通常为 `/home/mmm/fisco/nodes/127.0.0.1/sdk`）
- 检查证书文件是否完整：`ca.crt`、`sdk.crt`、`sdk.key`

### Q2：前端验真功能无法使用
- 见「已知问题与待完善项」第 2 条，当前功能未完整实现

### Q3：如何新增考勤测试数据？
- 使用 `scripts/batchUpload.js` 脚本批量导入（需准备 JSON/CSV 格式数据）
- 或直接调用 `POST /api/attend/upload-merkle-root` 接口

---

## 📚 相关文档

- 项目详细设计文档：`项目总文档.md`
- FISCO BCOS 官方文档：https://fisco-bcos-documentation.readthedocs.io/

---

**文档版本**：v1.1  
**最后更新**：2026-04-12  
**更新内容**：新增「已知问题与待完善项」章节，记录当前系统功能缺陷