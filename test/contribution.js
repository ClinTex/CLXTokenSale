require('@openzeppelin/test-helpers');
const {constants, expectEvent, expectRevert, BN} = require('@openzeppelin/test-helpers');
const Utils = require("./utils");
const {ZERO_ADDRESS} = constants;
const BigNumber = require('bignumber.js');
let other, otherSecond, signAddress, etherHolder;
const {expect} = require('chai');
const PricingStrategy = artifacts.require("./XCLPricingStrategy.sol");
const Referral = artifacts.require("./XCLReferral.sol");
const LockupContract = artifacts.require("./LockupContract.sol");
const Management = artifacts.require("./managment/Management.sol");
const XCLCrowdsale = artifacts.require("./tests/CrowdsaleTest.sol");
const XCLToken = artifacts.require("./XCLToken.sol");
const XCLContribution = artifacts.require("./tests/ContributionTest.sol");
const MintableCrowdsaleOnSuccessAgent = artifacts.require("./agent/MintableCrowdsaleOnSuccessAgent.sol");
const XCLAllocator = artifacts.require("./XCLAllocator.sol");
const Stats = artifacts.require("./XCLStats.sol");
const initialSupply = new BigNumber('1000000000000000000').toString();
const GAS_LIMIT = 60000;
const GAS_LIMIT_TRANSFER = 80000;
const GAS_LIMIT_TRANSFER_FROM = 100000;
const GAS_LIMIT_FREEZE = 90000;
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

