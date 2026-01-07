const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();
const { getContract, uploadToIPFS, computeFileHash, verifyFileHash } = require('./utils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept all files for AI models
        cb(null, true);
    }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Get all models
app.get('/api/models', async (req, res) => {
    try {
        const contract = await getContract();
        const names = await contract.getAllModelNames();

        const models = [];
        for (const name of names) {
            const details = await contract.getModel(name);
            models.push({
                name: details[0],
                owner: details[1],
                versionCount: details[2].toString()
            });
        }
        res.json(models);
    } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific model with all versions
app.get('/api/models/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const contract = await getContract();
        const details = await contract.getModel(name);

        // Fetch versions
        const versionCount = Number(details[2]);
        const versions = [];
        for (let i = 0; i < versionCount; i++) {
            const v = await contract.getVersion(name, i);
            versions.push({
                index: i,
                ipfsHash: v.ipfsHash,
                modelHash: v.modelHash,
                timestamp: new Date(Number(v.timestamp) * 1000).toISOString(),
                description: v.description,
                ipfsUrl: `https://nftstorage.link/ipfs/${v.ipfsHash}`
            });
        }

        res.json({
            name: details[0],
            owner: details[1],
            versionCount,
            versions
        });
    } catch (error) {
        console.error('Error fetching model:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific version
app.get('/api/models/:name/versions/:index', async (req, res) => {
    try {
        const { name, index } = req.params;
        const contract = await getContract();
        const v = await contract.getVersion(name, parseInt(index));

        res.json({
            index: parseInt(index),
            ipfsHash: v.ipfsHash,
            modelHash: v.modelHash,
            timestamp: new Date(Number(v.timestamp) * 1000).toISOString(),
            description: v.description,
            ipfsUrl: `https://nftstorage.link/ipfs/${v.ipfsHash}`
        });
    } catch (error) {
        console.error('Error fetching version:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload file to IPFS and return CID + hash
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('Uploading file to IPFS:', req.file.originalname);

        // Compute hash
        const hash = await computeFileHash(req.file.path);
        console.log('File hash:', hash);

        // Upload to IPFS
        const ipfsCID = await uploadToIPFS(req.file.path, req.file.originalname);
        console.log('IPFS CID:', ipfsCID);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            ipfsCID,
            hash,
            filename: req.file.originalname,
            size: req.file.size,
            ipfsUrl: `https://nftstorage.link/ipfs/${ipfsCID}`
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Check for duplicate file (compute hash and check blockchain)
app.post('/api/check-duplicate', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('Checking for duplicate:', req.file.originalname);

        // Compute hash
        const hash = await computeFileHash(req.file.path);
        console.log('File hash:', hash);

        // Check blockchain for existing model with this hash
        const contract = await getContract();
        const [exists, modelName, owner] = await contract.checkFileHash(hash);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (exists) {
            console.log(`⚠️  Duplicate detected! File already registered as "${modelName}" by ${owner}`);

            // Get additional details
            const details = await contract.getModel(modelName);
            const versionCount = Number(details[2]);
            const citationCount = Number(details[3]);

            return res.json({
                isDuplicate: true,
                hash,
                existingModel: {
                    name: modelName,
                    owner: owner,
                    versionCount,
                    citationCount
                },
                message: `This file is already registered as "${modelName}" by ${owner.substring(0, 10)}...`
            });
        }

        console.log('✅ File is unique');
        res.json({
            isDuplicate: false,
            hash,
            filename: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Error checking duplicate:', error);
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Verify model on blockchain (comprehensive verification)
app.post('/api/verify-model', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('🔍 Verifying model:', req.file.originalname);

        // Compute hash
        const hash = await computeFileHash(req.file.path);
        console.log('File hash:', hash);

        // Check blockchain
        const contract = await getContract();
        const [exists, modelName, owner] = await contract.checkFileHash(hash);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (!exists) {
            console.log('❌ Model not found on blockchain');
            return res.json({
                verified: false,
                hash,
                filename: req.file.originalname,
                size: req.file.size,
                message: 'This file is not registered on the blockchain'
            });
        }

        console.log(`✅ Model verified: "${modelName}"`);

        // Get comprehensive model details
        const details = await contract.getModel(modelName);
        const versionCount = Number(details[2]);
        const citationCount = Number(details[3]);

        // Get metadata
        const metadata = await contract.getModelMetadata(modelName);

        // Get all versions
        const versions = [];
        let matchingVersionIndex = -1;

        for (let i = 0; i < versionCount; i++) {
            const v = await contract.getVersion(modelName, i);
            const versionData = {
                index: i,
                ipfsHash: v.ipfsHash,
                modelHash: v.modelHash,
                timestamp: Number(v.timestamp),
                timestampISO: new Date(Number(v.timestamp) * 1000).toISOString(),
                description: v.description,
                contributor: v.contributor,
                fileSize: Number(v.fileSize),
                ipfsUrl: `http://127.0.0.1:8080/ipfs/${v.ipfsHash}`,
                isMatch: v.modelHash === hash
            };

            if (v.modelHash === hash) {
                matchingVersionIndex = i;
            }

            versions.push(versionData);
        }

        // Framework mapping
        const frameworks = ['PyTorch', 'TensorFlow', 'JAX', 'Scikit-learn', 'Keras', 'ONNX', 'Other'];
        const taskTypes = [
            'Classification', 'Regression', 'Generation', 'Detection', 'Segmentation',
            'NLP', 'Reinforcement Learning', 'Computer Vision', 'Time Series',
            'Clustering', 'Recommendation', 'Anomaly Detection', 'Speech Recognition',
            'Multi-Modal', 'Other'
        ];
        const modelTypes = [
            'Traditional ML', 'CNN', 'RNN', 'LSTM', 'GRU', 'Transformer',
            'BERT', 'GPT', 'GAN', 'VAE', 'Diffusion', 'ResNet',
            'Vision Transformer', 'YOLO', 'U-Net', 'Ensemble', 'Custom'
        ];
        const licenses = ['MIT', 'Apache 2.0', 'GPL 3.0', 'BSD', 'Proprietary', 'CC BY', 'CC BY-SA', 'Custom'];

        res.json({
            verified: true,
            hash,
            filename: req.file.originalname,
            size: req.file.size,
            matchingVersion: matchingVersionIndex,
            model: {
                name: modelName,
                owner: owner,
                versionCount,
                citationCount,
                metadata: {
                    framework: frameworks[Number(metadata.framework)] || 'Unknown',
                    taskType: taskTypes[Number(metadata.taskType)] || 'Unknown',
                    modelType: modelTypes[Number(metadata.modelType)] || 'Unknown',
                    parameterCount: Number(metadata.parameterCount),
                    architecture: metadata.architecture,
                    datasets: metadata.datasets,
                    license: licenses[Number(metadata.license)] || 'Unknown',
                    customLicense: metadata.customLicense,
                    fileExtension: metadata.fileExtension
                },
                versions: versions.reverse() // Show newest first
            },
            blockchainProof: {
                registrationTimestamp: versions[versions.length - 1].timestamp,
                registrationDate: versions[versions.length - 1].timestampISO,
                immutable: true,
                publiclyVerifiable: true
            }
        });
    } catch (error) {
        console.error('Error verifying model:', error);
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Compute hash of uploaded file
app.post('/api/hash', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const hash = await computeFileHash(req.file.path);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            hash,
            filename: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Error computing hash:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Verify file hash
app.post('/api/verify', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { expectedHash } = req.body;
        if (!expectedHash) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Expected hash is required' });
        }

        const isValid = await verifyFileHash(req.file.path, expectedHash);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            valid: isValid,
            filename: req.file.originalname
        });
    } catch (error) {
        console.error('Error verifying file:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});