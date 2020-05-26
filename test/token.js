const PricingStrategy = artifacts.require("./CLIPricingStrategy.sol");
const Referral = artifacts.require("./CLIReferral.sol");
const LockupContract = artifacts.require("./LockupContract.sol");
const Management = artifacts.require("./managment/Management.sol");
const CLICrowdsale = artifacts.require("./tests/CrowdsaleTest.sol");
const CLIToken = artifacts.require("./CLIToken.sol");
const CLIContribution = artifacts.require("./tests/ContributionTest.sol");
const MintableCrowdsaleOnSuccessAgent = artifacts.require("./agent/MintableCrowdsaleOnSuccessAgent.sol");
const CLIAllocator = artifacts.require("./CLIAllocator.sol");
const Stats = artifacts.require("./CLIStats.sol");

const Utils = require("./utils");
const BigNumber = require('bignumber.js');
const BN = require('bn.js');
const precision = new BigNumber('1000000000000000000').valueOf();
const currencyPrecision = new BigNumber('100000').valueOf();

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
const ECLIUDED_ADDRESSES = 8;
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

contract('Token', function (accounts) {

    let pricing,
        management,
        crowdsale,
        token,
        allocator,
        forwarder,
        agent,
        referral,
        lockupContract,
        stats;

    const owner = accounts[0];
    const signAddress = accounts[0];
    const notOwner = accounts[1];
    const etherHolder = accounts[9];
    const externalContributor = accounts[2];
    const contributor = accounts[4];
    const contributor2 = accounts[5];
    const contributor3 = accounts[6];
    const totalSupply = '200000000000000000000000000';

    let startAt;
    let tiers;

    beforeEach(async function () {
        startAt = parseInt(new Date().getTime() / 1000);
        tiers = [
            "5000",
            new BigNumber("20000000").multipliedBy(precision),
            "0", "0", "0", "0", "0",
            startAt,
            new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf()
        ];
        management = await Management.new();
        pricing = await PricingStrategy.new(
            management.address,
            new BigNumber("171.84").multipliedBy(currencyPrecision).valueOf(),
            tiers
        );
        crowdsale = await CLICrowdsale.new(
            startAt,
            new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf(),
            management.address
        );

        token = await CLIToken.new(management.address);

        allocator = await CLIAllocator.new('200000000000000000000000000', management.address);

        forwarder = await CLIContribution.new(
            etherHolder,
            management.address
        );

        agent = await MintableCrowdsaleOnSuccessAgent.new(management.address);
        referral = await Referral.new(management.address);
        lockupContract = await LockupContract.new(management.address);

        stats = await Stats.new(management.address);

        await management.registerContract(CONTRACT_TOKEN, token.address)
            .then(Utils.receiptShouldSucceed);
        await management.registerContract(CONTRACT_PRICING, pricing.address)
            .then(Utils.receiptShouldSucceed);
        await management.registerContract(CONTRACT_ALLOCATOR, allocator.address)
            .then(Utils.receiptShouldSucceed);
        await management.registerContract(CONTRACT_FORWARDER, forwarder.address)
            .then(Utils.receiptShouldSucceed);
        await management.registerContract(CONTRACT_AGENT, agent.address)
            .then(Utils.receiptShouldSucceed);
        await management.registerContract(CONTRACT_CROWDSALE, crowdsale.address)
            .then(Utils.receiptShouldSucceed);

        await management.registerContract(CONTRACT_LOCKUP, lockupContract.address)
            .then(Utils.receiptShouldSucceed);

        await management.registerContract(CONTRACT_REFERRAL, referral.address)
            .then(Utils.receiptShouldSucceed);

        await management.setPermission(crowdsale.address, CAN_UPDATE_STATE, true);
        await management.setPermission(allocator.address, CAN_MINT_TOKENS, true);

        await crowdsale.updateState()
            .then(Utils.receiptShouldSucceed);

        await management.setPermission(accounts[0], EXTERNAL_CONTRIBUTORS, true);
        await management.setPermission(crowdsale.address, CAN_INTERACT_WITH_ALLOCATOR, true);
        await management.setPermission(referral.address, CAN_INTERACT_WITH_ALLOCATOR, true);
        await management.setPermission(crowdsale.address, CAN_ALLOCATE_REFERRAL_TOKENS, true);

        await management.setPermission(crowdsale.address, CAN_LOCK_TOKENS, true);
        await management.setPermission(allocator.address, CAN_LOCK_TOKENS, true);

        await management.setPermission(signAddress, CAN_SET_WHITELISTED, true);
        await management.setWhitelisted(notOwner, true);
    });

    it("deploy contract & check main flow", async function () {
        await assert.equal(
            new BigNumber(await token.balanceOf.call(accounts[1])).valueOf(),
            new BigNumber(0).multipliedBy(precision).valueOf(),
            'balance is not equal'
        );
        await assert.equal(
            new BigNumber(
                await pricing.getCurrencyAmount.call(
                    new BigNumber('1').multipliedBy(precision).valueOf()
                )).valueOf(),
            new BigNumber("171.84").multipliedBy(currencyPrecision).valueOf(),
            'currency amount is not equal'
        );
//(17184000*10^18)/(0.05*10^5)
        await assert.equal(
            new BigNumber(
                await pricing.calculateTokensByCurrency.call(
                    0,
                    new BigNumber("171.84").multipliedBy(currencyPrecision).valueOf()
                )).valueOf(),
            new BigNumber("3436800000000000000000").valueOf(),
            'Tokens is not equal'
        );

        await crowdsale.sendTransaction({value: new BigNumber('1').multipliedBy(precision).valueOf(), from: accounts[1]})
            .then(Utils.receiptShouldSucceed);
        await assert.equal(
            new BigNumber(await token.balanceOf.call(accounts[1])).valueOf(),
            new BigNumber('3436.8').multipliedBy(precision).valueOf(),
            'balance is not equal'
        );
    });
});