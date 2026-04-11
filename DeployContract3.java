import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.manager.TransactionProcessorFactory;
import org.fisco.bcos.sdk.v3.transaction.model.dto.TransactionResponse;
import java.nio.file.*;
import java.util.Collections;

public class DeployContract3 {
    public static void main(String[] args) throws Exception {
        // 读取 ABI 和 BIN
        String abi = new String(Files.readAllBytes(Paths.get("/home/mmm/fisco/console/contracts/abi/AttendanceProof.abi")));
        String bin = new String(Files.readAllBytes(Paths.get("/home/mmm/fisco/console/contracts/bin/AttendanceProof.bin"))).trim();
        
        // 清理 BIN
        bin = bin.replace("\n", "").replace("\r", "");
        
        System.out.println("ABI length: " + abi.length());
        System.out.println("BIN length: " + bin.length());
        
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
        
        System.out.println("Deploying contract...");
        
        // 使用 deployAndGetResponse 方法
        TransactionResponse response = processor.deployAndGetResponse(abi, bin, Collections.emptyList());
        
        // 打印所有可能的字段
        System.out.println("\n=== Response Details ===");
        System.out.println("Contract Address: " + response.getContractAddress());
        System.out.println("Receipt Messages: " + response.getReceiptMessages());
        
        if (response.getTransactionReceipt() != null) {
            TransactionReceipt receipt = response.getTransactionReceipt();
            System.out.println("\n=== Receipt Details ===");
            System.out.println("Status: " + receipt.getStatus());
            System.out.println("Contract Address: " + receipt.getContractAddress());
            System.out.println("Transaction Hash: " + receipt.getTransactionHash());
            
            if (receipt.isStatusOK()) {
                Files.write(Paths.get("contract_address.txt"), receipt.getContractAddress().getBytes());
                System.out.println("\n✅ Address saved to: contract_address.txt");
            } else {
                System.out.println("Message: " + receipt.getMessage());
            }
        } else {
            System.out.println("TransactionReceipt is null");
        }
    }
}
