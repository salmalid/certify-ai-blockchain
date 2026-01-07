const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// Web3.Storage will be dynamically imported in uploadToIPFS function

// Contract Address - read from frontend artifact
const CONTRACT_ADDRESS_FILE = path.join(__dirname, '../frontend/src/contract-address.json');

let cachedContract = null;

/**
 * Get contract instance connected to local Hardhat node
 */
async function getContract() {
    if (cachedContract) return cachedContract;

    // Connect to local hardhat node
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");

    let contractAddress;
    try {
        const data = fs.readFileSync(CONTRACT_ADDRESS_FILE, 'utf8');
        const json = JSON.parse(data);
        contractAddress = json.ModelRegistry;
    } catch (e) {
        console.warn("Could not read contract address file. Using fallback or env.");
        contractAddress = process.env.CONTRACT_ADDRESS;
    }

    if (!contractAddress) {
        throw new Error("Contract address not found. Deploy contract first.");
    }

    // Read ABI from artifacts
    const abiPath = path.join(__dirname, '../frontend/src/artifacts/contracts/ModelRegistry.sol/ModelRegistry.json');
    const abiData = fs.readFileSync(abiPath, 'utf8');
    const abi = JSON.parse(abiData).abi;

    cachedContract = new ethers.Contract(contractAddress, abi, provider);
    return cachedContract;
}

/**
 * Compute SHA256 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Hex encoded hash
 */
async function computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

/**
 * Verify file hash against expected hash
 * @param {string} filePath - Path to the file
 * @param {string} expectedHash - Expected hash value
 * @returns {Promise<boolean>} - True if hashes match
 */
async function verifyFileHash(filePath, expectedHash) {
    const actualHash = await computeFileHash(filePath);
    return actualHash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Upload file to LOCAL IPFS node (100% FREE, self-hosted)
 * Requires IPFS daemon running locally on port 5001
 * @param {string} filePath - Path to the file to upload
 * @param {string} originalName - Original filename
 * @returns {Promise<string>} - IPFS CID
 */
async function uploadToIPFS(filePath, originalName) {
    const ipfsApiUrl = process.env.IPFS_API_URL || 'http://127.0.0.1:5001';

    try {
        // Read file
        const fileData = fs.readFileSync(filePath);

        // Create form data for IPFS HTTP API
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fileData, {
            filename: originalName,
            contentType: 'application/octet-stream'
        });

        // Upload to local IPFS node via HTTP API
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${ipfsApiUrl}/api/v0/add`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        if (!response.ok) {
            throw new Error(`IPFS upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        const cid = result.Hash;

        console.log(`✅ File uploaded to LOCAL IPFS: ${cid}`);
        console.log(`📦 Access via: http://127.0.0.1:8080/ipfs/${cid}`);
        console.log(`📦 Or via public gateway: https://ipfs.io/ipfs/${cid}`);

        return cid;
    } catch (error) {
        console.error('IPFS upload error:', error);
        throw new Error(`Failed to upload to IPFS: ${error.message}. Make sure IPFS daemon is running (ipfs daemon)`);
    }
}

module.exports = {
    getContract,
    computeFileHash,
    verifyFileHash,
    uploadToIPFS
};
