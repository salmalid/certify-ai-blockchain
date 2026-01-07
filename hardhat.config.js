require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: "0.8.24",
    networks: {
        hardhat: {
            chainId: 1337
        },
        ganache: {
            url: "http://127.0.0.1:7545",
            chainId: 1337  // Matches Ganache UI workspace default
            // No accounts specified - will use accounts from Ganache workspace
        }
        // Example for Sepolia
        // sepolia: {
        //   url: process.env.SEPOLIA_RPC_URL || "",
        //   accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        // }
    },
    paths: {
        artifacts: "./frontend/src/artifacts" // Convenient so frontend can access ABI immediately
    }
};