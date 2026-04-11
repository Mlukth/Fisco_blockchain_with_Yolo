// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

/**
 * @title AttendanceProof
 * @dev 匿名考勤存证合约，用于存储每日考勤数据的默克尔根和时间戳
 * FISCO BCOS 3.x 兼容版本
 */
contract AttendanceProof {
    // 合约拥有者地址
    address private _owner;
    
    // 默克尔根 => 时间戳
    mapping(bytes32 => uint256) private merkleRootTimestamps;
    
    // 记录所有已提交的默克尔根
    bytes32[] private allMerkleRoots;
    
    // 管理员是否启用存证功能
    bool public proofEnabled = true;
    
    // 事件：新的默克尔根已上链
    event MerkleRootUploaded(bytes32 indexed root, uint256 timestamp, address indexed uploader);
    
    // 事件：默克尔根状态变更（仅管理员可触发）
    event ProofStatusChanged(bool enabled, address indexed admin);
    
    // 事件：默克尔根被删除（仅管理员）
    event MerkleRootDeleted(bytes32 indexed root, address indexed admin);
    
    // 事件：所有权转移
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    /**
     * @dev 构造函数，设置合约拥有者
     */
    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /**
     * @dev 返回当前拥有者地址
     */
    function owner() public view returns (address) {
        return _owner;
    }
    
    /**
     * @dev 修饰符：仅限拥有者调用
     */
    modifier onlyOwner() {
        require(msg.sender == _owner, "AttendanceProof: caller is not the owner");
        _;
    }
    
    /**
     * @dev 放弃所有权（谨慎使用）
     */
    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
    
    /**
     * @dev 转移所有权
     * @param newOwner 新拥有者地址
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AttendanceProof: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
    
    /**
     * @dev 上传考勤默克尔根
     * @param _root 默克尔根哈希
     * @param _timestamp 考勤日期的时间戳（Unix时间）
     */
    function uploadMerkleRoot(bytes32 _root, uint256 _timestamp) external onlyOwner {
        require(proofEnabled, "AttendanceProof: proof system is disabled");
        require(_root != bytes32(0), "AttendanceProof: root cannot be zero");
        require(_timestamp > 0, "AttendanceProof: timestamp must be positive");
        require(merkleRootTimestamps[_root] == 0, "AttendanceProof: root already exists");
        
        merkleRootTimestamps[_root] = _timestamp;
        allMerkleRoots.push(_root);
        
        emit MerkleRootUploaded(_root, _timestamp, msg.sender);
    }
    
    /**
     * @dev 查询默克尔根是否存在且有效
     * @param _root 默克尔根哈希
     * @return bool 是否存在
     */
    function isMerkleRootValid(bytes32 _root) external view returns (bool) {
        return merkleRootTimestamps[_root] > 0;
    }
    
    /**
     * @dev 获取默克尔根对应的上链时间戳
     * @param _root 默克尔根哈希
     * @return uint256 时间戳（0表示不存在）
     */
    function getMerkleRootTimestamp(bytes32 _root) external view returns (uint256) {
        return merkleRootTimestamps[_root];
    }
    
    /**
     * @dev 获取所有已存储的默克尔根数组
     * @return bytes32[] 默克尔根列表
     */
    function getAllMerkleRoots() external view returns (bytes32[] memory) {
        return allMerkleRoots;
    }
    
    /**
     * @dev 获取已存储的默克尔根数量
     * @return uint256 总数
     */
    function getMerkleRootCount() external view returns (uint256) {
        return allMerkleRoots.length;
    }
    
    /**
     * @dev 管理员删除指定默克尔根（仅紧急情况使用）
     * @param _root 默克尔根哈希
     */
    function deleteMerkleRoot(bytes32 _root) external onlyOwner {
        require(merkleRootTimestamps[_root] > 0, "AttendanceProof: root does not exist");
        
        delete merkleRootTimestamps[_root];
        
        // 从数组中移除（通过将目标与最后一个元素交换并pop）
        for (uint256 i = 0; i < allMerkleRoots.length; i++) {
            if (allMerkleRoots[i] == _root) {
                allMerkleRoots[i] = allMerkleRoots[allMerkleRoots.length - 1];
                allMerkleRoots.pop();
                break;
            }
        }
        
        emit MerkleRootDeleted(_root, msg.sender);
    }
    
    /**
     * @dev 管理员启用/禁用存证功能
     * @param _enabled 新状态
     */
    function setProofEnabled(bool _enabled) external onlyOwner {
        proofEnabled = _enabled;
        emit ProofStatusChanged(_enabled, msg.sender);
    }
}