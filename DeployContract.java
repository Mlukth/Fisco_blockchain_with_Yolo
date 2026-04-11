import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.manager.TransactionProcessorFactory;
import java.nio.file.*;

public class DeployContract {
    public static void main(String[] args) throws Exception {
        // 读取 bytecode
        String bytecode = new String(Files.readAllBytes(Paths.get("/home/mmm/fisco/console/contracts/bin/AttendanceProof.bin"))).trim();
        
        // 移除换行符和 0x 前缀
        bytecode = bytecode.replace("\n", "").replace("\r", "");
        if (bytecode.startsWith("0x")) {
            bytecode = bytecode.substring(2);
        }
        
        System.out.println("Bytecode length: " + bytecode.length());
        
        // 创建 SDK 配置
        String toml = "[cryptoMaterial]\n"
            + "certPath = \"/home/mmm/fisco/console/conf\"\n"
            + "useSMCrypto = \"false\"\n\n"
            + "[network]\n"
            + "peers=[\"127.0.0.1:20200\"]\n"
            + "defaultGroup=\"group0\"\n\n"
            + "[account]\n"
            + "keyStoreDir = \"account\"\n\n"
            + "[threadPool]\n"
            + "maxBlockingQueueSize = \"102400\"\n";
        Files.write(Paths.get("sdk.toml"), toml.getBytes());
        
        // 初始化 SDK
        BcosSDK sdk = BcosSDK.build("sdk.toml");
        Client client = sdk.getClient();
        
        // 设置部署账户
        CryptoSuite cryptoSuite = client.getCryptoSuite();
        CryptoKeyPair keyPair = cryptoSuite.generateRandomKeyPair();
        System.out.println("Deploy account: " + keyPair.getAddress());
        
        // 创建 AssembleTransactionProcessor
        AssembleTransactionProcessor processor = TransactionProcessorFactory.createAssembleTransactionProcessor(client, keyPair);
        
        // 准备 bytecode 数据
        byte[] data = hexToBytes(bytecode);
        System.out.println("Data bytes: " + data.length);
        System.out.println("Deploying contract...");
        
        // 部署合约
        TransactionReceipt receipt = processor.deployAndGetReceipt(data);
        
        if (receipt.isStatusOK()) {
            System.out.println("\n✅ Deploy SUCCESS!");
            System.out.println("Contract address: " + receipt.getContractAddress());
            System.out.println("Transaction hash: " + receipt.getTransactionHash());
            Files.write(Paths.get("contract_address.txt"), receipt.getContractAddress().getBytes());
            System.out.println("Address saved to: contract_address.txt");
        } else {
            System.out.println("\n❌ FAILED!");
            System.out.println("Status: " + receipt.getStatus());
            System.out.println("Message: " + receipt.getMessage());
            if (receipt.getOutput() != null && !receipt.getOutput().isEmpty()) {
                System.out.println("Output: " + receipt.getOutput());
            }
        }
    }
    
    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                 + Character.digit(hex.charAt(i+1), 16));
        }
        return data;
    }
}
