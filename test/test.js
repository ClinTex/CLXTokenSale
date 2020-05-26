require('@openzeppelin/test-helpers');
const { constants, expectEvent, expectRevert, BN } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const BigNumber = require('bignumber.js');
let other,otherSecond, signAddress,etherHolder;
const { expect } = require('chai');
const PricingStrategy = artifacts.require("./CLIPricingStrategy.sol");
const Referral = artifacts.require("./CLIReferral.sol");
const LockupContract = artifacts.require("./LockupContract.sol");
const Management = artifacts.require("./managment/Management.sol");
const CLICrowdsale = artifacts.require("./tests/CrowdsaleTest.sol");
const CLIToken = artifacts.require("./tests/CLITokenTest.sol");
const CLIContribution = artifacts.require("./tests/ContributionTest.sol");
const MintableCrowdsaleOnSuccessAgent = artifacts.require("./agent/MintableCrowdsaleOnSuccessAgent.sol");
const CLIAllocator = artifacts.require("./CLIAllocator.sol");
const Stats = artifacts.require("./CLIStats.sol");
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

let startAt,tiers;
contract('Token', function ([_, owner, ...otherAccounts]) {

    beforeEach(async function() {

        other = otherAccounts[0];
        otherSecond = otherAccounts[1];
        signAddress = otherAccounts[2];
        etherHolder = otherAccounts[3];
        startAt = parseInt(new Date().getTime() / 1000);
        tiers = [
            "5000",
            new BigNumber("20000000").multipliedBy(precision),
            "0", "0", "0", "0", "0",
            startAt,
            new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf()
        ];
        this.management = await Management.new({ from: owner });
        this.pricing = await PricingStrategy.new(
            this.management.address,
            new BigNumber("171.84").multipliedBy(currencyPrecision).valueOf(),
            tiers,
            { from: owner }
        );
        this.crowdsale = await CLICrowdsale.new(
            startAt,
            new BigNumber(startAt).plus(new BigNumber("6").multipliedBy(MONTH_IN_SECONDS)).valueOf(),
            this.management.address,
            { from: owner }
        );

        this.token = await CLIToken.new(this.management.address,{ from: owner });

        this.allocator = await CLIAllocator.new(
            '200000000000000000000000000',
            this.management.address,
            { from: owner }
        );

        this.forwarder = await CLIContribution.new(
            etherHolder,
            this.management.address,
            { from: owner }
        );

        this.agent = await MintableCrowdsaleOnSuccessAgent.new(
            this.management.address,
            { from: owner }
            );
        this.referral = await Referral.new(this.management.address,{ from: owner });
        this.lockupContract = await LockupContract.new(this.management.address, { from: owner });

        this.stats = await Stats.new(this.management.address,{from:owner});

        await this.management.registerContract(CONTRACT_TOKEN, this.token.address,{from:owner})
        await this.management.registerContract(CONTRACT_PRICING, this.pricing.address,{from:owner})
        await this.management.registerContract(CONTRACT_ALLOCATOR, this.allocator.address,{from:owner})
        await this.management.registerContract(CONTRACT_FORWARDER, this.forwarder.address,{from:owner})
        await this.management.registerContract(CONTRACT_AGENT, this.agent.address,{from:owner})
        await this.management.registerContract(CONTRACT_CROWDSALE, this.crowdsale.address,{from:owner})
        await this.management.registerContract(CONTRACT_LOCKUP, this.lockupContract.address,{from:owner})
        await this.management.registerContract(CONTRACT_REFERRAL, this.referral.address,{from:owner})

        await this.management.setPermission(this.crowdsale.address, CAN_UPDATE_STATE, true,{from:owner});
        await this.management.setPermission(this.allocator.address, CAN_MINT_TOKENS, true,{from:owner});

       await this.crowdsale.updateState({from:owner})

        await this.management.setPermission(signAddress, EXTERNAL_CONTRIBUTORS, true,{from:owner});
        await this.management.setPermission(this.crowdsale.address, CAN_INTERACT_WITH_ALLOCATOR, true,{from:owner});
        await this.management.setPermission(this.referral.address, CAN_INTERACT_WITH_ALLOCATOR, true,{from:owner});
        await this.management.setPermission(this.crowdsale.address, CAN_ALLOCATE_REFERRAL_TOKENS, true,{from:owner});

        await this.management.setPermission(this.crowdsale.address, CAN_LOCK_TOKENS, true,{from:owner});
        await this.management.setPermission(this.allocator.address, CAN_LOCK_TOKENS, true,{from:owner});

        await this.management.setPermission(signAddress, CAN_SET_WHITELISTED, true,{from:owner});
        await this.management.setPermission(owner, CAN_BURN_TOKENS, true,{from:owner});
        await this.management.setWhitelisted(other, true,{from:signAddress});
        await this.management.setPermission(owner, CAN_LOCK_TOKENS, true, {from: owner});
    });

    it('should return the correct name', async function() {
        let name = await this.token.name();
        assert.equal(name, "ClinTex");
    });

    it('should return the correct symbol', async function() {
        let symbol = await this.token.symbol();
        assert.equal(symbol, "CLI");
    });

    it('should return the correct decimals', async function() {
        let decimals = await this.token.decimals();
        assert.equal(decimals, 18);
    });

    it('should has correct total supply', async function () {
        expect(await this.token.totalSupply()).to.be.bignumber.equal(new BN('0').toString());
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        expect(await this.token.totalSupply()).to.be.bignumber.equal(initialSupply);

    });

    it('should return correct value with balanceOf', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        expect(await this.token.balanceOf(otherSecond)).to.be.bignumber.equal(initialSupply);
    });

    it('should return zero balance with balanceOf for zero address', async function () {
        expect(await this.token.balanceOf(ZERO_ADDRESS)).to.be.bignumber.equal(new BN(0));
    });

    it('should fail if transfer from zero balance account', async function () {
        await expectRevert(
            this.token.transfer(owner, initialSupply, {from: other}),
            'ERROR_NOT_AVAILABLE'
        );
    });

    it('should fail if balance less then amount', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        expect(await this.token.balanceOf(otherSecond)).to.be.bignumber.equal(initialSupply);
        await this.token.transfer(owner, new BN(10000), {from: otherSecond})
        expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(new BN(10000));
        await expectRevert(
            this.token.transfer(owner, new BN(10000), {from: other}),
            'ERROR_NOT_AVAILABLE'
        );
    });

    it('should fail if balance less then zero', async function () {
        await expectRevert(
            this.token.transfer(owner, new BN(-1), {from: other}),
            'ERROR_NOT_AVAILABLE'
        );
    });

    it('should be able to transfer tokens', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        const transfer = await this.token.transfer(other, initialSupply, {from: otherSecond});
        expect(transfer.receipt.gasUsed).to.be.below(GAS_LIMIT_TRANSFER);
        await expectEvent.inTransaction(transfer.tx, this.token, 'Transfer', { value: initialSupply, from:otherSecond, to: other });
        expect(await this.token.balanceOf(otherSecond)).to.be.bignumber.equal(new BN(0));
        expect(await this.token.balanceOf(other)).to.be.bignumber.equal(initialSupply);
        expect(await this.token.totalSupply()).to.be.bignumber.equal(initialSupply);
    });

    it('should prevent transfer to incorrect address', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});

        await expectRevert(
            this.token.transfer("a", initialSupply, { from: otherSecond }),
            'invalid address (arg="_to", coderType="address", value="a")'
        );
    });

    it('should prevent transfer to zero address', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await expectRevert(
            this.token.transfer(ZERO_ADDRESS, initialSupply, { from: otherSecond }),
            'ERC20: transfer to the zero address'
        );
    });

    it('should prevent setting of incorrect owner and spender at allowance method', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});

        await expectRevert(
            this.token.allowance("a", other, {from : other}),
            'invalid address (arg="owner", coderType="address", value="a")'
        );
        await expectRevert(
            this.token.allowance(owner, "a", {from : other}),
            'invalid address (arg="spender", coderType="address", value="a")'
        );
    });

    it('should prevent setting of incorrect spender at approve method', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});

        await expectRevert(
            this.token.approve("a", initialSupply, {from : otherSecond}),
            'invalid address (arg="spender", coderType="address", value="a")'
        );
    });

    it('should prevent approving with incorrect value', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});

        await expectRevert(
            this.token.approve(other, "a", {from : otherSecond}),
            'invalid number value (arg="amount", coderType="uint256", value="a")'
        );
    });

    it('should prevent transferFrom if approve balance less then transfer value', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});

        await this.token.approve(other, new BN(1), {from : otherSecond});
        await expectRevert(
            this.token.transferFrom(owner, other, initialSupply, {from : otherSecond}),
            'ERROR_NOT_AVAILABLE'
        );
    });

    it('should prevent transferFrom if value more then user balance', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});

        await this.token.approve(owner, initialSupply, {from : otherSecond});
        await expectRevert(
            this.token.transferFrom(other, owner, initialSupply, {from : otherSecond}),
            'ERROR_NOT_AVAILABLE'
        );
    });

    it('should prevent transferFrom if value less then zero', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.token.approve(otherSecond, initialSupply, {from : other});
        await expectRevert(
            this.token.transferFrom(other, otherSecond, initialSupply, {from : otherSecond}),
            'ERROR_NOT_AVAILABLE'
        );
    });

    it('should prevent transferFrom if transfer value less then zero', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});

        await this.token.approve(other, initialSupply, {from : otherSecond});
        await expectRevert(
            this.token.transferFrom(otherSecond, other, new BN(-1), {from : other}),
            'ERROR_NOT_AVAILABLE'
        );
    });

    it('should prevent transferFrom to zero address', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.token.approve(other, initialSupply, {from : otherSecond});
        await expectRevert(
            this.token.transferFrom(otherSecond, ZERO_ADDRESS, initialSupply, {from : other}),
            'ERC20: transfer to the zero address'
        );
    });

    it('should prevent approve to zero address', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await expectRevert(
            this.token.approve(ZERO_ADDRESS, initialSupply, {from : otherSecond}),
            'ERC20: approve to the zero address'
        );
    });

    it('should prevent approve from zero address', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await expectRevert(
            this.token.transferFrom(ZERO_ADDRESS, other, new BN(0), {from : other}),
            'ERC20: transfer from the zero address'
        );
    });

    it('should able to set approve value', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        const result = await this.token.approve(other, initialSupply, {from : otherSecond});
        expect(result.receipt.gasUsed).to.be.below(GAS_LIMIT);
        expect(await this.token.allowance(otherSecond, other, {from : other})).to.be.bignumber.equal(initialSupply);
    });

    it('should able to transferFrom tokens', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        const approve = await this.token.approve(other, initialSupply, {from : otherSecond});
        await expectEvent.inTransaction(approve.tx, this.token, 'Approval', { value: initialSupply, owner:otherSecond, spender: other });
        const transfer = await this.token.transferFrom(otherSecond, other, initialSupply, {from : other});
        expect(transfer.receipt.gasUsed).to.be.below(GAS_LIMIT_TRANSFER_FROM);
        await expectEvent.inTransaction(transfer.tx, this.token, 'Transfer', { value: initialSupply, from:otherSecond, to: other });
        expect(await this.token.balanceOf(otherSecond)).to.be.bignumber.equal(new BN(0));
        expect(await this.token.balanceOf(other)).to.be.bignumber.equal(initialSupply);
    });

    it('should increase allowed value to approve after using increaseAllowance', async function () {
    await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
    await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.token.approve(other, new BN(0), {from : otherSecond});
        const increaseAllowance = await this.token.increaseAllowance(other, initialSupply, {from:otherSecond});
        expect(increaseAllowance.receipt.gasUsed).to.be.below(GAS_LIMIT);
        await expectEvent.inTransaction(increaseAllowance.tx, this.token, 'Approval', { value: initialSupply, owner:otherSecond, spender: other });
        await this.token.transferFrom(otherSecond, other, initialSupply, {from : other});
        expect(await this.token.balanceOf(otherSecond)).to.be.bignumber.equal(new BN(0));
        expect(await this.token.balanceOf(other)).to.be.bignumber.equal(initialSupply);
    });

    it('should decrease allowed value to approve after using decreaseAllowance', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.token.approve(other, initialSupply, {from: otherSecond});
        const decreaseAllowance = await this.token.decreaseAllowance(other, new BN(1), {from: otherSecond});
        expect(decreaseAllowance.receipt.gasUsed).to.be.below(GAS_LIMIT);
        await expectEvent.inTransaction(decreaseAllowance.tx, this.token, 'Approval', {
            value: new BN(initialSupply).sub(new BN('1')).toString(),
            owner: otherSecond,
            spender: other
        });
        await expectRevert(
            this.token.transferFrom(other, otherSecond, initialSupply, {from: otherSecond}),
            'ERROR_NOT_AVAILABLE'
        );
    });

    it('should prevent decreaseAllowance with incorrect value', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.token.approve(other, initialSupply, {from : otherSecond});
        await expectRevert(
            this.token.decreaseAllowance(other, "a", {from:otherSecond}),
            'invalid number value (arg="subtractedValue", coderType="uint256", value="a")'
        );
    });

    it('should prevent decreaseAllowance with incorrect spender', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.token.approve(other, initialSupply, {from : otherSecond});
        await expectRevert(
            this.token.decreaseAllowance("a", initialSupply, {from:otherSecond}),
            'invalid address (arg="spender", coderType="address", value="a")'
        );
    });

    it('should prevent increaseAllowance with incorrect value', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.token.approve(other, new BN(0), {from : otherSecond});
        await expectRevert(
            this.token.increaseAllowance(other, "a", {from:otherSecond}),
            'invalid number value (arg="addedValue", coderType="uint256", value="a")'
        );
    });

    it('should prevent increaseAllowance with incorrect spender', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.token.approve(other, new BN(0), {from: otherSecond});
        await expectRevert(
            this.token.increaseAllowance("a", initialSupply, {from: otherSecond}),
            'invalid address (arg="spender", coderType="address", value="a")'
        );
    });

    it('should be able to burn tokens', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(owner, initialSupply, {from: owner});
        await this.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
            {
                from: owner
            })
        const result = await this.token.burn(initialSupply, { from: owner });
        await expectEvent.inTransaction(result.tx, this.token, 'Transfer', { value: initialSupply, from:owner, to: ZERO_ADDRESS });
        expect(result.receipt.gasUsed).to.be.below(GAS_LIMIT_TRANSFER_FROM);
        expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(new BN(0));
        expect(await this.token.totalSupply()).to.be.bignumber.equal(new BN(0));
    });

    it('shouldnt be able to burn tokens if tokens are locked', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(owner, initialSupply, {from: owner});
        await this.lockupContract.allocationLog(
            owner,
            initialSupply,
            0,
            3600 * 24 * 5,
            20,
            3600 * 24,
            {from: owner});
        await expectRevert(
            this.token.burn(initialSupply, {from: owner}),
            'ERROR_NOT_AVAILABLE'
        );
    });
    it('should fail if account hasnt balance to burn', async function () {
        await this.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
            {
                from: owner
            })
        await expectRevert(
            this.token.burn(initialSupply, {from: owner}),
            'ERROR_NOT_AVAILABLE'
        );
    });


    it('should fail if account hasn\'t permissions to burn', async function () {
        await this.management.setPermission(owner, CAN_MINT_TOKENS, true, {from: owner});
        await this.token.mintTest(otherSecond, initialSupply, {from: owner});
        await this.lockupContract.setPostponedStartDate(new BigNumber(startAt).minus(1000).valueOf(),
            {
                from: owner
            })
        await expectRevert(
            this.token.burn(initialSupply, {from: otherSecond}),
            'ERROR_ACCESS_DENIED'
        );
    });
});