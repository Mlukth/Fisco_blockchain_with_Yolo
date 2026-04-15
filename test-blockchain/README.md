# 区块链 RPC 测试

## 运行步骤

1. 进入本目录：
   ```bash
   cd /home/mmm/Fisco_blockchain_with_Yolo/test-blockchain
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 运行测试脚本：
   ```bash
   node test-rpc-upload.js
   ```

## 预期输出

- 显示节点连接成功、合约代码存在。
- 发送一笔测试交易，返回交易哈希和区块高度。
- 确认存证数量增加，且上传的根在链上可查。

如果所有步骤通过，说明通过 HTTP RPC 调用合约的方案可行，可安全应用于原项目。