require('@openzeppelin/test-helpers');
const {constants, expectEvent, expectRevert, BN} = require('@openzeppelin/test-helpers');
const Utils = require("./utils");
const {ZERO_ADDRESS} = constants;
const BigNumber = require('bignumber.js');
let other, otherSecond, signAddress, etherHolder;
const {expect} = require('chai');
const abi = require("ethereumjs-abi");
const ethUtil = require('ethereumjs-util');
const PricingStrategy = artifacts.require("./XCLPricingStrategy.sol");
const Referral = artifacts.require("./XCLReferral.sol");
const LockupContract = artifacts.require("./LockupContract.sol");
const Management = artifacts.require("./managment/Management.sol");
const XCLCrowdsale = artifacts.require("./XCLCrowdsale.sol");
const XCLToken = artifacts.require("./XCLToken.sol");
const XCLContribution = artifacts.require("./XCLContribution.sol");
const MintableCrowdsaleOnSuccessAgent = artifacts.require("./agent/MintableCrowdsaleOnSuccessAgent.sol");
const XCLAllocator = artifacts.require("./XCLAllocator.sol");
const Stats = artifacts.require("./XCLStats.sol");

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

    it("check contribution with sign", async function () {
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
        //
        // await contr.crowdsale.externalContribution(
        //     other,
        //     new BigNumber('100').multipliedBy(currencyPrecision).valueOf(),
        //     {from:signAddress}
        // )
        //     .then(Utils.receiptShouldSucceed);

        await Utils.sendTransaction(
            contr.crowdsale, other, web3.utils.toWei("0.01", "ether"),

        )
        /*
        // assert.equal(
        //     new BigNumber(await contr.token.balanceOf.call(other)).valueOf(),
        //     new BigNumber('34368000000000000000').valueOf(),
        //     "balance is on equal"
        // );

         */
        // await expectRevert(
        //     makeTransaction(contr.crowdsale, otherSecond, other, web3.utils.toWei("1", "ether")),
        //     'ERROR_ACCESS_DENIED'
        //     );
        //
        const obj ={
            address: '0x59d8e848023db12322e5af4d6eb959dfda97ba0c'
        }
        let transfer = await makeTransaction(
            obj,
            owner,
            '0x4dd93664e39fbb2a229e6a88eb1da53f4ccc88ac',
            web3.utils.toWei("0.01", "ether")
        )


console.log('--------');
        await generateVRS(
            obj,
            '27f0df3dac6fc312f2a948cb2ee3eab2bedf8be43c1171907966de0bcca336fa',
            '0x4dd93664e39fbb2a229e6a88eb1da53f4ccc88ac'
        );
        // expect(transfer.gasUsed).to.be.below(GAS_LIMIT_PURCHASE);
        //
        //
        // await contr.pricing.updateDates(
        //     0,
        //     startAt,
        //     new BigNumber(startAt).plus(3600),
        //     {from:owner}
        // );
        //
        // await Utils.checkState({crowdsale: contr.crowdsale}, {
        //     crowdsale: {
        //         startDate: startAt,
        //         endDate: new BigNumber(startAt).plus(6*MONTH_IN_SECONDS).valueOf(),
        //         currentState: 3,
        //         tokensSold: '5436800000000000000000',
        //         bonusProduced: 0,
        //         seedMaxSupply: '20000000000000000000000000',
        //         collectedCurrency: new BigNumber('271.84').multipliedBy(currencyPrecision).valueOf(),
        //     }
        // });
        //
        // await makeTransaction(contr.crowdsale, signAddress, other, web3.utils.toWei("1", "ether"))
        //
        // await Utils.checkState({crowdsale: contr.crowdsale}, {
        //     crowdsale: {
        //         startDate: startAt,
        //         endDate: new BigNumber(startAt).plus(3600).valueOf(),
        //         currentState: 3,
        //         tokensSold: '8873600000000000000000',
        //         bonusProduced: 0,
        //         seedMaxSupply: '20000000000000000000000000',
        //         collectedCurrency: new BigNumber('443.68').multipliedBy(currencyPrecision).valueOf(),
        //     }
        // });

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

    describe('XCLAllocator',  async () => {
        beforeEach(async function () {
            await contr.allocator.allocateRequiredTokensToHolders({from:owner});
        });
        it("test state", async () => {
            await Utils.checkState({token: contr.token}, {
                token: {
                    balanceOf: [
                        {['0xcbE219cbF4A389079F35F75717E8F37FC0674BC3']: web3.utils.toWei("20000000", "ether")},
                        {['0xbA680318Dcff9d1A14994E51AdC281aef3505f55']: web3.utils.toWei("5200000", "ether")},
                        {['0x3414f8c862eD8C931aA5E8f0D43A534057E931a7']: web3.utils.toWei("25000000", "ether")},
                        {['0x868608bB49e3FCbEE36397eEf655983Ac53A1DA4']: web3.utils.toWei("10000000", "ether")},
                        {['0x592F71525076C7a09E953b578034dE6AfFeb98eE']: web3.utils.toWei("10000000", "ether")},
                        {['0x3b7E6021A5f3E7BF98b45857dBC14328b76623b8']: web3.utils.toWei("25000000", "ether")},
                        {['0x5eCAb5e32987D96D2c6007682fBa3639f8F8070f']: web3.utils.toWei("24000000", "ether")},
                        {['0x6c2Cda925236Aab635e0Dbf73D11564403b50c35']: web3.utils.toWei("60000000", "ether")},
                    ],
                }
            });
             expect(await contr.token.totalSupply()).to.be.bignumber.equal(
                 web3.utils.toWei('179200000', "ether")
             );
            await expectRevert( contr.allocator.allocateRequiredTokensToHolders({from:owner}),'ERROR_NOT_AVAILABLE')

        });

        it("check locking periods strategicPartners", async () =>{
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0xcbE219cbF4A389079F35F75717E8F37FC0674BC3',
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
                    '0xcbE219cbF4A389079F35F75717E8F37FC0674BC3',
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
                    '0xbA680318Dcff9d1A14994E51AdC281aef3505f55',
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
                    '0xbA680318Dcff9d1A14994E51AdC281aef3505f55',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('5200000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    "0xbA680318Dcff9d1A14994E51AdC281aef3505f55",
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('5200000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('5200000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    "0xbA680318Dcff9d1A14994E51AdC281aef3505f55",
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
                    '0x3414f8c862eD8C931aA5E8f0D43A534057E931a7',
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
                    '0x3414f8c862eD8C931aA5E8f0D43A534057E931a7',
                    new BigNumber(startAt).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x3414f8c862eD8C931aA5E8f0D43A534057E931a7',
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
                    '0x868608bB49e3FCbEE36397eEf655983Ac53A1DA4',
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
                    '0x868608bB49e3FCbEE36397eEf655983Ac53A1DA4',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('10000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('10000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });
        it("check locking periods pharmaIndustrialTrials", async () =>{
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x592F71525076C7a09E953b578034dE6AfFeb98eE',
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
                    '0x592F71525076C7a09E953b578034dE6AfFeb98eE',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('10000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.allocator.unlockManuallyLockedBalances(
                '0x592F71525076C7a09E953b578034dE6AfFeb98eE',{from: owner}
                );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x592F71525076C7a09E953b578034dE6AfFeb98eE',
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
                    '0x3b7E6021A5f3E7BF98b45857dBC14328b76623b8',
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
                    '0x3b7E6021A5f3E7BF98b45857dBC14328b76623b8',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('10000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x3b7E6021A5f3E7BF98b45857dBC14328b76623b8',
                    new BigNumber(startAt).plus(13 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('15000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x3b7E6021A5f3E7BF98b45857dBC14328b76623b8',
                    new BigNumber(startAt).plus(23 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('25000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('15000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x3b7E6021A5f3E7BF98b45857dBC14328b76623b8',
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
                    '0x5eCAb5e32987D96D2c6007682fBa3639f8F8070f',
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
                    '0x5eCAb5e32987D96D2c6007682fBa3639f8F8070f',
                    new BigNumber(startAt).plus(6 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('24000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('0').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
            await contr.allocator.unlockManuallyLockedBalances(
                '0x5eCAb5e32987D96D2c6007682fBa3639f8F8070f',{from: owner}
            );
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x5eCAb5e32987D96D2c6007682fBa3639f8F8070f',
                    new BigNumber(startAt).plus(0 * MONTH_IN_SECONDS).valueOf(),
                    new BigNumber('24000000').multipliedBy(precision)
                )).valueOf(),
                new BigNumber('24000000').multipliedBy(precision).valueOf(),
                'unlocked is not equal'
            );
        });

        it("check publicSaleTokensAmount", async () =>{
            assert.equal(
                new BigNumber(await contr.lockupContract.getUnlockedBalance.call(
                    '0x6c2Cda925236Aab635e0Dbf73D11564403b50c35',
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
                    '0x6c2Cda925236Aab635e0Dbf73D11564403b50c35'
                )).valueOf(),
                new BigNumber('60000000').multipliedBy(precision).plus('9999000000000000000000000').valueOf(),
                'balance is not equal'
            );
        });
    });

     */
});