let startAt, tiers;
let contr = {};
contract('Contribution', function ([_, owner, ...otherAccounts]) {

    beforeEach(async function () {

        other = otherAccounts[0];
        otherSecond = otherAccounts[1];
        signAddress = otherAccounts[2];
        etherHolder = otherAccounts[3];
        startAt = parseInt(new Date().getTime() / 1000);
        tiers = [
            "5000",
            '200000000000000000000000000',
            "0", "0", "0", "0", "0",
            startAt,
            new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf()
        ];
        contr.management = await Management.new({from: owner});
        contr.pricing = await PricingStrategy.new(
            contr.management.address,
            new BigNumber("171.84").multipliedBy(currencyPrecision).valueOf(),
            tiers,
            {from: owner}
        );
        contr.crowdsale = await XCLCrowdsale.new(
            startAt,
            new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf(),
            contr.management.address,
            {from: owner}
        );

        contr.token = await XCLToken.new(contr.management.address, {from: owner});

        contr.allocator = await XCLAllocator.new(
            '200000000000000000000000000',
            contr.management.address,
            {from: owner}
        );

        contr.forwarder = await XCLContribution.new(
            etherHolder,
            contr.management.address,
            {from: owner}
        );

        contr.agent = await MintableCrowdsaleOnSuccessAgent.new(
            contr.management.address,
            {from: owner}
        );
        contr.referral = await Referral.new(contr.management.address, {from: owner});
        contr.lockupContract = await LockupContract.new(contr.management.address, {from: owner});

        contr.stats = await Stats.new(contr.management.address, {from: owner});

        await contr.management.registerContract(CONTRACT_TOKEN, contr.token.address, {from: owner})
        await contr.management.registerContract(CONTRACT_PRICING, contr.pricing.address, {from: owner})
        await contr.management.registerContract(CONTRACT_ALLOCATOR, contr.allocator.address, {from: owner})
        await contr.management.registerContract(CONTRACT_FORWARDER, contr.forwarder.address, {from: owner})
        await contr.management.registerContract(CONTRACT_AGENT, contr.agent.address, {from: owner})
        await contr.management.registerContract(CONTRACT_CROWDSALE, contr.crowdsale.address, {from: owner})
        await contr.management.registerContract(CONTRACT_LOCKUP, contr.lockupContract.address, {from: owner})
        await contr.management.registerContract(CONTRACT_REFERRAL, contr.referral.address, {from: owner})

        await contr.management.setPermission(contr.crowdsale.address, CAN_UPDATE_STATE, true, {from: owner});
        await contr.management.setPermission(contr.allocator.address, CAN_MINT_TOKENS, true, {from: owner});

        await contr.crowdsale.updateState({from: owner})

        await contr.management.setPermission(signAddress, EXTERNAL_CONTRIBUTORS, true, {from: owner});
        await contr.management.setPermission(contr.crowdsale.address, CAN_INTERACT_WITH_ALLOCATOR, true, {from: owner});
        await contr.management.setPermission(contr.referral.address, CAN_INTERACT_WITH_ALLOCATOR, true, {from: owner});
        await contr.management.setPermission(contr.crowdsale.address, CAN_ALLOCATE_REFERRAL_TOKENS, true, {from: owner});

        await contr.management.setPermission(contr.crowdsale.address, CAN_LOCK_TOKENS, true, {from: owner});
        await contr.management.setPermission(contr.allocator.address, CAN_LOCK_TOKENS, true, {from: owner});

        await contr.management.setPermission(signAddress, CAN_SET_WHITELISTED, true, {from: owner});
        await contr.management.setWhitelisted(other, true, {from: signAddress});
    });


    it('should return the correct name', async function () {
        let name = await contr.token.name();
        assert.equal(name, "ClinTex");
    });

    it("check state | forward | recordContribution", async () => {
        console.log(contr.pricing.address);
        await Utils.checkState({forwarder: contr.forwarder}, {
            forwarder: {
                // receiver: etherHolder,
                weiCollected: 0,
                weiForwarded: 0
            }
        });

        assert.equal(
            new BigNumber(await Utils.getEtherBalance(contr.forwarder.address)).toNumber(),
            0,
            "getBalance is not equal"
        );

        await contr.forwarder.recordContribution(
            other,
            new BigNumber('1').multipliedBy(currencyPrecision).valueOf(),
            0,
            new BigNumber('100').multipliedBy(precision).valueOf(),
            0
        )
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        //----------------------------------------------
        await contr.crowdsale.externalContribution(
            other,
            new BigNumber('100').multipliedBy(currencyPrecision).valueOf(),
            {from: signAddress}
        )
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({forwarder: contr.forwarder}, {
            forwarder: {
                receiver: etherHolder,
                weiCollected: 0,
                weiForwarded: 0
            }
        });

        let contributionTime = parseInt(new Date().getTime() / 1000);

        await contr.forwarder.testUpdateDate(0, contributionTime);

        let contribution = await contr.forwarder.contributions.call(0);
        assert.equal(contribution.contributor, other, "other is not equal");
        assert.equal(contribution.weiAmount, 0, "weiAmount is not equal");
        assert.equal(
            contribution.currencyAmount,
            new BigNumber('100').multipliedBy(currencyPrecision).valueOf(),
            "currencyAmount is not equal"
        );
        assert.equal(
            new BigNumber(contribution.tokensAmount).valueOf(),
            new BigNumber('2000').multipliedBy(precision).valueOf(),
            "tokensAmount is not equal"
        );
        assert.equal(contribution.timestamp, contributionTime, "timestamp is not equal");
        assert.equal(contribution.referralTokensSent, 0, "referralTokensSent is not equal");

        //----------------------------------------------
        //----------------------------------------------

        await contr.management.setPermission(other, WHITELISTED, true, {from: owner});
        await contr.crowdsale.sendTransaction({
            from: other,
            value: web3.utils.toWei("5", "ether")
        })
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({forwarder: contr.forwarder}, {
            forwarder: {
                receiver: etherHolder,
                weiCollected: web3.utils.toWei("5", "ether"),
                weiForwarded: web3.utils.toWei("5", "ether")
            }
        });

        contributionTime = parseInt(new Date().getTime() / 1000);

        await contr.forwarder.testUpdateDate(1, contributionTime);

        contribution = await contr.forwarder.contributions.call(1);

        assert.equal(contribution.contributor, other, "other is not equal");
        assert.equal(contribution.weiAmount, web3.utils.toWei("5", "ether"), "weiAmount is not equal");
        assert.equal(contribution.currencyAmount, new BigNumber('859.2').multipliedBy(currencyPrecision).valueOf(), "currencyAmount is not equal");
        assert.equal(contribution.tokensAmount, new BigNumber('17184').multipliedBy(precision).toNumber(), "tokensAmount is not equal");
        assert.equal(contribution.timestamp, contributionTime, "timestamp is not equal");

        //----------------------------------------------
    });
  
});
