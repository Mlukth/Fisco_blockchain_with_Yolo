import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // 连接 FISCO BCOS 节点（HTTP RPC）
  const web3 = new Web3('http://127.0.0.1:8545');
  
  console.log('���� ��连接到 FISCO BCOS 节点...');
  
  // 检查连接
  const blockNumber = await web3.eth.getBlockNumber();
  console.log(`✅ 连接成功！当前区块高度: ${blockNumber}`);
  
  // 创建账户
  const account = web3.eth.accounts.create();
  console.log(`���� ��创建新账户: ${account.address}`);
  console.log(`���� ��私钥: ${account.privateKey}`);
  
  // 读取合约源码
  const contractPath = path.join(__dirname, 'contracts', 'AttendanceProof.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');
  
  console.log('\n���� ��合约源码已读取');
  console.log('开始编译合约...');
  
  // 使用 solc 编译
  const solc = await import('solc');
  
  const input = {
    language: 'Solidity',
    sources: {
      'AttendanceProof.sol': {
        content: contractSource
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };
  
  const output = JSON.parse(solc.default.compile(JSON.stringify(input)));
  
  if (output.errors) {
    console.error('❌ 编译错误:', output.errors);
    return;
  }
  
  const contract = output.contracts['AttendanceProof.sol']['AttendanceProof'];
  const abi = contract.abi;
  const bytecode = '0x' + contract.evm.bytecode.object;
  
  console.log('✅ 合约编译成功！');
  console.log(`���� Bytecode ��长度: ${bytecode.length} 字符`);
  
  // 部署合约
  console.log('\n���� ��开始部署合约...');
  
  const Contract = new web3.eth.Contract(abi);
  const deployTx = Contract.deploy({
    data: bytecode,
    arguments: []
  });
  
  // 用新账户部署（需要先给这个账户转一些币）
  // FISCO BCOS 3.x 默认情况下可能不需要 gas 费
  // 先尝试部署
  
  const deployedContract = await deployTx.send({
    from: account.address,
    gas: 3000000,
    gasPrice: '0'
  });
  
  console.log(`✅ 合约部署成功！`);
  console.log(`���� ��合约地址: ${deployedContract.options.address}`);
  
  // 保存 ABI 和地址
  const artifact = {
    abi: abi,
    address: deployedContract.options.address
  };
  
  fs.writeFileSync('artifacts/AttendanceProof.json', JSON.stringify(artifact, null, 2));
  console.log('\n���� ABI ��和地址已保存到 artifacts/AttendanceProof.json');
}

main().catch(console.error);
