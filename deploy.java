import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import java.nio.file.*;

public class deploy {
    public static void main(String[] args) throws Exception {
        String bytecode = new String(Files.readAllBytes(Paths.get("/home/mmm/fisco/console/contracts/bin/AttendanceProof.bin")));
        System.out.println("Bytecode length: " + bytecode.length());
        
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
        
        BcosSDK sdk = BcosSDK.build("sdk.toml");
        Client client = sdk.getClient();
        
        CryptoKeyPair keyPair = client.getCryptoSuite().createKeyPair();
        System.out.println("Deploy account: " + keyPair.getAddress());
        
        TransactionReceipt receipt = client.deployContract("0x" + bytecode, keyPair);
        
        if (receipt.isStatusOK()) {
            System.out.println("SUCCESS!");
            System.out.println("Contract address: " + receipt.getContractAddress());
            Files.write(Paths.get("contract_address.txt"), receipt.getContractAddress().getBytes());
        } else {
            System.out.println("FAILED: " + receipt.getMessage());
            System.out.println("Status: " + receipt.getStatus());
        }
        sdk.stop();
    }
}
