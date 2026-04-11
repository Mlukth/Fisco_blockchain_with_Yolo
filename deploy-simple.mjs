import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const web3 = new Web3('http://127.0.0.1:8545');
  
  // 使用生成的账户
  const privateKey = '0xf46b0cfd862931cdfb086e2e5f208b70872d55dc2da040d865fe83d995c879ce';
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);
  
  console.log('���� ��连接到 FISCO BCOS 节点...');
  console.log(`���� ��账户: ${account.address}`);
  
  // 编译合约
  const contractSource = fs.readFileSync(path.join(__dirname, 'contracts', 'AttendanceProof.sol'), 'utf8');
  const solc = await import('solc');
  
  const input = {
    language: 'Solidity',
    sources: { 'AttendanceProof.sol': { content: contractSource } },
    settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
  };
  
  const output = JSON.parse(solc.default.compile(JSON.stringify(input)));
  
  if (output.errors) {
    console.error('编译错误:', output.errors.filter(e => e.severity === 'error'));
    if (output.errors.some(e => e.severity === 'error')) return;
  }
  
  const contract = output.contracts['AttendanceProof.sol']['AttendanceProof'];
  const abi = contract.abi;
  const bytecode = '0x' + contract.evm.bytecode.object;
  
  console.log('✅ 合约编译成功');
  
  // 部署
  console.log('���� ��部署合约中...');
  
  const myContract = new web3.eth.Contract(abi);
  
  try {
    const deployTx = myContract.deploy({ data: bytecode, arguments: [] });
    const estimatedGas = await deployTx.estimateGas({ from: account.address });
    console.log(`估算 Gas: ${estimatedGas}`);
    
    const deployed = await deployTx.send({ 
      from: account.address, 
      gas: Math.min(estimatedGas * 2, 3000000),
      gasPrice: '0'
    });
    
    console.log(`✅ 合约部署成功！`);
    console.log(`���� ��合约地址: ${deployed.options.address}`);
    
    // 保存
    fs.writeFileSync('artifacts/AttendanceProof.json', JSON.stringify({ abi, address: deployed.options.address }, null, 2));
    console.log('���� ��已保存到 artifacts/AttendanceProof.json');
  } catch (error) {
    console.error('部署失败:', error.message);
    console.log('\n尝试使用 sendTransaction 方式...');
    
    // 备用方式：直接发送交易
    const txData = bytecode;
    const tx = {
      from: account.address,
      data: txData,
      gas: 3000000,
      gasPrice: '0'
    };
    
    const receipt = await web3.eth.sendTransaction(tx);
    console.log('交易回执:', receipt);
  }
}

main().catch(console.error);
