require('@openzeppelin/test-helpers');
const {constants, expectEvent, expectRevert, BN} = require('@openzeppelin/test-helpers');
const Utils = require("./utils");
const {ZERO_ADDRESS} = constants;
const BigNumber = require('bignumber.js');
let other, otherSecond, signAddress, etherHolder;
const {expect} = require('chai');
const abi = require("ethereumjs-abi");
const ethUtil = require('ethereumjs-util');
const PricingStrategy = artifacts.require("./CLIPricingStrategy.sol");
const Referral = artifacts.require("./CLIReferral.sol");
const LockupContract = artifacts.require("./LockupContract.sol");
const Management = artifacts.require("./managment/Management.sol");
const CLICrowdsale = artifacts.require("./CLICrowdsale.sol");
const CLIToken = artifacts.require("./CLIToken.sol");
const CLIContribution = artifacts.require("./CLIContribution.sol");
const MintableCrowdsaleOnSuccessAgent = artifacts.require("./agent/MintableCrowdsaleOnSuccessAgent.sol");
const CLIAllocator = artifacts.require("./CLIAllocator.sol");
const Stats = artifacts.require("./CLIStats.sol");

const initialSupply = new BigNumber('1000000000000000000').toString();
const GAS_LIMIT = 60000;
const GAS_LIMIT_TRANSFER = 80000;
const GAS_LIMIT_TRANSFER_FROM = 100000;
const GAS_LIMIT_FREEZE = 90000;
const GAS_LIMIT_PURCHASE = 900000;
const GAS_LIMIT_ALLOCATION = 1000000;
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

