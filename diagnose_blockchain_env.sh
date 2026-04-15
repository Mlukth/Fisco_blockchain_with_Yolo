#!/bin/bash
# 文件名: diagnose_blockchain_env.sh
# 用法: bash diagnose_blockchain_env.sh

echo "=========================================="
echo " 智慧课堂考勤系统 - 区块链环境诊断报告"
echo " 时间: $(date)"
echo "=========================================="

# 1. 节点版本检查
echo -e "\n[1/3] 检查 FISCO BCOS 节点版本"
NODE_BIN="/home/mmm/fisco/nodes/127.0.0.1/fisco-bcos"
if [ -f "$NODE_BIN" ]; then
    VERSION_OUTPUT=$("$NODE_BIN" -v 2>&1)
    echo "$VERSION_OUTPUT"
    if echo "$VERSION_OUTPUT" | grep -q "3.11.0"; then
        echo "✅ 节点版本匹配项目要求 (3.11.0)"
    else
        echo "⚠️ 警告：节点版本可能与项目要求不符"
    fi
else
    echo "❌ 节点二进制不存在，请检查节点部署"
fi

# 2. 合约部署状态检查
echo -e "\n[2/3] 检查合约部署状态"
PROJECT_ROOT="/home/mmm/Fisco_blockchain_with_Yolo"
cd "$PROJECT_ROOT"
if [ -f "artifacts/AttendanceProof.json" ]; then
    echo "✅ 合约编译产物存在"
    # 寻找合约地址
    ADDRESS_FOUND=$(grep -r "0x[a-fA-F0-9]\{40\}" contract_address.txt DEPLOYMENT_INFO.md server/.env .env 2>/dev/null | head -1)
    if [ -n "$ADDRESS_FOUND" ]; then
        echo "✅ 发现合约地址记录: $ADDRESS_FOUND"
    else
        echo "⚠️ 未发现合约地址，合约可能尚未部署"
    fi
else
    echo "❌ 合约未编译，请先执行编译命令"
fi

# 3. SDK 证书配置检查
echo -e "\n[3/3] 检查 SDK 证书与配置"
SDK_DIR="$PROJECT_ROOT/sdk"
if [ -d "$SDK_DIR" ]; then
    missing=0
    for file in sdk.crt sdk.key ca.crt; do
        if [ -f "$SDK_DIR/$file" ] || [ -f "$SDK_DIR/sdk/$file" ]; then
            echo "✅ 证书 $file 存在"
        else
            echo "❌ 证书 $file 缺失"
            missing=1
        fi
    done
    if [ $missing -eq 0 ]; then
        echo "✅ 证书文件完备"
    fi
else
    echo "❌ sdk 目录不存在"
fi

# 4. 后端依赖检查
echo -e "\n[附加] 检查后端 SDK 依赖"
cd "$PROJECT_ROOT/server"
if grep -q "@fiscobcos/fisco-bcos" package.json; then
    INSTALLED=$(npm list @fiscobcos/fisco-bcos 2>/dev/null | grep @fiscobcos/fisco-bcos || echo "未安装")
    echo "依赖声明: $(grep '@fiscobcos/fisco-bcos' package.json)"
    echo "安装状态: $INSTALLED"
else
    echo "⚠️ package.json 中未声明 @fiscobcos/fisco-bcos"
fi

echo -e "\n=========================================="
echo "诊断完成。请根据上述结果进行相应操作。"
echo "=========================================="