const CrowdsaleAgent = artifacts.require("tests/CrowdsaleAgentTest.sol");
const MintableCrowdsaleOnSuccessAgent = artifacts.require("tests/MintableCrowdsaleOnSuccessAgentTest.sol");
const Crowdsale = artifacts.require("crowdsale/CrowdsaleImpl.sol");
const TokenAllocator = artifacts.require("allocator/MintableTokenAllocator.sol");
const MintableToken = artifacts.require("./CLXToken.sol");
const Management = artifacts.require("./managment/Management.sol");
const Utils = require("./utils.js");
require('@openzeppelin/test-helpers');
const {constants, expectEvent, expectRevert, BN} = require('@openzeppelin/test-helpers')
const {ZERO_ADDRESS} = constants;

// Contract keys
const CONTRACT_TOKEN = 1;
const CONTRACT_CROWDSALE = 3;
const CONTRACT_AGENT = 5;

// Permission keys
const PERMISSION_CAN_UPDATE_STATE = 2;

let icoSince = parseInt(new Date().getTime() / 1000) - 3600;
let icoTill = parseInt(new Date().getTime() / 1000) + 3600;

contract("Agent", accounts => {
    let allocator;
    let crowdsale;
    let mintableToken;
    let management;

    const owner = accounts[0];

    beforeEach(async () => {
        management = await Management.new({from: owner});

        mintableToken = await MintableToken.new(
            management.address,
            {from: owner}
        );

        /* eslint no-unused-vars: "off" */
        /* eslint-env node */
        allocator = await TokenAllocator.new(
            1000,
            management.address,
            {from: owner}
        );

        crowdsale = await Crowdsale.new(
            icoSince,
            icoTill,
            true,
            true,
            true,
            management.address
        )
    });

    describe("check initializating of agents", () => {
        it("should return false because Crowdsale has not been initialized", async () => {
            const instance = await CrowdsaleAgent.new(ZERO_ADDRESS);
            const res = await instance.isInitialized();
            assert.equal(res, false, "isInitialized does not match");
        });

        it("should return true because CrowdsaleAgent has been initialized", async () => {
            const instance = await CrowdsaleAgent.new(management.address);
            let res = await instance.isInitialized();
            assert.equal(res, false, "isInitialized does not match");

            await management.registerContract(CONTRACT_CROWDSALE, crowdsale.address)
                .then(Utils.receiptShouldSucceed);

            let contractCrowdsaleAddress = await management.contractRegistry.call(CONTRACT_CROWDSALE);
            assert.equal(contractCrowdsaleAddress, crowdsale.address, "crowdsale address is not equal");

            res = await instance.isInitialized();
            assert.equal(res, true, "isInitialized does not match");
        });

        it("should return false because MintableCrowdsaleOnSuccessAgent has not been initialized", async () => {
            const instance = await MintableCrowdsaleOnSuccessAgent.new(management.address);
            const res = await instance.isInitialized();
            assert.equal(res, false, "isInitialized does not match");
        });

        it("should return true because MintableCrowdsaleOnSuccessAgent has been initialized", async () => {
            const agent = await MintableCrowdsaleOnSuccessAgent.new(management.address);

            await management.registerContract(CONTRACT_TOKEN, mintableToken.address)
                .then(Utils.receiptShouldSucceed);

            let contractTokenAddress = await management.contractRegistry.call(CONTRACT_TOKEN);
            assert.equal(contractTokenAddress, mintableToken.address, "mintableToken address is not equal");

            await management.registerContract(CONTRACT_CROWDSALE, crowdsale.address)
                .then(Utils.receiptShouldSucceed);

            let contractCrowdsaleAddress = await management.contractRegistry.call(CONTRACT_CROWDSALE);
            assert.equal(contractCrowdsaleAddress, crowdsale.address, "crowdsale address is not equal");

            await management.registerContract(CONTRACT_AGENT, agent.address)
                .then(Utils.receiptShouldSucceed);

            let contractAgentAddress = await management.contractRegistry.call(CONTRACT_AGENT);
            assert.equal(contractAgentAddress, agent.address, "agent address is not equal");

            const res = await agent.isInitialized();
            assert.equal(res, true, "isInitialized does not match");
        });

        it("should call onContribution", async () => {
            const agent = await MintableCrowdsaleOnSuccessAgent.new(management.address);

            let crowdsaleAddress = accounts[4];

            await management.registerContract(CONTRACT_TOKEN, mintableToken.address)
                .then(Utils.receiptShouldSucceed);

            let contractTokenAddress = await management.contractRegistry.call(CONTRACT_TOKEN);
            assert.equal(contractTokenAddress, mintableToken.address, "mintableToken address is not equal");

            await management.registerContract(CONTRACT_CROWDSALE, crowdsaleAddress)
                .then(Utils.receiptShouldSucceed);

            let contractCrowdsaleAddress = await management.contractRegistry.call(CONTRACT_CROWDSALE);
            assert.equal(contractCrowdsaleAddress, crowdsaleAddress, "crowdsale address is not equal");

            await management.registerContract(CONTRACT_AGENT, agent.address)
                .then(Utils.receiptShouldSucceed);

            let contractAgentAddress = await management.contractRegistry.call(CONTRACT_AGENT);
            assert.equal(contractAgentAddress, agent.address, "agent address is not equal");

            const res = await agent.isInitialized();
            assert.equal(res, true, "isInitialized does not match");

            let address = accounts[3];
            let weiAmount = 11000;
            let tokens = new BN('1.1');
            let bonus = new BN('0.1');

            await agent.onContribution(
                address,
                weiAmount,
                tokens,
                bonus,
                {from: crowdsaleAddress}
            )
                .then(Utils.receiptShouldSucceed);
        });

        it("should call onStateChange", async () => {
            const agent = await MintableCrowdsaleOnSuccessAgent.new(management.address);

            let crowdsaleAddress = accounts[4];

            await management.registerContract(CONTRACT_TOKEN, mintableToken.address)
                .then(Utils.receiptShouldSucceed);

            let contractTokenAddress = await management.contractRegistry.call(CONTRACT_TOKEN);
            assert.equal(contractTokenAddress, mintableToken.address, "mintableToken address is not equal");

            await management.registerContract(CONTRACT_CROWDSALE, crowdsaleAddress)
                .then(Utils.receiptShouldSucceed);

            let contractCrowdsaleAddress = await management.contractRegistry.call(CONTRACT_CROWDSALE);
            assert.equal(contractCrowdsaleAddress, crowdsaleAddress, "crowdsale address is not equal");

            await management.registerContract(CONTRACT_AGENT, agent.address)
                .then(Utils.receiptShouldSucceed);

            let contractAgentAddress = await management.contractRegistry.call(CONTRACT_AGENT);
            assert.equal(contractAgentAddress, agent.address, "agent address is not equal");

            const res = await agent.isInitialized();
            assert.equal(res, true, "isInitialized does not match");

            let crowdsaleState = 4;

            await management.setPermission(
                crowdsaleAddress,
                PERMISSION_CAN_UPDATE_STATE,
                true,
                {from: owner}
            )
                .then(Utils.receiptShouldSucceed)

            await agent.onStateChange(
                crowdsaleState,
                {from: crowdsaleAddress}
            )
                .then(Utils.receiptShouldSucceed);
        });

        it("should call onRefund", async () => {
            const agent = await MintableCrowdsaleOnSuccessAgent.new(management.address);

            let crowdsaleAddress = accounts[4];

            await management.registerContract(CONTRACT_TOKEN, mintableToken.address)
                .then(Utils.receiptShouldSucceed);

            let contractTokenAddress = await management.contractRegistry.call(CONTRACT_TOKEN);
            assert.equal(contractTokenAddress, mintableToken.address, "mintableToken address is not equal");

            await management.registerContract(CONTRACT_CROWDSALE, crowdsaleAddress)
                .then(Utils.receiptShouldSucceed);

            let contractCrowdsaleAddress = await management.contractRegistry.call(CONTRACT_CROWDSALE);
            assert.equal(contractCrowdsaleAddress, crowdsaleAddress, "crowdsale address is not equal");

            await management.registerContract(CONTRACT_AGENT, agent.address)
                .then(Utils.receiptShouldSucceed);

            let contractAgentAddress = await management.contractRegistry.call(CONTRACT_AGENT);
            assert.equal(contractAgentAddress, agent.address, "agent address is not equal");

            const res = await agent.isInitialized();
            assert.equal(res, true, "isInitialized does not match");

            let contributor = accounts[3];
            let tokens = 10;

            await agent.onRefund(
                contributor,
                tokens,
                {from: crowdsaleAddress}
            )
                .then(Utils.receiptShouldSucceed);
        });
    });
});