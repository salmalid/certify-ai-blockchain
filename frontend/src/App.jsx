import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './index.css'
import ModelRegistryArtifact from './artifacts/contracts/ModelRegistry.sol/ModelRegistry.json'
import ContractAddress from './contract-address.json'

const API_URL = 'http://localhost:3001/api';

function App() {
    const [currentAccount, setCurrentAccount] = useState('')
    const [contract, setContract] = useState(null)
    const [network, setNetwork] = useState(null)
    const [models, setModels] = useState([])
    const [feedback, setFeedback] = useState({ message: '', type: '' })
    const [loading, setLoading] = useState(false)

    // Tab state
    const [activeTab, setActiveTab] = useState('register') // 'register' or 'verify'

    // Registration state
    const [selectedFile, setSelectedFile] = useState(null)
    const [fileHash, setFileHash] = useState('')
    const [ipfsCID, setIpfsCID] = useState('')
    const [isDuplicate, setIsDuplicate] = useState(false)
    const [duplicateInfo, setDuplicateInfo] = useState(null)
    const [uploadProgress, setUploadProgress] = useState('')

    // Model metadata
    const [modelName, setModelName] = useState('')
    const [modelDesc, setModelDesc] = useState('')
    const [framework, setFramework] = useState(3) // Scikit
    const [taskType, setTaskType] = useState(0) // Classification
    const [modelType, setModelType] = useState(0) // TraditionalML
    const [architecture, setArchitecture] = useState('')
    const [parameterCount, setParameterCount] = useState('')
    const [datasets, setDatasets] = useState('')
    const [license, setLicense] = useState(0) // MIT
    const [fileExtension, setFileExtension] = useState('')

    // Verification state
    const [verifyFile, setVerifyFile] = useState(null)
    const [verificationResult, setVerificationResult] = useState(null)
    const [verifying, setVerifying] = useState(false)

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [modalModel, setModalModel] = useState(null)

    useEffect(() => {
        checkWalletIsConnected();
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) setCurrentAccount(accounts[0]);
                else setCurrentAccount('');
            })
            window.ethereum.on('chainChanged', () => window.location.reload());
        }
    }, [])

    useEffect(() => {
        if (currentAccount) {
            initializeContract();
        }
    }, [currentAccount])

    const checkWalletIsConnected = async () => {
        const { ethereum } = window;
        if (!ethereum) {
            showFeedback('Please install MetaMask!', 'error');
            return;
        }
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length !== 0) {
            setCurrentAccount(accounts[0]);
        }
    }

    const connectWallet = async () => {
        const { ethereum } = window;
        if (!ethereum) {
            showFeedback('Please install MetaMask!', 'error');
            return;
        }
        try {
            const accounts = await ethereum.request({ method: "eth_requestAccounts" });
            setCurrentAccount(accounts[0]);
            showFeedback('Wallet connected successfully!', 'success');
        } catch (error) {
            showFeedback('Failed to connect wallet', 'error');
        }
    }

    const initializeContract = async () => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const networkInfo = await provider.getNetwork();

            setNetwork({
                name: networkInfo.chainId === 5777n ? 'Ganache Local' : `Chain ID: ${networkInfo.chainId}`,
                chainId: networkInfo.chainId.toString()
            });

            const modelRegistry = new ethers.Contract(
                ContractAddress.ModelRegistry,
                ModelRegistryArtifact.abi,
                signer
            );
            setContract(modelRegistry);
            fetchModels(modelRegistry);
        } catch (error) {
            console.error("Error init contract", error);
            showFeedback('Failed to initialize contract', 'error');
        }
    }

    const fetchModels = async (contractInstance) => {
        try {
            const names = await contractInstance.getAllModelNames();
            const loadedModels = [];
            for (const name of names) {
                const details = await contractInstance.getModel(name);
                loadedModels.push({
                    name: details[0],
                    owner: details[1],
                    versionCount: Number(details[2])
                });
            }
            setModels(loadedModels);
        } catch (error) {
            console.error("Error fetching models", error);
        }
    }

    const showFeedback = (message, type = 'info') => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
    }

    // Registration: Handle file selection and duplicate check
    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setSelectedFile(file);
        setUploadProgress('Checking for duplicates...');
        setLoading(true);

        const ext = file.name.substring(file.name.lastIndexOf('.'));
        setFileExtension(ext);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/check-duplicate`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.isDuplicate) {
                setIsDuplicate(true);
                setDuplicateInfo(data.existingModel);
                setFileHash(data.hash);
                setUploadProgress('');
                showFeedback(`⚠️ This file is already registered as "${data.existingModel.name}"`, 'error');
            } else {
                setIsDuplicate(false);
                setDuplicateInfo(null);
                setFileHash(data.hash);
                setUploadProgress('✅ File is unique! Fill in the details below.');
                showFeedback('File verified - no duplicates found!', 'success');
            }
        } catch (error) {
            console.error('Duplicate check error:', error);
            showFeedback('Failed to check for duplicates: ' + error.message, 'error');
            setUploadProgress('');
        } finally {
            setLoading(false);
        }
    }

    // Registration: Complete registration
    const registerModelComplete = async () => {
        if (!contract || !selectedFile || !fileHash) return;
        if (!modelName.trim() || !architecture.trim()) {
            showFeedback('Please fill in all required fields', 'error');
            return;
        }

        try {
            setLoading(true);
            setUploadProgress('Uploading to IPFS...');

            const formData = new FormData();
            formData.append('file', selectedFile);

            const uploadResponse = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const uploadData = await uploadResponse.json();

            if (!uploadData.success) {
                throw new Error(uploadData.error || 'Upload failed');
            }

            setIpfsCID(uploadData.ipfsCID);
            setUploadProgress('Registering on blockchain...');
            showFeedback('File uploaded! Registering model...', 'info');

            const metadata = {
                framework: parseInt(framework),
                taskType: parseInt(taskType),
                modelType: parseInt(modelType),
                parameterCount: parameterCount ? parseInt(parameterCount) : 0,
                architecture: architecture,
                datasets: datasets ? datasets.split(',').map(d => d.trim()) : [],
                license: parseInt(license),
                customLicense: '',
                fileExtension: fileExtension
            };

            const txn = await contract.registerModel(
                modelName,
                modelDesc,
                fileHash,
                uploadData.ipfsCID,
                selectedFile.size,
                metadata
            );

            showFeedback('Transaction submitted. Waiting for confirmation...', 'info');
            await txn.wait();

            showFeedback(`✅ Model "${modelName}" registered successfully!`, 'success');
            fetchModels(contract);

            resetForm();
        } catch (error) {
            console.error(error);
            if (error.message.includes('already registered')) {
                showFeedback('⚠️ ' + error.message, 'error');
            } else {
                showFeedback(error.reason || error.message || 'Error registering model', 'error');
            }
        } finally {
            setLoading(false);
            setUploadProgress('');
        }
    }

    const resetForm = () => {
        setSelectedFile(null);
        setFileHash('');
        setIpfsCID('');
        setIsDuplicate(false);
        setDuplicateInfo(null);
        setModelName('');
        setModelDesc('');
        setArchitecture('');
        setParameterCount('');
        setDatasets('');
        setFileExtension('');
        setUploadProgress('');
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
    }

    // Verification: Handle file selection
    const handleVerifyFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setVerifyFile(file);
        setVerifying(true);
        setVerificationResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/verify-model`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            setVerificationResult(data);

            if (data.verified) {
                showFeedback(`✅ Model verified: "${data.model.name}"`, 'success');
            } else {
                showFeedback('❌ Model not found on blockchain', 'error');
            }
        } catch (error) {
            console.error('Verification error:', error);
            showFeedback('Failed to verify model: ' + error.message, 'error');
        } finally {
            setVerifying(false);
        }
    }

    const resetVerification = () => {
        setVerifyFile(null);
        setVerificationResult(null);
        const verifyInput = document.getElementById('verifyFileInput');
        if (verifyInput) verifyInput.value = '';
    }

    const viewModelDetails = async (model) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/models/${model.name}`);
            const data = await response.json();
            setModalModel(data);
            setShowModal(true);
        } catch (error) {
            console.error('Error fetching model details:', error);
            showFeedback('Failed to load model details', 'error');
        } finally {
            setLoading(false);
        }
    }

    const switchToVerify = () => {
        setActiveTab('verify');
        if (duplicateInfo) {
            // Auto-verify the duplicate file
            showFeedback('Switching to verification mode...', 'info');
        }
    }

    return (
        <div className='App'>
            <header>
                <h1>🔐 Certify AI</h1>
                <p className="subtitle">Blockchain-based AI Model Certification & Version Control</p>

                {network && (
                    <div className="blockchain-info">
                        <div className="info-item">
                            <span className="info-label">Network:</span>
                            <span className="info-value">{network.name}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Chain ID:</span>
                            <span className="info-value">{network.chainId}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Contract:</span>
                            <span className="info-value">{ContractAddress.ModelRegistry.substring(0, 10)}...</span>
                        </div>
                    </div>
                )}

                <div className="wallet-section">
                    {!currentAccount ? (
                        <button onClick={connectWallet}>Connect Wallet</button>
                    ) : (
                        <div className="wallet-address">
                            Connected: {currentAccount.substring(0, 6)}...{currentAccount.substring(38)}
                        </div>
                    )}
                </div>
            </header>

            {feedback.message && (
                <div className={`feedback ${feedback.type}`}>
                    {feedback.message}
                </div>
            )}

            {currentAccount && (
                <>
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button
                            className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
                            onClick={() => setActiveTab('register')}
                        >
                            📝 Register New Model
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'verify' ? 'active' : ''}`}
                            onClick={() => setActiveTab('verify')}
                        >
                            🔍 Verify Model
                        </button>
                    </div>

                    {/* Register Tab */}
                    {activeTab === 'register' && (
                        <div className="card">
                            <h2>📝 Register New Model</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                Upload your model file first. We'll check for duplicates and verify uniqueness on the blockchain.
                            </p>

                            <div className="file-upload-zone" onClick={() => document.getElementById('fileInput').click()}>
                                <div className="upload-icon">📁</div>
                                <p>{selectedFile ? selectedFile.name : 'Click to select model file'}</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {selectedFile ? `Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Supported: .pkl, .h5, .pt, .onnx, .pb, etc.'}
                                </p>
                                <input
                                    id="fileInput"
                                    type="file"
                                    onChange={handleFileSelect}
                                    disabled={loading}
                                />
                            </div>

                            {uploadProgress && (
                                <div style={{
                                    padding: '0.75rem',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    marginBottom: '1rem',
                                    fontSize: '0.9rem'
                                }}>
                                    {uploadProgress}
                                </div>
                            )}

                            {isDuplicate && duplicateInfo && (
                                <div style={{
                                    padding: '1rem',
                                    background: '#ff000015',
                                    border: '2px solid #ff0000',
                                    borderRadius: '12px',
                                    marginBottom: '1rem'
                                }}>
                                    <h3 style={{ color: '#ff0000', marginBottom: '0.5rem' }}>⚠️ Duplicate File Detected</h3>
                                    <p>This file is already registered as:</p>
                                    <p style={{ fontWeight: 'bold', margin: '0.5rem 0' }}>"{duplicateInfo.name}"</p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        Owner: {duplicateInfo.owner}
                                    </p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        Versions: {duplicateInfo.versionCount} | Citations: {duplicateInfo.citationCount}
                                    </p>
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                        <button onClick={switchToVerify} className="secondary">
                                            🔍 Verify This Model
                                        </button>
                                        <button onClick={resetForm} className="secondary">
                                            🔄 Select Different File
                                        </button>
                                    </div>
                                </div>
                            )}

                            {fileHash && !isDuplicate && (
                                <>
                                    <div style={{
                                        padding: '1rem',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '12px',
                                        marginBottom: '1rem'
                                    }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            File Hash (SHA-256):
                                        </p>
                                        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                            {fileHash}
                                        </p>
                                    </div>

                                    <input
                                        placeholder="Model Name (e.g., my-classifier-v1) *Required"
                                        value={modelName}
                                        onChange={(e) => setModelName(e.target.value)}
                                        disabled={loading}
                                    />
                                    <textarea
                                        placeholder="Description (optional)"
                                        value={modelDesc}
                                        onChange={(e) => setModelDesc(e.target.value)}
                                        rows="2"
                                        disabled={loading}
                                    />

                                    <select value={framework} onChange={(e) => setFramework(e.target.value)} disabled={loading}>
                                        <option value="0">PyTorch</option>
                                        <option value="1">TensorFlow</option>
                                        <option value="2">JAX</option>
                                        <option value="3">Scikit-learn</option>
                                        <option value="4">Keras</option>
                                        <option value="5">ONNX</option>
                                        <option value="6">Other</option>
                                    </select>

                                    <select value={taskType} onChange={(e) => setTaskType(e.target.value)} disabled={loading}>
                                        <option value="0">Classification</option>
                                        <option value="1">Regression</option>
                                        <option value="2">Generation</option>
                                        <option value="3">Detection</option>
                                        <option value="4">Segmentation</option>
                                        <option value="5">NLP</option>
                                        <option value="6">Reinforcement Learning</option>
                                        <option value="7">Computer Vision</option>
                                        <option value="8">Time Series</option>
                                        <option value="9">Clustering</option>
                                        <option value="10">Recommendation</option>
                                        <option value="11">Anomaly Detection</option>
                                        <option value="12">Speech Recognition</option>
                                        <option value="13">Multi-Modal</option>
                                        <option value="14">Other</option>
                                    </select>

                                    <select value={modelType} onChange={(e) => setModelType(e.target.value)} disabled={loading}>
                                        <option value="0">Traditional ML</option>
                                        <option value="1">CNN (Convolutional Neural Network)</option>
                                        <option value="2">RNN (Recurrent Neural Network)</option>
                                        <option value="3">LSTM</option>
                                        <option value="4">GRU</option>
                                        <option value="5">Transformer</option>
                                        <option value="6">BERT</option>
                                        <option value="7">GPT</option>
                                        <option value="8">GAN (Generative Adversarial Network)</option>
                                        <option value="9">VAE (Variational Autoencoder)</option>
                                        <option value="10">Diffusion Model</option>
                                        <option value="11">ResNet</option>
                                        <option value="12">Vision Transformer (ViT)</option>
                                        <option value="13">YOLO</option>
                                        <option value="14">U-Net</option>
                                        <option value="15">Ensemble</option>
                                        <option value="16">Custom</option>
                                    </select>

                                    <input
                                        placeholder="Architecture (e.g., ResNet-50, GPT-2-Medium) *Required"
                                        value={architecture}
                                        onChange={(e) => setArchitecture(e.target.value)}
                                        disabled={loading}
                                    />

                                    <input
                                        type="number"
                                        placeholder="Parameter Count (optional)"
                                        value={parameterCount}
                                        onChange={(e) => setParameterCount(e.target.value)}
                                        disabled={loading}
                                    />

                                    <input
                                        placeholder="Training Datasets (comma-separated, optional)"
                                        value={datasets}
                                        onChange={(e) => setDatasets(e.target.value)}
                                        disabled={loading}
                                    />

                                    <select value={license} onChange={(e) => setLicense(e.target.value)} disabled={loading}>
                                        <option value="0">MIT</option>
                                        <option value="1">Apache 2.0</option>
                                        <option value="2">GPL 3.0</option>
                                        <option value="3">BSD</option>
                                        <option value="4">Proprietary</option>
                                        <option value="5">CC BY</option>
                                        <option value="6">CC BY-SA</option>
                                        <option value="7">Custom</option>
                                    </select>

                                    <button onClick={registerModelComplete} disabled={loading}>
                                        {loading ? <><span className="spinner"></span>Registering...</> : '✅ Register Model on Blockchain'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Verify Tab */}
                    {activeTab === 'verify' && (
                        <div className="card">
                            <h2>🔍 Verify Model on Blockchain</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                Upload a model file to verify its authenticity and check if it's registered on the blockchain.
                                This demonstrates blockchain transparency and public verifiability.
                            </p>

                            <div className="file-upload-zone" onClick={() => document.getElementById('verifyFileInput').click()}>
                                <div className="upload-icon">🔍</div>
                                <p>{verifyFile ? verifyFile.name : 'Click to select model file to verify'}</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {verifyFile ? `Size: ${(verifyFile.size / 1024 / 1024).toFixed(2)} MB` : 'Any model file format supported'}
                                </p>
                                <input
                                    id="verifyFileInput"
                                    type="file"
                                    onChange={handleVerifyFileSelect}
                                    disabled={verifying}
                                />
                            </div>

                            {verifying && (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <span className="spinner"></span>
                                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                                        Verifying model on blockchain...
                                    </p>
                                </div>
                            )}

                            {verificationResult && !verifying && (
                                <>
                                    {verificationResult.verified ? (
                                        <>
                                            <div className="verification-status verified">
                                                <span className="verification-icon">✅</span>
                                                <span>Model Verified on Blockchain</span>
                                            </div>

                                            {/* Blockchain Proof */}
                                            <div className="blockchain-proof-card">
                                                <h3>🔐 Blockchain Proof of Authenticity</h3>
                                                <div className="proof-item">
                                                    <span className="proof-label">Registered On:</span>
                                                    <span className="proof-value">
                                                        {new Date(verificationResult.blockchainProof.registrationDate).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="proof-item">
                                                    <span className="proof-label">File Hash (SHA-256):</span>
                                                    <span className="proof-value" style={{ fontSize: '0.75rem' }}>
                                                        {verificationResult.hash}
                                                    </span>
                                                </div>
                                                <div className="proof-item">
                                                    <span className="proof-label">Immutable:</span>
                                                    <span className="immutability-badge">
                                                        🔒 Permanently Stored
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Model Information */}
                                            <h3 style={{ marginBottom: '1rem' }}>📋 Model Information</h3>
                                            <div className="info-grid">
                                                <div className="info-box">
                                                    <div className="info-box-label">Model Name</div>
                                                    <div className="info-box-value">{verificationResult.model.name}</div>
                                                </div>
                                                <div className="info-box">
                                                    <div className="info-box-label">Owner</div>
                                                    <div className="info-box-value" style={{ fontSize: '0.85rem' }}>
                                                        {verificationResult.model.owner.substring(0, 10)}...
                                                    </div>
                                                </div>
                                                <div className="info-box">
                                                    <div className="info-box-label">Framework</div>
                                                    <div className="info-box-value">{verificationResult.model.metadata.framework}</div>
                                                </div>
                                                <div className="info-box">
                                                    <div className="info-box-label">Task Type</div>
                                                    <div className="info-box-value">{verificationResult.model.metadata.taskType}</div>
                                                </div>
                                                <div className="info-box">
                                                    <div className="info-box-label">Model Type</div>
                                                    <div className="info-box-value">{verificationResult.model.metadata.modelType}</div>
                                                </div>
                                                <div className="info-box">
                                                    <div className="info-box-label">Architecture</div>
                                                    <div className="info-box-value">{verificationResult.model.metadata.architecture}</div>
                                                </div>
                                                <div className="info-box">
                                                    <div className="info-box-label">License</div>
                                                    <div className="info-box-value">{verificationResult.model.metadata.license}</div>
                                                </div>
                                                <div className="info-box">
                                                    <div className="info-box-label">Citations</div>
                                                    <div className="info-box-value">{verificationResult.model.citationCount}</div>
                                                </div>
                                            </div>

                                            {/* Version History */}
                                            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                                                📊 Version History ({verificationResult.model.versionCount} versions)
                                            </h3>
                                            <div className="version-timeline">
                                                {verificationResult.model.versions.map((v, i) => (
                                                    <div key={i} className="version-item">
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <h4>Version {v.index + 1}</h4>
                                                            {v.isMatch && (
                                                                <span className="version-match-badge">
                                                                    ✅ Your File Matches This Version
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="version-date">
                                                            {new Date(v.timestampISO).toLocaleString()}
                                                        </p>
                                                        {v.description && <p>{v.description}</p>}
                                                        <div className="version-hash">
                                                            <strong>IPFS:</strong> {v.ipfsHash}
                                                        </div>
                                                        <div className="version-hash">
                                                            <strong>Hash:</strong> {v.modelHash}
                                                        </div>
                                                        <div className="version-hash">
                                                            <strong>Size:</strong> {(v.fileSize / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                        <a
                                                            href={v.ipfsUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                color: 'var(--accent-primary)',
                                                                textDecoration: 'none',
                                                                display: 'inline-block',
                                                                marginTop: '0.5rem'
                                                            }}
                                                        >
                                                            🔗 View on IPFS
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{
                                                marginTop: '2rem',
                                                padding: '1rem',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                <h4 style={{ marginBottom: '0.5rem' }}>🔒 Immutability Guarantee</h4>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                    This record is permanently stored on the blockchain and cannot be altered or deleted.
                                                    All information is publicly verifiable and cryptographically secured.
                                                </p>
                                            </div>

                                            <button onClick={resetVerification} className="secondary" style={{ marginTop: '1rem' }}>
                                                🔄 Verify Another Model
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="verification-status not-found">
                                                <span className="verification-icon">❌</span>
                                                <span>Model Not Found on Blockchain</span>
                                            </div>

                                            <div style={{
                                                padding: '1.5rem',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '12px',
                                                marginBottom: '1rem'
                                            }}>
                                                <p style={{ marginBottom: '1rem' }}>
                                                    This file is not registered on the blockchain yet.
                                                </p>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                    File Hash (SHA-256):
                                                </p>
                                                <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', marginBottom: '1rem' }}>
                                                    {verificationResult.hash}
                                                </p>
                                                <p style={{ color: 'var(--text-secondary)' }}>
                                                    Would you like to register this model?
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button onClick={() => setActiveTab('register')}>
                                                    📝 Register This Model
                                                </button>
                                                <button onClick={resetVerification} className="secondary">
                                                    🔄 Verify Another File
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Models Grid */}
                    <div className="card">
                        <h2>🗂️ Registered Models ({models.length})</h2>
                        {models.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                No models registered yet. Register your first model above!
                            </p>
                        ) : (
                            <div className="model-grid">
                                {models.map((m, i) => (
                                    <div key={i} className="model-card" onClick={() => viewModelDetails(m)}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <h3>{m.name}</h3>
                                            <span style={{ fontSize: '1.5rem' }}>✅</span>
                                        </div>
                                        <p className="model-owner">
                                            Owner: {m.owner.substring(0, 6)}...{m.owner.substring(38)}
                                        </p>
                                        <span className="version-badge">
                                            {m.versionCount} {m.versionCount === 1 ? 'version' : 'versions'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Model Details Modal */}
            {showModal && modalModel && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modalModel.name}</h2>
                            <button className="close-button" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <p className="model-owner">Owner: {modalModel.owner}</p>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Total Versions: {modalModel.versionCount}
                        </p>

                        {modalModel.versions.length > 0 ? (
                            <div className="version-timeline">
                                {modalModel.versions.map((v, i) => (
                                    <div key={i} className="version-item">
                                        <h4>Version {v.index + 1}</h4>
                                        <p className="version-date">
                                            {new Date(v.timestamp).toLocaleString()}
                                        </p>
                                        {v.description && <p>{v.description}</p>}
                                        <div className="version-hash">
                                            <strong>IPFS:</strong> {v.ipfsHash}
                                        </div>
                                        <div className="version-hash">
                                            <strong>Hash:</strong> {v.modelHash}
                                        </div>
                                        <a
                                            href={`http://127.0.0.1:8080/ipfs/${v.ipfsHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: 'var(--accent-primary)',
                                                textDecoration: 'none',
                                                display: 'inline-block',
                                                marginTop: '0.5rem'
                                            }}
                                        >
                                            🔗 View on IPFS
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                No versions yet
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
