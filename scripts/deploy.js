const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const ModelRegistry = await hre.ethers.getContractFactory("ModelRegistry");
    const modelRegistry = await ModelRegistry.deploy();

    await modelRegistry.waitForDeployment(); // Updated for newer Hardhat versions

    const address = await modelRegistry.getAddress();
    console.log("ModelRegistry deployed to:", address);

    // Save address to frontend for convenience
    const configPath = path.join(__dirname, "../frontend/src/contract-address.json");
    const configDir = path.dirname(configPath);

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(
        configPath,
        JSON.stringify({ ModelRegistry: address }, null, 2)
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