let startAt, tiers;
let contr = {};
contract('Contribution', function ([_, owner, ...otherAccounts]) {

    async function generateVRS(instance, signerPrivateKey,  address) {
        'use strict';
        var h = web3.utils.soliditySha3(
            {t: 'address', v: instance.address}, {t:"address", v:address}
            );
        const prefix = Buffer.from('\x19Ethereum Signed Message:\n');
        const prefixedMsg = ethUtil.keccak(
            Buffer.concat([prefix, Buffer.from(h)])
        );

        const {v, r, s} = ethUtil.ecsign(
            Buffer.from(prefixedMsg, 'hex'),
            Buffer.from(signerPrivateKey, 'hex')
        );
        var data = web3.eth.abi.encodeFunctionCall({
            name: 'contribute',
            type: 'function',
            inputs: [{
                type: 'uint8',
                name: '_v'
            },{
                type: 'bytes32',
                name: '_r'
            },{
                type: 'bytes32',
                name: '_s'
            }]
        }, [v, ethUtil.bufferToHex(r), ethUtil.bufferToHex(s)]);
        console.log({v, r: ethUtil.bufferToHex(r), s:ethUtil.bufferToHex(s)});
        console.log({data});

    }

    async function makeTransaction(instance, sign, address, wei) {
        'use strict';
        var h = web3.utils.soliditySha3({t: 'address', v: instance.address}, {t:"address", v:address});
        var sig = await web3.eth.sign(h, sign);
        sig = sig.slice(2);
        var r = `0x${sig.slice(0, 64)}`
        var s = `0x${sig.slice(64, 128)}`
        var v = web3.utils.toDecimal(sig.slice(128, 130)) + 27;
        var data = web3.eth.abi.encodeFunctionCall({
            name: 'contribute',
            type: 'function',
            inputs: [{
                type: 'uint8',
                name: '_v'
            },{
                type: 'bytes32',
                name: '_r'
            },{
                type: 'bytes32',
                name: '_s'
            }]
        }, [v, r, s]);
console.log({v, r, s});

        // return web3.eth.sendTransaction({from:address, to: instance.address, data: data, value: wei, gas: 0x47E7C4});
    }

    beforeEach(async function () {

        other = otherAccounts[0];
        otherSecond = otherAccounts[1];
        signAddress = otherAccounts[2];
        etherHolder = otherAccounts[3];
        startAt = parseInt(new Date().getTime() / 1000);
        tiers = [
            "5000",
            '20000000000000000000000000',
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
        contr.crowdsale = await CLICrowdsale.new(
            startAt,
            new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf(),
            contr.management.address,
            {from: owner}
        );

        contr.token = await CLIToken.new(contr.management.address, {from: owner});

        expect(await contr.token.totalSupply()).to.be.bignumber.equal('151000000000000000'
        );
        contr.allocator = await CLIAllocator.new(
            '200000000000000000000000000',
            contr.management.address,
            {from: owner}
        );

        contr.forwarder = await CLIContribution.new(
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
        await contr.management.setPermission(signAddress, SIGNERS, true, {from: owner});
        await contr.management.setPermission(owner, CAN_INTERACT_WITH_ALLOCATOR, true, {from: owner});
        await contr.management.setPermission(contr.crowdsale.address, CAN_INTERACT_WITH_ALLOCATOR, true, {from: owner});
        await contr.management.setPermission(contr.referral.address, CAN_INTERACT_WITH_ALLOCATOR, true, {from: owner});
        await contr.management.setPermission(contr.crowdsale.address, CAN_ALLOCATE_REFERRAL_TOKENS, true, {from: owner});

        await contr.management.setPermission(contr.crowdsale.address, CAN_LOCK_TOKENS, true, {from: owner});
        await contr.management.setPermission(contr.allocator.address, CAN_LOCK_TOKENS, true, {from: owner});
        await contr.management.setPermission(contr.referral.address, CAN_LOCK_TOKENS, true, {from: owner});
        await contr.management.setPermission(owner, CAN_LOCK_TOKENS, true, {from: owner});

        await contr.management.setPermission(signAddress, CAN_SET_WHITELISTED, true, {from: owner});
        await contr.management.setWhitelisted(other, true, {from: signAddress});
    });
/*
    it("if contribution more than 100k should add to  saft agreement (external contribution)", async function () {
        await Utils.checkState({crowdsale: contr.crowdsale}, {
            crowdsale: {
                startDate: startAt,
                endDate: new BigNumber(startAt).plus(6*MONTH_IN_SECONDS).valueOf(),
                currentState: 3,
                tokensSold: 0,
                bonusProduced: 0,
                safeAgreementThreshold: '10000000000',
                seedMaxSupply: '20000000000000000000000000'
            }
        });

        await contr.crowdsale.updateState()
            .then(Utils.receiptShouldSucceed);

        await contr.crowdsale.externalContribution(
            other,
            new BigNumber('100000').multipliedBy(currencyPrecision).valueOf(),
            {from:signAddress}
        )
            .then(Utils.receiptShouldSucceed);
        console.log('---',await contr.crowdsale.userSafeAgreementsList.call(0));
        await Utils.checkState({crowdsale: contr.crowdsale}, {
            crowdsale: {
                startDate: startAt,
                endDate: new BigNumber(startAt).plus(6*MONTH_IN_SECONDS).valueOf(),
                currentState: 3,
                tokensSold: '2000000000000000000000000',
                bonusProduced: 0,
                safeAgreementThreshold: '10000000000',
                seedMaxSupply: '20000000000000000000000000',
                userSafeAgreementExist: [
                    {[other]: true},
                    {[otherSecond]: false},
                ],
                collectedCurrency: new BigNumber('100000').multipliedBy(currencyPrecision).valueOf(),
            }
        });
    });

    it("if contribution more than 100k but not in one payment  shouldn`t add to  saft agreement", async function () {
        await Utils.checkState({crowdsale: contr.crowdsale}, {
            crowdsale: {
                startDate: startAt,
                endDate: new BigNumber(startAt).plus(6*MONTH_IN_SECONDS).valueOf(),
                currentState: 3,
                tokensSold: 0,
                bonusProduced: 0,
                safeAgreementThreshold: '10000000000',
                seedMaxSupply: '20000000000000000000000000'
            }
        });

        await contr.crowdsale.externalContribution(
            otherSecond,
            new BigNumber('50000').multipliedBy(currencyPrecision).valueOf(),
            {from:signAddress}
        )
            .then(Utils.receiptShouldSucceed);

        await contr.crowdsale.externalContribution(
            otherSecond,
            new BigNumber('48000').multipliedBy(currencyPrecision).valueOf(),
            {from:signAddress}
        )
            .then(Utils.receiptShouldSucceed);
        await makeTransaction(contr.crowdsale, signAddress, otherSecond, web3.utils.toWei("15", "ether"))

        await Utils.checkState({crowdsale: contr.crowdsale}, {
            crowdsale: {
                startDate: startAt,
                endDate: new BigNumber(startAt).plus(6*MONTH_IN_SECONDS).valueOf(),
                currentState: 3,
                tokensSold: '2011552000000000000000000',
                bonusProduced: 0,
                safeAgreementThreshold: '10000000000',
                seedMaxSupply: '20000000000000000000000000',
                userSafeAgreementExist: [
                    {[other]: false},
                    {[otherSecond]: false},
                ],
                collectedCurrency: new BigNumber('100577.6').multipliedBy(currencyPrecision).valueOf(),
            }
        });
    });

    it("should allocate referral tokens if user has referrer", async function () {
        await Utils.checkState({crowdsale: contr.crowdsale}, {
            crowdsale: {
                startDate: startAt,
                endDate: new BigNumber(startAt).plus(6*MONTH_IN_SECONDS).valueOf(),
                currentState: 3,
                tokensSold: 0,
                bonusProduced: 0,
                safeAgreementThreshold: '10000000000',
                seedMaxSupply: '20000000000000000000000000'
            }
        });

        await contr.referral.registerRefererForAddress(other,otherSecond,{from: signAddress});

        await makeTransaction(contr.crowdsale, signAddress, other, web3.utils.toWei("10", "ether"))

        assert.equal(
            new BigNumber(await contr.token.balanceOf.call(other)).valueOf(),
            new BigNumber('34368').multipliedBy(precision).valueOf(),
            "balance is on equal"
        );
        assert.equal(
            new BigNumber(await contr.token.balanceOf.call(otherSecond)).valueOf(),
            new BigNumber('1374.72').multipliedBy(precision).valueOf(),
            "balance is on equal"
        );
        assert.equal(
            new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                otherSecond,
                new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                new BigNumber('1374.72').multipliedBy(precision)
            )).valueOf(),
            new BigNumber('343.68').multipliedBy(precision).valueOf(),
            'unlocked is not equal'
        );
        assert.equal(
            new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                other,
                new BigNumber(startAt).valueOf(),
                new BigNumber('34368').multipliedBy(precision)
            )).valueOf(),
            new BigNumber('8592').multipliedBy(precision).valueOf(),
            'unlocked is not equal'
        );
        await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
            {
                from: owner
            })
        assert.equal(
            new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                otherSecond,
                new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                new BigNumber('1374.72').multipliedBy(precision)
            )).valueOf(),
            new BigNumber('687.36').multipliedBy(precision).valueOf(),
            'unlocked is not equal'
        );
        assert.equal(
            new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                other,
                new BigNumber(startAt).valueOf(),
                new BigNumber('34368').multipliedBy(precision)
            )).valueOf(),
            new BigNumber('8592').multipliedBy(precision).valueOf(),
            'unlocked is not equal'
        );
    });
*/
    describe('CLIAllocator',  async () => {
        beforeEach(async function () {
            await contr.allocator.allocateRequiredTokensToHolders({from:owner});
        });
        it("test state", async () => {
            await Utils.checkState({token: contr.token}, {
                token: {
                    balanceOf: [
                        {['0xd5249aB86Ef7cE0651DF1b111E607f59950514c3']: web3.utils.toWei("20000000", "ether")},
                        {['0x38069DD2C6D385a7dE7dbB90eF74E23B12D124e3']: web3.utils.toWei("5200000", "ether")},
                        {['0xA210F19b4C1c52dB213f88fdCA76fD83859052FA']: web3.utils.toWei("25000000", "ether")},
                        {['0x5d6019C130158FC00bc4Dc1edc949Fa84b8ad098']: web3.utils.toWei("8000000", "ether")},
                        {['0x880574A5b701e017C254840063DFBd1f59dF9a15']: web3.utils.toWei("10000000", "ether")},
                        {['0x1e2Ce74Bc0a9A9fB2D6b3f630d585E0c00FF66B0']: web3.utils.toWei("25000000", "ether")},
                        {['0xD4184B19170af014c595EF0b0321760d89918B95']: web3.utils.toWei("24000000", "ether")},
                        {['0x9ED362b5A8aF29CBC06548ba5C2f40978ca48Ec1']: web3.utils.toWei("60000000", "ether")},
                        {['0x63e638d15462037161003a6083A9c4AeD50f8F73']: web3.utils.toWei("2000000", "ether")},
                    ],
                }
            });
             expect(await contr.token.totalSupply()).to.be.bignumber.equal(
                 web3.utils.toWei('179200000.151', "ether")
             );
            await expectRevert( contr.allocator.allocateRequiredTokensToHolders({from:owner}),'ERROR_NOT_AVAILABLE')

        });

        it("check locking periods strategicPartners", async () =>{
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xd5249aB86Ef7cE0651DF1b111E607f59950514c3',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('20000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('20000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
                {
                    from: owner
                })
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xd5249aB86Ef7cE0651DF1b111E607f59950514c3',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('20000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('20000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
        it("check locking periods promotionsBounty", async () =>{

            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x38069DD2C6D385a7dE7dbB90eF74E23B12D124e3',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('5200000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
                {
                    from: owner
                })
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x38069DD2C6D385a7dE7dbB90eF74E23B12D124e3',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('5200000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    "0x38069DD2C6D385a7dE7dbB90eF74E23B12D124e3",
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('5200000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('5200000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    "0x38069DD2C6D385a7dE7dbB90eF74E23B12D124e3",
                    new BigNumber(startAt).plus(7 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('5200000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('5200000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
        it("check locking periods shareholders", async () =>{

            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xA210F19b4C1c52dB213f88fdCA76fD83859052FA',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
                {
                    from: owner
                })
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xA210F19b4C1c52dB213f88fdCA76fD83859052FA',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xA210F19b4C1c52dB213f88fdCA76fD83859052FA',
                    new BigNumber(startAt).plus(13 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('10000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
        it("check locking periods advisors", async () =>{

            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x5d6019C130158FC00bc4Dc1edc949Fa84b8ad098',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('8000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
                {
                    from: owner
                })

            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x5d6019C130158FC00bc4Dc1edc949Fa84b8ad098',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('8000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('8000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
        it("check locking periods pharmaIndustrialTrials", async () =>{
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x880574A5b701e017C254840063DFBd1f59dF9a15',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('10000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
                {
                    from: owner
                })

            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x880574A5b701e017C254840063DFBd1f59dF9a15',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('10000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.allocator.unlockManuallyLockedBalances(
                '0x880574A5b701e017C254840063DFBd1f59dF9a15',{from: owner}
                );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x880574A5b701e017C254840063DFBd1f59dF9a15',
                    new BigNumber(startAt).plus(0 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('10000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('10000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
        it("check locking periods managementTeam", async () =>{

            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x1e2Ce74Bc0a9A9fB2D6b3f630d585E0c00FF66B0',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('5000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
                {
                    from: owner
                })
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x1e2Ce74Bc0a9A9fB2D6b3f630d585E0c00FF66B0',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('10000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x1e2Ce74Bc0a9A9fB2D6b3f630d585E0c00FF66B0',
                    new BigNumber(startAt).plus(13 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('15000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x1e2Ce74Bc0a9A9fB2D6b3f630d585E0c00FF66B0',
                    new BigNumber(startAt).plus(23 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('15000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x1e2Ce74Bc0a9A9fB2D6b3f630d585E0c00FF66B0',
                    new BigNumber(startAt).plus(24 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('20000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
        it("check locking periods teamIncentive", async () =>{
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xD4184B19170af014c595EF0b0321760d89918B95',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('24000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
                {
                    from: owner
                })

            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xD4184B19170af014c595EF0b0321760d89918B95',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('24000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.allocator.unlockManuallyLockedBalances(
                '0xD4184B19170af014c595EF0b0321760d89918B95',{from: owner}
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xD4184B19170af014c595EF0b0321760d89918B95',
                    new BigNumber(startAt).plus(0 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('24000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('24000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
        it("check locking periods applicature", async () =>{
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x63e638d15462037161003a6083A9c4AeD50f8F73',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('2000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('500000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
                {
                    from: owner
                })

            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x63e638d15462037161003a6083A9c4AeD50f8F73',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('2000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('1000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
/*
        it("check publicSaleTokensAmount", async () =>{
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x9ED362b5A8aF29CBC06548ba5C2f40978ca48Ec1',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('60000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('60000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.crowdsale.updateState()
                .then(Utils.receiptShouldSucceed);

            await contr.crowdsale.externalContribution(
                other,
                new BigNumber('100').multipliedBy(currencyPrecision).valueOf(),
                {from:signAddress}
            )
                .then(Utils.receiptShouldSucceed);

            await Utils.checkState({crowdsale: contr.crowdsale}, {
                crowdsale: {
                    startDate: startAt,
                    endDate: new BigNumber(startAt).plus(6*MONTH_IN_SECONDS).valueOf(),
                    currentState: 3,
                    tokensSold: '2000000000000000000000',
                    bonusProduced: 0,
                    seedMaxSupply: '20000000000000000000000000',
                    collectedCurrency: new BigNumber('100').multipliedBy(currencyPrecision).valueOf(),
                }
            });


            expect(await contr.token.totalSupply()).to.be.bignumber.equal('179202000000000000000000000');
            await contr.pricing.updateDates(
                0,
                startAt,
                new BigNumber(startAt).plus(1).valueOf(),
                {from:owner}
            ) .then(Utils.receiptShouldSucceed);

            await contr.crowdsale.discardUnsoldTokens()
                .then(Utils.receiptShouldSucceed);
            assert.equal(
                new BigNumber(await contr.token.balanceOf.call(
                    '0x9ED362b5A8aF29CBC06548ba5C2f40978ca48Ec1'
                )).valueOf(),
                new BigNumber('60000000').multipliedBy(precision).plus('9999000000000000000000000').valueOf(),
                'balance is not equal'
            );
        });

 */
    });
});
