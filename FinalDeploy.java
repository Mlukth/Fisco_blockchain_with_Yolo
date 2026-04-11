import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.manager.TransactionProcessorFactory;
import java.nio.file.*;
import java.util.Collections;

public class FinalDeploy {
    public static void main(String[] args) throws Exception {
        String abi = new String(Files.readAllBytes(Paths.get("/home/mmm/fisco/console/contracts/abi/AttendanceProof.abi")));
        String bin = new String(Files.readAllBytes(Paths.get("/home/mmm/fisco/console/contracts/bin/AttendanceProof.bin"))).trim().replace("\n", "");
        
        String toml = "[cryptoMaterial]\ncertPath = \"/home/mmm/fisco/console/conf\"\nuseSMCrypto = \"false\"\n\n[network]\npeers=[\"127.0.0.1:20200\"]\ndefaultGroup=\"group0\"\n\n[account]\nkeyStoreDir = \"account\"\n\n[threadPool]\nmaxBlockingQueueSize = \"102400\"\n";
        Files.write(Paths.get("sdk.toml"), toml.getBytes());
        
        BcosSDK sdk = BcosSDK.build("sdk.toml");
        Client client = sdk.getClient();
        
        CryptoKeyPair keyPair = client.getCryptoSuite().generateRandomKeyPair();
        System.out.println("Account: " + keyPair.getAddress());
        
        AssembleTransactionProcessor processor = TransactionProcessorFactory.createAssembleTransactionProcessor(client, keyPair);
        
        // 关键：使用 deployAndGetReceipt，不是 deployOnly
        TransactionReceipt receipt = processor.deployAndGetReceipt(hexToBytes(bin), abi, "");
        
        if (receipt.isStatusOK()) {
            String contractAddr = receipt.getContractAddress();
            System.out.println("\n✅ SUCCESS!");
            System.out.println("Contract: " + contractAddr);
            System.out.println("Length: " + contractAddr.length());
            Files.write(Paths.get("contract_address.txt"), contractAddr.getBytes());
        } else {
            System.out.println("❌ Status: " + receipt.getStatus());
            System.out.println("Message: " + receipt.getMessage());
        }
    }
    
    private static byte[] hexToBytes(String hex) {
        if (hex.startsWith("0x")) hex = hex.substring(2);
        byte[] data = new byte[hex.length() / 2];
        for (int i = 0; i < hex.length(); i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4) + Character.digit(hex.charAt(i+1), 16));
        }
        return data;
    }
}
