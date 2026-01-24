#  Certify AI - Blockchain Model Certification System

 **blockchain-based AI model certification with cryptographic integrity and duplicate prevention**

> A complete, production-ready system for certifying ML/DL models using blockchain technology, IPFS storage, and SHA-256 hashing. Features file uniqueness enforcement, single-step registration, and full transparency.

---

## Key Features

- **Dual-Mode Interface**: Register new models OR verify existing ones on the blockchain
- **File Hash Uniqueness**: Prevents duplicate model registration - same file cannot be registered twice
- **Public Verification**: Anyone can verify model authenticity by uploading the file
- **Single-Step Registration**: Upload file + metadata in one seamless workflow
- **Full Transparency**: Complete ownership chain, version history, and blockchain proof
- **Immutability Proof**: Cryptographic timestamps and hashes that cannot be altered
- **Comprehensive ML/DL Support**: 17 model types (CNN, RNN, Transformer, GAN, VAE, BERT, GPT, etc.)
- **IPFS Storage**: Decentralized, permanent file storage
- **Blockchain Immutability**: Tamper-proof records on Ethereum-compatible blockchain
- **Cryptographic Verification**: SHA-256 hashing for file integrity

---

##  Use Cases

- **Academic Research**: Prove authorship and publication dates
- **Industry Compliance**: EU AI Act model provenance requirements
- **Reproducible Science**: Track model lineage and datasets
- **Open Source AI**: Clear attribution and licensing
- **Legal Protection**: Blockchain timestamp as tamper-proof evidence

---

##  Architecture

```
┌──────────────┐
│   Browser    │ ← React Frontend (Vite)
└──────┬───────┘
       │
       ├─────────────────┬──────────────────┐
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  MetaMask   │   │   Backend   │   │   Ganache   │
│   Wallet    │   │  (Node.js)  │   │ Blockchain  │
└─────────────┘   └──────┬──────┘   └─────────────┘
                         │
                         ├──────────┬──────────┐
                         │          │          │
                         ▼          ▼          ▼
                  ┌──────────┐ ┌────────┐ ┌────────┐
                  │ SHA-256  │ │  IPFS  │ │ Smart  │
                  │ Hashing  │ │  Node  │ │Contract│
                  └──────────┘ └────────┘ └────────┘
```

### Components

1. **Smart Contract** (Solidity)
   - File hash uniqueness enforcement
   - Model metadata storage
   - Version control
   - Ownership management

2. **Backend API** (Node.js + Express)
   - File upload handling
   - SHA-256 hash computation
   - IPFS integration
   - Duplicate detection

3. **Frontend** (React + Vite)
   - Single-step registration workflow
   - Real-time duplicate checking
   - Blockchain transparency display
   - MetaMask integration

4. **IPFS** (Local Node)
   - Decentralized file storage
   - Content-addressed retrieval
   - Optional global network sync

5. **Ganache** (Local Blockchain)
   - Ethereum-compatible test network
   - Instant transactions
   - Free test accounts

---

##  Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | v16+ | JavaScript runtime |
| **Python** | v3.8+ | ML model tools |
| **IPFS Desktop** | Latest | Local IPFS node |
| **Ganache** | v7.9+ | Local blockchain |
| **MetaMask** | Latest | Browser wallet |

**System Requirements**:
- OS: Windows 10+, macOS 10.15+, or Linux
- RAM: 4GB minimum (8GB recommended)
- Disk: 2GB free space

---

##  Quick Start

### 1. Install Dependencies

```bash
# Clone repository
cd certify-ai-blockchain

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install Python tools
pip install scikit-learn numpy
```

### 2. Start Infrastructure

**Terminal 1 - IPFS** (should auto-start with IPFS Desktop)
```bash
# Verify IPFS is running
curl.exe -X POST http://127.0.0.1:5001/api/v0/version
```

**Terminal 2 - Ganache**
```bash
ganache --port 7545 --networkId 5777 --deterministic
```

### 3. Deploy Smart Contract

