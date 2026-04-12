# 智慧课堂考勤存证系统 —— 项目说明（精简版 v1.2）

## 📌 项目简介

本项目是一个面向中小学的考勤数据区块链存证系统，基于 **FISCO BCOS 3.x** 联盟链与 **Vue 3** 构建。系统将考勤数据的默克尔根上链存证，支持多角色（管理员/教师/家长）管理及数据验真。经精简后聚焦 **不可篡改存证、三角色轻量化查询、一键批量验真** 三大核心卖点。

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

## 📁 目录结构与文件说明（精简后）

### 1. 核心配置文件

| 文件路径 | 作用 |
|----------|------|
| `.env` | 区块链连接、合约地址、JWT 密钥、服务端口 |
| `fisco.config.js` | FISCO SDK 配置：Channel 地址、群组/链ID、证书路径、管理员私钥 |
| `package.json`（根目录） | 项目脚本：`start`、`deploy` 等 |

### 2. 智能合约与区块链交互

| 文件路径 | 作用 |
|----------|------|
| `contracts/AttendanceProof.sol` | 存证合约：上链、验真、查询时间戳 |
| `sdk/` | FISCO 节点连接证书目录 |
| `scripts/deployFisco.js` | 合约部署脚本 |
| `scripts/verifyMerkleRoot.js` | 命令行验真工具 |

### 3. 后端服务 (`server/`)

| 文件路径 | 作用 |
|----------|------|
| `index.js` | 服务入口（端口 3002） |
| `config.js` | 加载区块链配置、JWT 密钥 |
| `db/index.js` | SQLite 数据库（仅保留用户、考勤记录、存证历史三张表） |
| `middleware/auth.js` | JWT 验证与角色校验 |
| `utils/contractManager.js` | 区块链交互封装（初始化、上链、验真） |
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
| `src/api/modules/admin.ts` | 管理员 API（仅统计、用户管理） |
| `src/api/modules/teacher.ts` | 教师 API |
| `src/api/modules/parent.ts` | 家长 API |
| `src/api/modules/attend.ts` | 存证 API（单条/批量验真） |
| `src/router/index.ts` | 路由守卫，三角色权限控制 |
| `src/layouts/AdminLayout.vue` | 管理员布局（仅仪表盘、用户管理菜单） |
| `src/layouts/TeacherLayout.vue` | 教师布局 |
| `src/layouts/ParentLayout.vue` | 家长布局 |
| `src/views/Login.vue` | 登录页 |
| `src/views/admin/Dashboard.vue` | 管理员仪表盘 |
| `src/views/admin/Users.vue` | 用户管理 |
| `src/views/teacher/ClassAttendance.vue` | 班级今日考勤 |
| `src/views/teacher/History.vue` | 班级历史统计 |
| `src/views/parent/Attendance.vue` | 孩子今日考勤 + 一键验真 |
| `src/views/parent/History.vue` | 月度历史 + 批量验真 |

---

## 🔗 模块调用关系

```
前端 → Express 路由 → JWT 中间件 → 业务逻辑
                ↓
       db/index.js (SQLite)  ←→  users.db
                ↓
     utils/contractManager.js → FISCO BCOS 节点
                ↓
       默克尔根计算（attend.js 内置）
```

**上链流程**：
1. 教师/管理员触发考勤数据上链（自动或批量接口）
2. 后端计算默克尔根
3. 调用合约 `uploadMerkleRoot` 发送交易
4. 交易成功后将默克尔根、区块高度存入 `attendance_history`

---

## 🚀 快速启动（精简版）

### 一键启动脚本

```bash
# 1. 启动 FISCO BCOS 节点
cd /home/mmm/fisco/nodes/127.0.0.1 && bash start_all.sh

# 2. 启动后端（后台）
cd /home/mmm/Fisco_blockchain_with_Yolo/server && nohup node index.js > backend.log 2>&1 &

# 3. 启动前端（后台）
cd /home/mmm/simple-vue-app && nohup npm run dev > frontend.log 2>&1 &

# 4. 检查状态
sleep 3
curl -s http://localhost:3002/api/health && echo " ✅ 后端运行中"
curl -s http://localhost:8000 | grep -q "html" && echo " ✅ 前端运行中"
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

1. **FISCO BCOS 节点**：确保节点运行在 `127.0.0.1:20200`，`sdk/` 证书已复制到项目目录。
2. **合约部署**：执行 `npm run deploy` 编译并部署合约，自动更新 `.env` 中的合约地址。
3. **环境变量**：编辑 `.env`，填写 `ADMIN_PRIVATE_KEY`（用于发送上链交易）。
4. **数据库**：后端首次启动自动创建 `server/data/users.db` 并初始化表结构（精简版）。

---

## ✨ 核心功能亮点（答辩重点）

### 1. 不可篡改存证
- 每日考勤数据生成默克尔根并上链，链上数据无法修改。
- 提供单条/批量验真接口，实时校验数据真实性。

### 2. 三角色轻量化设计
- **管理员**：仪表盘统计 + 用户管理，无冗余菜单。
- **教师**：查看班级考勤与历史统计。
- **家长**：查看孩子今日状态、月度历史，**一键批量验真**。

### 3. 高效批量验真
- 家长在历史记录页点击“一键批量验真”，1 秒内完成月度所有记录的链上校验。
- 返回有效存证数量，直观展示数据可信度。

---

## ❓ 常见问题

### Q1：启动后端时报证书错误
- 确认 `fisco.config.js` 中 `ssl.certPath` 指向正确的 SDK 证书目录。
- 检查证书文件：`ca.crt`、`sdk.crt`、`sdk.key`。

### Q2：上链交易失败
- 检查 `.env` 中 `ADMIN_PRIVATE_KEY` 是否正确。
- 确认 FISCO 节点正常运行，合约已部署。

### Q3：前端验真提示“该记录尚未上链”
- 考勤记录需先通过上链接口存证，验真功能依赖链上数据。

---

## 📚 相关文档

- FISCO BCOS 官方文档：https://fisco-bcos-documentation.readthedocs.io/

---

**文档版本**：v1.2  
**最后更新**：2026-04-12  
**更新说明**：项目已完成精简，移除冗余页面/路由/脚本，聚焦存证与验真核心功能。文档同步更新以反映当前状态。