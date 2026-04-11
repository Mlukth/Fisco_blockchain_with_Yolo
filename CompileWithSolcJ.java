import org.fisco.solc.compiler.SolidityCompiler;
import org.fisco.solc.compiler.SolidityCompiler.Result;
import java.nio.file.*;

public class CompileWithSolcJ {
    public static void main(String[] args) throws Exception {
        // 读取合约源码
        String source = new String(Files.readAllBytes(Paths.get("contracts/AttendanceProof.sol")));
        
        // 使用 solcJ 编译
        Result result = SolidityCompiler.compile(
            source.getBytes(),
            true,  // optimize
            SolidityCompiler.Options.ABI,
            SolidityCompiler.Options.BIN,
            SolidityCompiler.Options.Metadata
        );
        
        if (result.errors != null && !result.errors.isEmpty()) {
            System.out.println("编译错误: " + result.errors);
            return;
        }
        
        System.out.println("编译成功!");
        System.out.println("ABI: " + result.abi);
        System.out.println("BIN: " + result.bin);
        
        // 保存结果
        Files.write(Paths.get("~/fisco/console/contracts/abi/AttendanceProof.abi"), result.abi.getBytes());
        Files.write(Paths.get("~/fisco/console/contracts/bin/AttendanceProof.bin"), result.bin.getBytes());
        
        System.out.println("✅ ABI 和 BIN 已保存");
    }
}