**Terminal 3**
```bash
npx hardhat run scripts/deploy.js --network ganache
```

**Note the deployed contract address!**

### 4. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add the contract address from step 3
```

### 5. Start Services

**Terminal 4 - Backend**
```bash
cd backend
npm start
```

**Terminal 5 - Frontend**
```bash
cd frontend
npm run dev
```

### 6. Configure MetaMask

1. Add Ganache network:
   - Network Name: `Ganache Local`
   - RPC URL: `http://127.0.0.1:7545`
   - Chain ID: `5777`
   - Currency: `ETH`

2. Import test account:
   - Private Key: `0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d`

### 7. Access Application

Open http://localhost:5173 in your browser!

---

##  Usage Guide

### Register a Model

1. **Connect Wallet**
   - Click "Connect Wallet"
   - Approve MetaMask connection

2. **Select Register Tab**
   - Click "📝 Register New Model" tab

3. **Upload Model File**
   - Click file upload zone
   - Select your model (.pkl, .h5, .pt, .onnx, etc.)
   - System automatically checks for duplicates

4. **Fill Metadata** (if file is unique)
   - Model Name (required)
   - Description (optional)
   - Framework (PyTorch, TensorFlow, Scikit-learn, etc.)
   - Task Type (Classification, NLP, Computer Vision, etc.)
   - Model Type (CNN, Transformer, GAN, etc.)
   - Architecture (e.g., "ResNet-50", "GPT-2-Medium")
   - Parameter Count (optional)
   - Training Datasets (optional)
   - License

5. **Register**
   - Click "Register Model on Blockchain"
   - Approve MetaMask transaction
   - Done! Model is certified

### Verify a Model (NEW! )

**Blockchain Transparency Feature** - Anyone can verify model authenticity!

1. **Select Verify Tab**
   - Click " Verify Model" tab

2. **Upload Model File**
   - Click file upload zone
   - Select the model file you want to verify

3. **View Verification Results**
   
   **If Model is Verified **:
   - **Blockchain Proof**: Registration date, file hash, immutability guarantee
   - **Model Information**: Name, owner, framework, architecture, license
   - **Version History**: All versions with timestamps and IPFS links
   - **Matching Version**: Highlighted version that matches your file
   - **Public Verification**: All data is publicly accessible and verifiable

   **If Model Not Found **:
   - File hash is displayed
   - Option to register the model
   - Confirms file is unique on blockchain

**Why Verification Matters**:
-  **Transparency**: Anyone can verify ownership and authenticity
-  **Immutability**: Records cannot be altered or deleted
-  **Cryptographic Proof**: SHA-256 hashes ensure file integrity
-  **Traceability**: Complete version history and provenance
-  **Public Ledger**: All information is publicly accessible

### View Model Details

**Method 1: Click Model Card**
- Click on any model in the grid
- View complete version history
- Check IPFS hash and SHA-256 hash
- Verify owner address

**Method 2: File Hash Verification (Command Line)**
```bash
# Download model from IPFS
curl http://127.0.0.1:8080/ipfs/[CID] -o downloaded_model.pkl

# Compute hash
python tools/compute_hash.py downloaded_model.pkl

# Compare with blockchain hash
# Match =  Authentic!
```

---

##  Security Features

### File Hash Uniqueness

The system prevents duplicate model registration:

```solidity
// Smart contract checks file hash before registration
if (hashExists[fileHash]) {
    revert("Model file already registered as 'existing-model' by 0x...");
}
```

### Ownership Protection

- Only the wallet that registered a model can add versions
- Ownership can be transferred (with owner approval)
- All actions are cryptographically signed

### Cryptographic Integrity

- SHA-256 hashing ensures file hasn't been tampered with
- IPFS content-addressing provides additional verification
- Blockchain immutability prevents record alteration

---

##  Supported Model Types

### Frameworks (7)
- PyTorch
- TensorFlow
- JAX
- Scikit-learn
- Keras
- ONNX
- Other

