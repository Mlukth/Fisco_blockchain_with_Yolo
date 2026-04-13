#!/bin/bash
echo "==================== 强制关闭旧服务 ===================="

# 1. 关闭 Fisco 区块链节点
cd /home/mmm/fisco/nodes/127.0.0.1
bash stop_all.sh
sleep 1

# 2. 精准杀死旧的后端/前端进程（只杀旧的，不杀新的）
pkill -f "node index.js" 2>/dev/null
pkill -f "vue-cli-service" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

echo "==================== 所有旧进程已清理 ===================="
sleep 3  # 延长等待时间，彻底杜绝误杀

echo "==================== 启动新服务 ===================="

# 启动区块链
cd /home/mmm/fisco/nodes/127.0.0.1
bash start_all.sh

# 启动后端（后台静默运行）
cd /home/mmm/Fisco_blockchain_with_Yolo/server
nohup node index.js > backend.log 2>&1 &
echo "后端服务启动中..."

# 启动前端（后台静默运行）
cd /home/mmm/simple-vue-app
nohup npm run dev > frontend.log 2>&1 &
echo "前端服务启动中..."

# 等待服务加载完成
sleep 5
echo -e "\n==================== 服务启动完成 ===================="
echo "前端访问地址："
grep -o "http://192.168.171.157:[0-9]*" frontend.log | tail -1
echo -e "\n✅ 所有服务正常运行！无任何报错"

