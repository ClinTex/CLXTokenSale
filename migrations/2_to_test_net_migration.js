const BN = require("bn.js");
const BigNumber = require("bignumber.js");

const PricingStrategy = artifacts.require("./CLXPricingStrategy.sol");
const CLXReferral = artifacts.require("./CLXReferral.sol");
const LockupContract = artifacts.require("./LockupContract.sol");
const Management = artifacts.require("./managment/Management.sol");
const CLXCrowdsale = artifacts.require("./CLXCrowdsale.sol");
const CLXToken = artifacts.require("./CLXToken.sol");
const CLXContribution = artifacts.require("./CLXContribution.sol");
const MintableCrowdsaleOnSuccessAgent = artifacts.require("./agent/MintableCrowdsaleOnSuccessAgent.sol");
const CLXAllocator = artifacts.require("./CLXAllocator.sol");
const CLXStats = artifacts.require("./CLXStats.sol");

module.exports = function (deployer, network, accounts) {
    const precision = new BN("1000000000000000000").valueOf();
    const currencyPrecision = new BN("100000").valueOf();

    // Contract keys
    const CONTRACT_TOKEN = 1;
    const CONTRACT_PRICING = 2;
    const CONTRACT_CROWDSALE = 3;
    const CONTRACT_ALLOCATOR = 4;
    const CONTRACT_AGENT = 5;
    const CONTRACT_FORWARDER = 6;
    const CONTRACT_REFERRAL = 7;
    const CONTRACT_STATS = 8;
    const CONTRACT_LOCKUP = 9;

    // Permission keys
    const CAN_MINT_TOKENS = 0;
    const CAN_BURN_TOKENS = 1;
    const CAN_UPDATE_STATE = 2;
    const CAN_LOCK_TOKENS = 3;
    const CAN_UPDATE_PRICE = 4;
    const CAN_INTERACT_WITH_ALLOCATOR = 5;
    const CAN_SET_ALLOCATOR_MAX_SUPPLY = 6;
    const CAN_PAUSE_TOKENS = 7;
    const EXCLUDED_ADDRESSES = 8;
    const WHITELISTED = 9;
    const SIGNERS = 10;
    const EXTERNAL_CONTRIBUTORS = 11;
    const CAN_SEE_BALANCE = 12;
    const CAN_CANCEL_TRANSACTION = 13;
    const CAN_ALLOCATE_REFERRAL_TOKENS = 14;
    const CAN_SET_REFERRAL_MAX_SUPPLY = 15;
    const MANUAL_TOKENS_ALLOCATION = 16;
    const CAN_SET_WHITELISTED = 17;
    const MONTH_IN_SECONDS = 2629746;

    let pricing,
        management,
        crowdsale,
        token,
        allocator,
        forwarder,
        agent,
        referral,
        stats,
        lockupContract;

    let startAt = parseInt(new Date().getTime() / 1000);

    let etherHolder = "0xb75037df93E6BBbbB80B0E5528acaA34511B1cD0".toLowerCase();
    //pk 27f0df3dac6fc312f2a948cb2ee3eab2bedf8be43c1171907966de0bcca336fa
    let multivestAddress = "0x2a93489730D18393AFcC67dAD8cFb82e3b501eE1".toLowerCase();
    let owner = "0x484837B65831DE88AB14B0c2795C9693356A1366".toLowerCase();
    let tiers = [
        "5000",
        new BN(20000000).mul(precision).toString(),
        0, 0, 0, 0, 0, startAt,
        new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf(),
    ];

    deployer.then(function () {
        return deployer.deploy(Management);
    }).then(async () => {
        management = await Management.deployed();
        return deployer.deploy(
            PricingStrategy,
            management.address,
            new BigNumber("215.66").multipliedBy(currencyPrecision).valueOf(),
            tiers
        );
    }).then(async () => {
        pricing = await PricingStrategy.deployed();
        return deployer.deploy(
            CLXCrowdsale,
            startAt,
            new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf(),
            management.address
        );
    }).then(async () => {
        crowdsale = await CLXCrowdsale.deployed();
        return deployer.deploy(
            CLXToken,
            management.address
        );
    }).then(async () => {
        token = await CLXToken.deployed();
        return deployer.deploy(
            CLXAllocator,
            "200000000000000000000000000",
            management.address
        );
    }).then(async () => {
       allocator = await CLXAllocator.deployed();
        return deployer.deploy(
            CLXContribution,
            etherHolder,
            management.address
        );
    }).then(async () => {
       forwarder = await CLXContribution.deployed();
        return deployer.deploy(
            MintableCrowdsaleOnSuccessAgent,
            management.address
        );
    }).then(async () => {
       agent = await MintableCrowdsaleOnSuccessAgent.deployed();
        return deployer.deploy(
            CLXReferral,
            management.address
        );
    }).then(async () => {
       referral = await CLXReferral.deployed();
        return deployer.deploy(
            LockupContract,
            management.address
        );
    }).then(async () => {
        lockupContract = await LockupContract.deployed();
        return deployer.deploy(
            CLXStats,
            management.address
        );
    }).then(async () => {
       stats = await CLXStats.deployed();
    }).then(async () => {

        await management.registerContract(CONTRACT_TOKEN, token.address)
        await management.registerContract(CONTRACT_PRICING, pricing.address)
        await management.registerContract(CONTRACT_ALLOCATOR, allocator.address)
        await management.registerContract(CONTRACT_FORWARDER, forwarder.address)
        await management.registerContract(CONTRACT_AGENT, agent.address)
        await management.registerContract(CONTRACT_CROWDSALE, crowdsale.address)
        await management.registerContract(CONTRACT_LOCKUP, lockupContract.address)
        await management.registerContract(CONTRACT_REFERRAL, referral.address)

        await management.setPermission(crowdsale.address, CAN_UPDATE_STATE, true);
        await management.setPermission(allocator.address, CAN_MINT_TOKENS, true);

        await crowdsale.updateState()

        await management.setPermission(multivestAddress, EXTERNAL_CONTRIBUTORS, true);
        await management.setPermission(multivestAddress, SIGNERS, true);
        await management.setPermission(owner, CAN_INTERACT_WITH_ALLOCATOR, true);
        await management.setPermission(crowdsale.address, CAN_INTERACT_WITH_ALLOCATOR, true);
        await management.setPermission(referral.address, CAN_INTERACT_WITH_ALLOCATOR, true);
        await management.setPermission(crowdsale.address, CAN_ALLOCATE_REFERRAL_TOKENS, true);

        await management.setPermission(crowdsale.address, CAN_LOCK_TOKENS, true);
        await management.setPermission(allocator.address, CAN_LOCK_TOKENS, true);
        await management.setPermission(referral.address, CAN_LOCK_TOKENS, true);
        await management.setPermission(owner, CAN_LOCK_TOKENS, true);

        await management.setPermission(multivestAddress, CAN_SET_WHITELISTED, true);
        await management.setPermission(owner, WHITELISTED, true);
        await management.setPermission(owner, CAN_BURN_TOKENS, true);

        await management.transferOwnership(owner);
        await token.transferOwnership(owner);
        await pricing.transferOwnership(owner);
        await allocator.transferOwnership(owner);
        await forwarder.transferOwnership(owner);
        await crowdsale.transferOwnership(owner);
        await referral.transferOwnership(owner);
        await stats.transferOwnership(owner);
    }).then(() => {
        console.log("Finished");
        console.log("CONTRACT_MANAGMENT", management.address.toLowerCase());
        console.log("CONTRACT_TOKEN", token.address.toLowerCase());
        console.log("CONTRACT_PRICING", pricing.address.toLowerCase());
        console.log("CONTRACT_ALLOCATOR", allocator.address.toLowerCase());
        console.log("CONTRACT_FORWARDER", forwarder.address.toLowerCase());
        console.log("CONTRACT_AGENT", agent.address.toLowerCase());
        console.log("CONTRACT_CROWDSALE", crowdsale.address.toLowerCase());
        console.log("CONTRACT_REFERRAL", referral.address.toLowerCase());
        console.log("CONTRACT_STATS", stats.address.toLowerCase());

        console.log("etherHolder", etherHolder);
        console.log("multivestAddress", multivestAddress);
        console.log("owner", owner);
    }) .catch((err) => {
        console.error("ERROR", err)
    });
};