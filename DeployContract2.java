import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.manager.TransactionProcessorFactory;
import java.nio.file.*;
import java.util.Collections;

public class DeployContract2 {
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
        
        System.out.println("Deploying contract with ABI and BIN...");
        
        // 使用 deployOnly 方法
        String contractAddress = processor.deployOnly(abi, bin, Collections.emptyList());
        
        System.out.println("\n✅ Deploy SUCCESS!");
        System.out.println("Contract address: " + contractAddress);
        Files.write(Paths.get("contract_address.txt"), contractAddress.getBytes());
        System.out.println("Address saved to: contract_address.txt");
    }
}
