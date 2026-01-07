const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Comprehensive Test Suite for ModelRegistry
 * Research-grade testing with gas analysis and edge cases
 */
describe("ModelRegistry - Research Grade Tests", function () {
    let ModelRegistry;
    let registry;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    // Sample metadata for testing
    const sampleMetadata = {
        framework: 0, // PyTorch
        taskType: 0,  // Classification
        parameterCount: 1000000,
        architecture: "ResNet-50",
        datasets: ["ImageNet", "COCO"],
        license: 0,   // MIT
        customLicense: ""
    };

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        ModelRegistry = await ethers.getContractFactory("ModelRegistry");
        registry = await ModelRegistry.deploy();
        await registry.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await registry.getAddress()).to.be.properAddress;
        });

        it("Should initialize with zero models", async function () {
            const stats = await registry.getGlobalStats();
            expect(stats._totalModels).to.equal(0);
            expect(stats._totalVersions).to.equal(0);
        });
    });

    describe("Model Registration", function () {
        it("Should register a model with metadata", async function () {
            const tx = await registry.registerModel(
                "test-model",
                "Test description",
                sampleMetadata
            );

            await expect(tx)
                .to.emit(registry, "ModelRegistered")
                .withArgs("test-model", owner.address, await getBlockTimestamp(), 0);

            const model = await registry.getModel("test-model");
            expect(model.name).to.equal("test-model");
            expect(model.owner).to.equal(owner.address);
        });

        it("Should track global statistics", async function () {
            await registry.registerModel("model1", "Desc", sampleMetadata);
            await registry.registerModel("model2", "Desc", sampleMetadata);

            const stats = await registry.getGlobalStats();
            expect(stats._totalModels).to.equal(2);
        });

        it("Should reject empty model name", async function () {
            await expect(
                registry.registerModel("", "Description", sampleMetadata)
            ).to.be.revertedWith("String cannot be empty");
        });

        it("Should reject duplicate model names", async function () {
            await registry.registerModel("test-model", "Desc", sampleMetadata);

            await expect(
                registry.registerModel("test-model", "Desc2", sampleMetadata)
            ).to.be.revertedWith("Model name already taken");
        });

        it("Should require architecture in metadata", async function () {
            const invalidMetadata = { ...sampleMetadata, architecture: "" };

            await expect(
                registry.registerModel("test", "Desc", invalidMetadata)
            ).to.be.revertedWith("Architecture required");
        });

        it("Should track models by owner", async function () {
            await registry.registerModel("model1", "Desc", sampleMetadata);
            await registry.connect(addr1).registerModel("model2", "Desc", sampleMetadata);

            const ownerModels = await registry.getModelsByOwner(owner.address);
            expect(ownerModels.length).to.equal(1);
            expect(ownerModels[0]).to.equal("model1");
        });
    });

    describe("Version Management", function () {
        beforeEach(async function () {
            await registry.registerModel("test-model", "Desc", sampleMetadata);
        });

        it("Should add version successfully", async function () {
            const tx = await registry.addVersion(
                "test-model",
                "QmTest123",
                "abc123hash",
                "Version 1.0",
                1024000
            );

            await expect(tx)
                .to.emit(registry, "VersionAdded")
                .withArgs("test-model", 0, "QmTest123", "abc123hash", owner.address, 1024000, await getBlockTimestamp());

            const versionCount = await registry.getVersionCount("test-model");
            expect(versionCount).to.equal(1);
        });

        it("Should track multiple versions", async function () {
            await registry.addVersion("test-model", "QmV1", "hash1", "v1", 1000);
            await registry.addVersion("test-model", "QmV2", "hash2", "v2", 2000);
            await registry.addVersion("test-model", "QmV3", "hash3", "v3", 3000);

            const versionCount = await registry.getVersionCount("test-model");
            expect(versionCount).to.equal(3);

            const stats = await registry.getGlobalStats();
            expect(stats._totalVersions).to.equal(3);
        });

        it("Should get latest version", async function () {
            await registry.addVersion("test-model", "QmV1", "hash1", "v1", 1000);
            await registry.addVersion("test-model", "QmV2", "hash2", "v2", 2000);

            const latest = await registry.getLatestVersion("test-model");
            expect(latest.ipfsHash).to.equal("QmV2");
            expect(latest.modelHash).to.equal("hash2");
        });

        it("Should only allow owner to add versions", async function () {
            await expect(
                registry.connect(addr1).addVersion("test-model", "QmTest", "hash", "v1", 1000)
            ).to.be.revertedWith("Not the owner of this model");
        });

        it("Should track contributor statistics", async function () {
            await registry.addVersion("test-model", "QmV1", "hash1", "v1", 1000);
            await registry.addVersion("test-model", "QmV2", "hash2", "v2", 2000);

            const stats = await registry.getContributorStats(owner.address);
            expect(stats.versionsContributed).to.equal(2);
        });
    });

    describe("Ownership Transfer", function () {
        beforeEach(async function () {
            await registry.registerModel("test-model", "Desc", sampleMetadata);
        });

        it("Should transfer ownership successfully", async function () {
            const tx = await registry.transferOwnership("test-model", addr1.address);

            await expect(tx)
                .to.emit(registry, "OwnershipTransferred")
                .withArgs("test-model", owner.address, addr1.address, await getBlockTimestamp());

            const model = await registry.getModel("test-model");
            expect(model.owner).to.equal(addr1.address);
        });

        it("Should reject zero address", async function () {
            await expect(
                registry.transferOwnership("test-model", ethers.ZeroAddress)
            ).to.be.revertedWith("New owner cannot be zero address");
        });

        it("Should reject transfer to self", async function () {
            await expect(
                registry.transferOwnership("test-model", owner.address)
            ).to.be.revertedWith("Already the owner");
        });

        it("Should only allow current owner to transfer", async function () {
            await expect(
                registry.connect(addr1).transferOwnership("test-model", addr2.address)
            ).to.be.revertedWith("Not the owner of this model");
        });
    });

    describe("Citation Tracking", function () {
        beforeEach(async function () {
            await registry.registerModel("test-model", "Desc", sampleMetadata);
        });

        it("Should increment citation count", async function () {
            await registry.citeModel("test-model");

            const model = await registry.getModel("test-model");
            expect(model.citationCount).to.equal(1);
        });

        it("Should track multiple citations", async function () {
            await registry.citeModel("test-model");
            await registry.connect(addr1).citeModel("test-model");
            await registry.connect(addr2).citeModel("test-model");

            const model = await registry.getModel("test-model");
            expect(model.citationCount).to.equal(3);
        });

        it("Should emit citation event", async function () {
            const tx = await registry.citeModel("test-model");

            await expect(tx)
                .to.emit(registry, "ModelCited")
                .withArgs("test-model", owner.address, 1, await getBlockTimestamp());
        });
    });

    describe("Metadata Management", function () {
        beforeEach(async function () {
            await registry.registerModel("test-model", "Desc", sampleMetadata);
        });

        it("Should update metadata", async function () {
            const newMetadata = {
                ...sampleMetadata,
                architecture: "ResNet-101",
                parameterCount: 2000000
            };

            await registry.updateMetadata("test-model", newMetadata);

            const metadata = await registry.getModelMetadata("test-model");
            expect(metadata.architecture).to.equal("ResNet-101");
            expect(metadata.parameterCount).to.equal(2000000);
        });

        it("Should only allow owner to update metadata", async function () {
            await expect(
                registry.connect(addr1).updateMetadata("test-model", sampleMetadata)
            ).to.be.revertedWith("Not the owner of this model");
        });

        it("Should update license", async function () {
            await registry.updateLicense("test-model", 1, ""); // Apache2

            const metadata = await registry.getModelMetadata("test-model");
            expect(metadata.license).to.equal(1);
        });

        it("Should require custom license text for custom license", async function () {
            await expect(
                registry.updateLicense("test-model", 7, "") // Custom with empty text
            ).to.be.revertedWith("Custom license text required");
        });
    });

    describe("Gas Optimization Analysis", function () {
        it("Should measure gas for model registration", async function () {
            const tx = await registry.registerModel("gas-test", "Desc", sampleMetadata);
            const receipt = await tx.wait();

            console.log(`\n  ⛽ Gas used for registration: ${receipt.gasUsed.toString()}`);

            // Should be under 200k gas
            expect(receipt.gasUsed).to.be.lt(200000);
        });

        it("Should measure gas for adding version", async function () {
            await registry.registerModel("gas-test", "Desc", sampleMetadata);

            const tx = await registry.addVersion("gas-test", "QmTest", "hash", "v1", 1000);
            const receipt = await tx.wait();

            console.log(`  ⛽ Gas used for adding version: ${receipt.gasUsed.toString()}`);

            // Should be under 150k gas
            expect(receipt.gasUsed).to.be.lt(150000);
        });

        it("Should measure gas for citation", async function () {
            await registry.registerModel("gas-test", "Desc", sampleMetadata);

            const tx = await registry.citeModel("gas-test");
            const receipt = await tx.wait();

            console.log(`  ⛽ Gas used for citation: ${receipt.gasUsed.toString()}`);

            // Should be very cheap
            expect(receipt.gasUsed).to.be.lt(50000);
        });
    });

    describe("Edge Cases and Security", function () {
        it("Should handle very long model names", async function () {
            const longName = "a".repeat(100);
            await registry.registerModel(longName, "Desc", sampleMetadata);

            const model = await registry.getModel(longName);
            expect(model.name).to.equal(longName);
        });

        it("Should handle models with no versions", async function () {
            await registry.registerModel("empty-model", "Desc", sampleMetadata);

            await expect(
                registry.getLatestVersion("empty-model")
            ).to.be.revertedWith("No versions available");
        });

        it("Should reject accessing non-existent model", async function () {
            await expect(
                registry.getModel("non-existent")
            ).to.be.revertedWith("Model does not exist");
        });

        it("Should handle large dataset arrays", async function () {
            const largeMetadata = {
                ...sampleMetadata,
                datasets: Array(10).fill("Dataset")
            };

            await registry.registerModel("large-meta", "Desc", largeMetadata);
            const metadata = await registry.getModelMetadata("large-meta");
            expect(metadata.datasets.length).to.equal(10);
        });
    });

    // Helper function to get block timestamp
    async function getBlockTimestamp() {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        return block.timestamp;
    }
});