### Model Architectures (17)
- Traditional ML (Scikit-learn, XGBoost)
- CNN (Convolutional Neural Network)
- RNN (Recurrent Neural Network)
- LSTM, GRU
- Transformer
- BERT, GPT
- GAN (Generative Adversarial Network)
- VAE (Variational Autoencoder)
- Diffusion Models
- ResNet
- Vision Transformer (ViT)
- YOLO
- U-Net
- Ensemble
- Custom

### Task Types (15)
- Classification
- Regression
- Generation
- Object Detection
- Segmentation
- NLP
- Computer Vision
- Time Series
- Clustering
- Recommendation
- Anomaly Detection
- Speech Recognition
- Multi-Modal
- Reinforcement Learning
- Other

---

##  Project Structure

```
certify-ai-blockchain/
├── contracts/
│   └── ModelRegistry.sol          # Smart contract with hash uniqueness
├── scripts/
│   └── deploy.js                  # Deployment script
├── backend/
│   ├── server.js                  # Express API with duplicate detection
│   ├── utils.js                   # IPFS & hashing utilities
│   └── .env                       # Configuration
├── frontend/
│   └── src/
│       ├── App.jsx                # Main React component
│       ├── index.css              # Styling
│       └── artifacts/             # Contract ABI (auto-generated)
├── tools/
│   └── compute_hash.py            # Hash verification tool
├── test_model.py                  # Create test ML model
├── hardhat.config.js              # Hardhat configuration
└── README.md                      # This file
```

---

##  API Endpoints

### Backend API (http://localhost:3001/api)

| Endpoint           | Method | Description                                    |
|--------------------|--------|------------------------------------------------|
| `/health`          | GET    | Health check                                   |
| `/models`          | GET    | Get all models                                 |
| `/models/:name`    | GET    | Get specific model with versions               |
| `/check-duplicate` | POST   | Check if file hash exists                      |
| `/verify-model`    | POST   | **NEW!** Comprehensive blockchain verification |
| `/upload`          | POST   | Upload file to IPFS                            | 
| `/hash`            | POST   | Compute file hash                              |
| `/verify`          | POST   | Verify file hash                               |

---

##  Authors

**Salma Lidame** and **Nada Saber**  
TRI Department, National School of Applied Sciences, El Jadida, Morocco  
📧 Corresponding authors:
- lidame.s006@ucd.ac.ma 
- saber.n842@ucd.ac.ma

---

### Citation

If you use this system in research, please cite:

```bibtex
@software{certify_ai_blockchain_2026,
  title = {A Blockchain-Based Framework for AI Model Registration and Verification},
  author = {Lidame, Salma and Saber, Nada},
  year = {2026},
  institution = {National School of Applied Sciences, El Jadida},
  department = {TRI Department}
}
```

---

## Troubleshooting

### IPFS not responding
```bash
# Restart IPFS Desktop or run:
ipfs daemon
```

### Ganache connection error
- Ensure Ganache is running on port 7545
- Check `backend/.env` has correct RPC_URL

### MetaMask transaction fails
- Ensure you're on Ganache network (Chain ID: 5777)
- Check you have sufficient ETH balance
- Try resetting MetaMask account (Settings → Advanced → Reset Account)

### Contract not found
- Redeploy contract: `npx hardhat run scripts/deploy.js --network ganache`
- Update contract address in `backend/.env`

---

##  Environment Variables

### Backend `.env`

```bash
# Server
PORT=3001

# Blockchain (Ganache)
RPC_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=0x...  # From deployment

# IPFS
IPFS_API_URL=http://127.0.0.1:5001
```

---

##  Workflow Diagram

```
User Uploads File
       ↓
Compute SHA-256 Hash
       ↓
Check Blockchain for Duplicate
       ↓
   ┌───────┴───────┐
   │               │
Duplicate?      Unique
   │               │
Show Warning   Show Metadata Form
   │               │
Block          Fill Details
Registration       ↓
               Upload to IPFS
                   ↓
               Register on Blockchain
                   ↓
                Certified!
```


## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

