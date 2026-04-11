import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.manager.TransactionProcessorFactory;
import java.nio.file.*;

public class QuickDeploy {
    public static void main(String[] args) throws Exception {
        String bin = new String(Files.readAllBytes(Paths.get("build/AttendanceProof.bin"))).trim();
        bin = bin.replace("\n", "").replace("\r", "");
        
        System.out.println("BIN length: " + bin.length() + " chars");
        
        String toml = "[cryptoMaterial]\ncertPath = \"/home/mmm/fisco/console/conf\"\nuseSMCrypto = \"false\"\n\n[network]\npeers=[\"127.0.0.1:20200\"]\ndefaultGroup=\"group0\"\n\n[account]\nkeyStoreDir = \"account\"\n\n[threadPool]\nmaxBlockingQueueSize = \"102400\"\n";
        Files.write(Paths.get("sdk.toml"), toml.getBytes());
        
        BcosSDK sdk = BcosSDK.build("sdk.toml");
        Client client = sdk.getClient();
        CryptoKeyPair keyPair = client.getCryptoSuite().generateRandomKeyPair();
        System.out.println("Account: " + keyPair.getAddress());
        
        AssembleTransactionProcessor processor = 
            TransactionProcessorFactory.createAssembleTransactionProcessor(client, keyPair);
        
        byte[] bytecode = new byte[bin.length() / 2];
        for (int i = 0; i < bin.length(); i += 2) {
            bytecode[i / 2] = (byte) ((Character.digit(bin.charAt(i), 16) << 4)
                + Character.digit(bin.charAt(i+1), 16));
        }
        
        System.out.println("Deploying...");
        TransactionReceipt receipt = processor.deployAndGetReceipt(bytecode);
        
        if (receipt.isStatusOK()) {
            String addr = receipt.getContractAddress();
            System.out.println("\n✅ SUCCESS!");
            System.out.println("Contract: " + addr);
            System.out.println("Length: " + addr.length() + " chars");
            Files.write(Paths.get("contract_address.txt"), addr.getBytes());
            System.out.println("Saved to: contract_address.txt");
        } else {
            System.out.println("\n❌ Status: " + receipt.getStatus());
            System.out.println("Message: " + receipt.getMessage());
        }
    }
}
