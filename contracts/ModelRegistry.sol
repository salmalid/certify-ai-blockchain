// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ModelRegistry
 * @dev Enhanced AI Model Registry with comprehensive metadata, licensing, and provenance tracking
 * @notice Research-grade implementation for academic publication
 */
contract ModelRegistry {
    
    // ============ Enums ============
    
    enum License { 
        MIT,           // 0
        Apache2,       // 1
        GPL3,          // 2
        BSD,           // 3
        Proprietary,   // 4
        CC_BY,         // 5
        CC_BY_SA,      // 6
        Custom         // 7
    }
    
    enum Framework {
        PyTorch,
        TensorFlow,
        JAX,
        Scikit,
        Keras,
        ONNX,
        Other
    }
    
    enum TaskType {
        Classification,      // 0 - General classification tasks
        Regression,         // 1 - Regression tasks
        Generation,         // 2 - Generative models (text, image, etc.)
        Detection,          // 3 - Object detection
        Segmentation,       // 4 - Image/semantic segmentation
        NLP,               // 5 - Natural Language Processing
        Reinforcement,     // 6 - Reinforcement Learning
        ComputerVision,    // 7 - Computer Vision (general)
        TimeSeries,        // 8 - Time series forecasting
        Clustering,        // 9 - Unsupervised clustering
        Recommendation,    // 10 - Recommendation systems
        AnomalyDetection,  // 11 - Anomaly/outlier detection
        SpeechRecognition, // 12 - Speech/audio processing
        MultiModal,        // 13 - Multi-modal models (vision+language)
        Other              // 14 - Other tasks
    }
    
    enum ModelType {
        TraditionalML,     // 0 - Scikit-learn, XGBoost, etc.
        CNN,              // 1 - Convolutional Neural Network
        RNN,              // 2 - Recurrent Neural Network
        LSTM,             // 3 - Long Short-Term Memory
        GRU,              // 4 - Gated Recurrent Unit
        Transformer,      // 5 - Transformer architecture
        BERT,             // 6 - BERT and variants
        GPT,              // 7 - GPT and variants
        GAN,              // 8 - Generative Adversarial Network
        VAE,              // 9 - Variational Autoencoder
        Diffusion,        // 10 - Diffusion models
        ResNet,           // 11 - ResNet architecture
        VisionTransformer, // 12 - ViT and variants
        YOLO,             // 13 - YOLO object detection
        UNet,             // 14 - U-Net segmentation
        Ensemble,         // 15 - Ensemble models
        Custom            // 16 - Custom architecture
    }
    
    // ============ Structs ============
    
    struct ModelMetadata {
        Framework framework;
        TaskType taskType;
        ModelType modelType;         // Type of model architecture
        uint256 parameterCount;      // Number of model parameters
        string architecture;          // e.g., "ResNet-50", "GPT-2-Medium"
        string[] datasets;            // Training datasets used
        License license;
        string customLicense;         // If license == Custom
        string fileExtension;         // e.g., ".pkl", ".h5", ".pt", ".onnx"
    }
    
    struct ModelVersion {
        string ipfsHash;              // CID of the model file/archive
        string modelHash;             // SHA256/Calculated hash of the model for integrity
        uint256 timestamp;
        string description;
        address contributor;          // Who added this version
        uint256 fileSize;             // Size in bytes for analytics
    }
    
    struct Model {
        string name;
        address owner;
        ModelVersion[] versions;
        ModelMetadata metadata;
        uint256 citationCount;        // Track model usage/citations
        bool exists;                  // Explicit existence flag
    }
    
    // ============ State Variables ============
    
    mapping(string => Model) private models;           // name_slug -> Model
    mapping(address => string[]) private ownerModels;  // owner -> model names
    string[] public modelNames;
    
    // SECURITY: File hash uniqueness enforcement
    mapping(string => string) public hashToModelName;  // file_hash -> model_name
    mapping(string => bool) public hashExists;         // file_hash -> exists
    
    // Analytics
    uint256 public totalModels;
    uint256 public totalVersions;
    mapping(address => uint256) public contributorVersionCount;
    
    // ============ Events ============
    
    event ModelRegistered(
        string indexed name, 
        address indexed owner, 
        uint256 timestamp,
        License license
    );
    
    event VersionAdded(
        string indexed name, 
        uint256 versionIndex, 
        string ipfsHash, 
        string modelHash,
        address indexed contributor,
        uint256 fileSize,
        uint256 timestamp
    );
    
    event OwnershipTransferred(
        string indexed name, 
        address indexed previousOwner, 
        address indexed newOwner,
        uint256 timestamp
    );
    
    event ModelCited(
        string indexed name,
        address indexed citer,
        uint256 newCitationCount,
        uint256 timestamp
    );
    
    event MetadataUpdated(
        string indexed name,
        address indexed updater,
        uint256 timestamp
    );
    
    event LicenseUpdated(
        string indexed name,
        License newLicense,
        uint256 timestamp
    );
    
    event DuplicateFileDetected(
        string indexed attemptedName,
        string existingModelName,
        address indexed existingOwner,
        string fileHash,
        uint256 timestamp
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner(string memory _name) {
        require(models[_name].owner == msg.sender, "Not the owner of this model");
        _;
    }
    
    modifier modelExists(string memory _name) {
        require(models[_name].exists, "Model does not exist");
        _;
    }
    
    modifier validString(string memory _str) {
        require(bytes(_str).length > 0, "String cannot be empty");
        _;
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Register a new model with comprehensive metadata and file hash
     * @param _name Unique model identifier (slug format recommended)
     * @param _description Initial description
     * @param _initialHash SHA-256 hash of the initial model file
     * @param _ipfsHash IPFS CID of the initial model file
     * @param _fileSize File size in bytes
     * @param _metadata Complete model metadata
     */
    function registerModel(
        string memory _name,
        string memory _description,
        string memory _initialHash,
        string memory _ipfsHash,
        uint256 _fileSize,
        ModelMetadata memory _metadata
    ) public validString(_name) validString(_initialHash) validString(_ipfsHash) {
        require(!models[_name].exists, "Model name already taken");
        require(bytes(_metadata.architecture).length > 0, "Architecture required");
        
        // CRITICAL SECURITY CHECK: Prevent duplicate file registration
        if (hashExists[_initialHash]) {
            string memory existingModel = hashToModelName[_initialHash];
            address existingOwner = models[existingModel].owner;
            
            emit DuplicateFileDetected(
                _name,
                existingModel,
                existingOwner,
                _initialHash,
                block.timestamp
            );
            
            revert(string(abi.encodePacked(
                "Model file already registered as '",
                existingModel,
                "' by owner ",
                addressToString(existingOwner)
            )));
        }
        
        // Register the model
        Model storage m = models[_name];
        m.name = _name;
        m.owner = msg.sender;
        m.metadata = _metadata;
        m.exists = true;
        m.citationCount = 0;
        
        // Add initial version
        m.versions.push(ModelVersion({
            ipfsHash: _ipfsHash,
            modelHash: _initialHash,
            timestamp: block.timestamp,
            description: _description,
            contributor: msg.sender,
            fileSize: _fileSize
        }));
        
        // Store hash mapping for duplicate prevention
        hashToModelName[_initialHash] = _name;
        hashExists[_initialHash] = true;
        
        modelNames.push(_name);
        ownerModels[msg.sender].push(_name);
        totalModels++;
        totalVersions++;
        contributorVersionCount[msg.sender]++;
        
        emit ModelRegistered(_name, msg.sender, block.timestamp, _metadata.license);
        emit VersionAdded(_name, 0, _ipfsHash, _initialHash, msg.sender, _fileSize, block.timestamp);
    }
    
    /**
     * @dev Add a new version to an existing model
     * @param _name Model name
     * @param _ipfsHash IPFS CID of the model file
     * @param _modelHash Cryptographic hash (SHA-256) of the model
     * @param _description Version description
     * @param _fileSize File size in bytes
     */
    function addVersion(
        string memory _name,
        string memory _ipfsHash,
        string memory _modelHash,
        string memory _description,
        uint256 _fileSize
    ) public onlyOwner(_name) modelExists(_name) 
      validString(_ipfsHash) validString(_modelHash) {
        
        // SECURITY CHECK: Prevent duplicate file hash across all models
        if (hashExists[_modelHash]) {
            string memory existingModel = hashToModelName[_modelHash];
            
            // Allow if it's the same model (re-uploading same version)
            require(
                keccak256(bytes(existingModel)) == keccak256(bytes(_name)),
                string(abi.encodePacked(
                    "File hash already exists in model '",
                    existingModel,
                    "'"
                ))
            );
        }
        
        Model storage m = models[_name];
        m.versions.push(ModelVersion({
            ipfsHash: _ipfsHash,
            modelHash: _modelHash,
            timestamp: block.timestamp,
            description: _description,
            contributor: msg.sender,
            fileSize: _fileSize
        }));
        
        // Store hash mapping if new
        if (!hashExists[_modelHash]) {
            hashToModelName[_modelHash] = _name;
            hashExists[_modelHash] = true;
        }
        
        totalVersions++;
        contributorVersionCount[msg.sender]++;
        
        emit VersionAdded(
            _name, 
            m.versions.length - 1, 
            _ipfsHash, 
            _modelHash,
            msg.sender,
            _fileSize,
            block.timestamp
        );
    }
    
    /**
     * @dev Transfer ownership of a model
     */
    function transferOwnership(
        string memory _name, 
        address _newOwner
    ) public onlyOwner(_name) modelExists(_name) {
        require(_newOwner != address(0), "New owner cannot be zero address");
        require(_newOwner != msg.sender, "Already the owner");
        
        address previousOwner = models[_name].owner;
        models[_name].owner = _newOwner;
        
        // Update owner mappings
        ownerModels[_newOwner].push(_name);
        
        emit OwnershipTransferred(_name, previousOwner, _newOwner, block.timestamp);
    }
    
    /**
     * @dev Increment citation count when model is referenced
     * @param _name Model name being cited
     */
    function citeModel(string memory _name) public modelExists(_name) {
        models[_name].citationCount++;
        emit ModelCited(_name, msg.sender, models[_name].citationCount, block.timestamp);
    }
    
    /**
     * @dev Update model metadata (owner only)
     */
    function updateMetadata(
        string memory _name,
        ModelMetadata memory _metadata
    ) public onlyOwner(_name) modelExists(_name) {
        require(bytes(_metadata.architecture).length > 0, "Architecture required");
        models[_name].metadata = _metadata;
        emit MetadataUpdated(_name, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Update model license (owner only)
     */
    function updateLicense(
        string memory _name,
        License _license,
        string memory _customLicense
    ) public onlyOwner(_name) modelExists(_name) {
        models[_name].metadata.license = _license;
        if (_license == License.Custom) {
            require(bytes(_customLicense).length > 0, "Custom license text required");
            models[_name].metadata.customLicense = _customLicense;
        }
        emit LicenseUpdated(_name, _license, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get the latest version of a model
     */
    function getLatestVersion(string memory _name) 
        public view modelExists(_name) returns (ModelVersion memory) {
        Model storage m = models[_name];
        require(m.versions.length > 0, "No versions available");
        return m.versions[m.versions.length - 1];
    }
    
    /**
     * @dev Get number of versions
     */
    function getVersionCount(string memory _name) public view returns (uint256) {
        return models[_name].versions.length;
    }
    
    /**
     * @dev Get specific version
     */
    function getVersion(string memory _name, uint256 _index) 
        public view returns (ModelVersion memory) {
        require(_index < models[_name].versions.length, "Version does not exist");
        return models[_name].versions[_index];
    }
    
    /**
     * @dev Get model basic details
     */
    function getModel(string memory _name) 
        public view returns (
            string memory name, 
            address owner, 
            uint256 versionCount,
            uint256 citationCount
        ) {
        Model storage m = models[_name];
        return (m.name, m.owner, m.versions.length, m.citationCount);
    }
    
    /**
     * @dev Get complete model metadata
     */
    function getModelMetadata(string memory _name) 
        public view modelExists(_name) returns (ModelMetadata memory) {
        return models[_name].metadata;
    }
    
    /**
     * @dev Get all model names
     */
    function getAllModelNames() public view returns (string[] memory) {
        return modelNames;
    }
    
    /**
     * @dev Get models owned by an address
     */
    function getModelsByOwner(address _owner) public view returns (string[] memory) {
        return ownerModels[_owner];
    }
    
    /**
     * @dev Get global statistics for research analytics
     */
    function getGlobalStats() public view returns (
        uint256 _totalModels,
        uint256 _totalVersions,
        uint256 _totalContributors
    ) {
        return (totalModels, totalVersions, modelNames.length);
    }
    
    /**
     * @dev Get contributor statistics
     */
    function getContributorStats(address _contributor) public view returns (
        uint256 modelsOwned,
        uint256 versionsContributed
    ) {
        return (ownerModels[_contributor].length, contributorVersionCount[_contributor]);
    }
    
    // ============ Security & Verification Functions ============
    
    /**
     * @dev Check if a file hash is already registered
     * @param _hash SHA-256 hash of the file
     * @return exists Whether the hash exists
     * @return modelName Name of the model with this hash
     * @return owner Owner of the model
     */
    function checkFileHash(string memory _hash) public view returns (
        bool exists,
        string memory modelName,
        address owner
    ) {
        if (hashExists[_hash]) {
            string memory name = hashToModelName[_hash];
            return (true, name, models[name].owner);
        }
        return (false, "", address(0));
    }
    
    /**
     * @dev Get model information by file hash
     * @param _hash SHA-256 hash of the file
     * @return modelName Name of the model
     * @return owner Owner address
     * @return versionCount Number of versions
     */
    function getModelByHash(string memory _hash) public view returns (
        string memory modelName,
        address owner,
        uint256 versionCount
    ) {
        if (hashExists[_hash]) {
            string memory name = hashToModelName[_hash];
            Model storage m = models[name];
            return (name, m.owner, m.versions.length);
        }
        return ("", address(0), 0);
    }
    
    // ============ Helper Functions ============
    
    /**
     * @dev Convert address to string (for error messages)
     */
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
