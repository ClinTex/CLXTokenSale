const LockupContract = artifacts.require("./LockupContract.sol");
const CLXToken = artifacts.require("./CLXToken.sol");
const Management = artifacts.require("./managment/Management.sol");
const CLXAllocator = artifacts.require("./CLXAllocator.sol");
const Utils = require("./utils");
const BigNumber = require("bignumber.js");

// Contract keys
const CONTRACT_TOKEN = 1;
const CONTRACT_ALLOCATOR = 4;
const CONTRACT_LOCKUP = 9;

// Permission keys
const CAN_MINT_TOKENS = 0;
const CAN_LOCK_TOKENS = 3;
const CAN_INTERACT_WITH_ALLOCATOR = 5;

// Precision for BigNumber (1e18)
const precision = new BigNumber("1000000000000000000");

let icoSince = parseInt(new Date().getTime() / 1000) - 3600;
let now = parseInt(new Date().getTime() / 1000);
let icoTill = parseInt(new Date().getTime() / 1000) + 3600;

contract("lockupLockupContract", accounts => {
    let allocator;
    let management;
    let lockup;
    let token;

    const owner = accounts[0];

    beforeEach(async () => {
        management = await Management.new();
        allocator = await CLXAllocator.new(new BigNumber('10000').multipliedBy(precision), management.address);
        lockup = await LockupContract.new(management.address);
        token = await CLXToken.new(management.address);

        await management.registerContract(CONTRACT_TOKEN, token.address)
            .then(Utils.receiptShouldSucceed);
        
        await management.registerContract(CONTRACT_LOCKUP, lockup.address)
            .then(Utils.receiptShouldSucceed);

        let contractTokenAddress = await management.contractRegistry.call(CONTRACT_TOKEN);
        assert.equal(contractTokenAddress, token.address, "token address is not equal");

        await management.registerContract(CONTRACT_ALLOCATOR, allocator.address)
            .then(Utils.receiptShouldSucceed);

        let contractAllocatorAddress = await management.contractRegistry.call(CONTRACT_ALLOCATOR);
        assert.equal(contractAllocatorAddress, allocator.address, "allocator address is not equal");

        await management.setPermission(allocator.address, CAN_MINT_TOKENS, true)
            .then(Utils.receiptShouldSucceed);

        let allocatorPermissionToMint = await management.permissions.call(allocator.address, CAN_MINT_TOKENS);
        assert.equal(allocatorPermissionToMint, true, "allocator has not got permission to mint tokens");

        await management.setPermission(lockup.address, CAN_INTERACT_WITH_ALLOCATOR, true)
            .then(Utils.receiptShouldSucceed);

        let tokenPermissionToInteractWithAllocator =
            await management.permissions.call(lockup.address, CAN_INTERACT_WITH_ALLOCATOR);

        assert.equal(
            tokenPermissionToInteractWithAllocator,
            true,
            "token has not got permission to interact with allocator"
        );

        await management.setPermission(lockup.address, CAN_LOCK_TOKENS, true)
            .then(Utils.receiptShouldSucceed);

        let tokenPermissionToLockTokens = await management.permissions.call(lockup.address, CAN_LOCK_TOKENS);
        assert.equal(tokenPermissionToLockTokens, true, "token has not got permission to lock tokens");
    });

    describe("check allocationLog", async () => {

        it("should not allow to call allocationLog from not lockupAgent", async () => {
            await lockup.allocationLog(
                accounts[1],
                new BigNumber(100).multipliedBy(precision),
                icoSince,
                3600 * 24 * 5,
                0,
                3600 * 24
            )
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed)
        });

        it("should return amount = amount", async () => {
            await management.setPermission(owner, CAN_LOCK_TOKENS, true);
            assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                true, "permissions is not equal");

            await lockup.allocationLog(
                accounts[1],
                new BigNumber(100).multipliedBy(precision),
                now,
                3600 * 5,
                0,
                5
            )
                .then(Utils.receiptShouldSucceed);

            let amount = await lockup.lockedAllocationData.call(accounts[1], 1);
            assert.equal(
                new BigNumber(amount).valueOf(),
                new BigNumber('100').multipliedBy(precision).valueOf(),
                "amount is not equal"
            );
        });

        it("should return amount = amount - initialUnlock", async () => {
            await management.setPermission(owner, CAN_LOCK_TOKENS, true);
            assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                true, "permissions is not equal");

            await lockup.allocationLog(
                accounts[1],
                new BigNumber(100).multipliedBy(precision),
                icoSince,
                3600 * 24 * 5,
                20,
                3600 * 24
            )
                .then(Utils.receiptShouldSucceed);

            let amount = await lockup.lockedAllocationData.call(accounts[1], 1);
            assert.equal(
            new BigNumber(amount).valueOf(),
            new BigNumber(80).multipliedBy(precision).valueOf(),
            "amount is not equal"
            );
        });
     });

    describe("check isTransferAllowed", async () => {
        it("should allow to transfer as account hasn`t got locked tokens", async () => {
            await management.setPermission(owner, CAN_INTERACT_WITH_ALLOCATOR, true)
                .then(Utils.receiptShouldSucceed);

            assert.equal(await management.permissions.call(owner, CAN_INTERACT_WITH_ALLOCATOR),
                true, "permissions is not equal");

            await allocator.allocate(
                accounts[2],
                new BigNumber(100).multipliedBy(precision).valueOf(),
                new BigNumber(0).multipliedBy(precision).valueOf(),
            )
                .then(Utils.receiptShouldSucceed);

            let tokenBalance = await token.balanceOf.call(accounts[2]);
            let result = await lockup.isTransferAllowed(
                accounts[2],
                new BigNumber(100).multipliedBy(precision),
                icoSince,
                tokenBalance
            );

            assert.equal(result, true, "isTransferAllowed is not equal")
        });

        it("should allow to transfer as transfer amount is less than balance", async () => {
            await management.setPermission(owner, CAN_LOCK_TOKENS, true);
            assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                true, "permissions is not equal");

            await lockup.allocationLog(
                accounts[1],
                new BigNumber(100).multipliedBy(precision),
                icoSince,
                3600 * 24 * 5,
                20,
                3600 * 24
            )
                .then(Utils.receiptShouldSucceed);

            await assert.equal(
                new BigNumber(
                    await lockup.lockedAllocationData.call(
                        accounts[1], 1
                    )
                ).valueOf(),
                new BigNumber(80).multipliedBy(precision),
                "lockedAllocationData is not equal"
            );

            let result = await lockup.isTransferAllowed(
                accounts[1],
                new BigNumber(80).multipliedBy(precision),
                icoSince,
                new BigNumber(100).multipliedBy(precision)
            );

            assert.equal(result, false, "isTransferAllowed is not equal");

            result = await lockup.isTransferAllowed(
                accounts[1],
                new BigNumber(10).multipliedBy(precision),
                icoSince,
                new BigNumber(100).multipliedBy(precision)
            );

            assert.equal(result, true, "isTransferAllowed is not equal");
        });

        it("should not allow to transfer as all balance is locked", async () => {
            await management.setPermission(owner, CAN_LOCK_TOKENS, true);
            assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                true, "permissions is not equal");

            await lockup.allocationLog(
                accounts[1],
                new BigNumber(100).multipliedBy(precision),
                icoSince,
                3600 * 24 * 5,
                20,
                3600 * 24
            )
                .then(Utils.receiptShouldSucceed);

            await lockup.allocationLog(
                accounts[1],
                0,
                icoSince,
                3600 * 24 * 5,
                20,
                3600 * 24
            )
                .then(Utils.receiptShouldSucceed);

            let result = await lockup.isTransferAllowed(
                accounts[1],
                new BigNumber(10).multipliedBy(precision),
                icoSince,
                new BigNumber(100).multipliedBy(precision)
            );

            assert.equal(result, false, "isTransferAllowed is not equal");
        });

        it("should not allow to transfer all balance as lockPeriodEnd is less than current time", async () => {
            await management.setPermission(owner, CAN_LOCK_TOKENS, true);
            assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                true, "permissions is not equal");

            await lockup.allocationLog(
                accounts[1],
                new BigNumber(100).multipliedBy(precision),
                icoSince,
                3600 * 24 * 5,
                20,
                3600 * 24
            )
                .then(Utils.receiptShouldSucceed);

            let result = await lockup.isTransferAllowed(
                accounts[1],
                new BigNumber(100).multipliedBy(precision),
                icoSince + 3600 * 24 * 4,
                new BigNumber(100).multipliedBy(precision)
            );

            assert.equal(result, false, "isTransferAllowed is not equal");
        });

        it("should not allow to transfer as transfer amount is bigger than balance", async () => {
            await management.setPermission(owner, CAN_LOCK_TOKENS, true);
            assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                true, "permissions is not equal");

            await lockup.allocationLog(
                accounts[1],
                new BigNumber(100).multipliedBy(precision),
                icoSince,
                3600 * 24 * 5,
                20,
                3600 * 24
            )
                .then(Utils.receiptShouldSucceed);

            let result = await lockup.isTransferAllowed(
                accounts[1],
                new BigNumber(100).multipliedBy(precision) + 10 * precision,
                icoSince + 3600 * 24 * 6,
                new BigNumber(100).multipliedBy(precision)
            );

            assert.equal(result, false, "isTransferAllowed is not equal")
        });
    });

        describe("check getUnlockedBalance", async () => {
            it("should return all balance as account hasn`t got locked tokens", async () => {
                await management.setPermission(owner, CAN_INTERACT_WITH_ALLOCATOR, true);
                assert.equal(await management.permissions.call(owner, CAN_INTERACT_WITH_ALLOCATOR),
                    true, "permissions is not equal");

                await allocator.allocate(accounts[2], new BigNumber(100).multipliedBy(precision), 0)
                    .then(Utils.receiptShouldSucceed);

                let tokenBalance = await token.balanceOf.call(accounts[2]);
                assert.equal(
                    new BigNumber(tokenBalance).valueOf(),
                    new BigNumber(100).multipliedBy(precision),
                    "tokenBalance is not equal");

                let result = await lockup.getUnlockedBalance(accounts[2], icoSince, tokenBalance);
                assert.equal(
                    new BigNumber(result).valueOf(),
                    new BigNumber(tokenBalance).valueOf(), "getUnlockedBalance is not equal"
                );
            });

            it("should return 0 as all balance is locked", async () => {
                await management.setPermission(owner, CAN_LOCK_TOKENS, true);
                assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                    true, "permissions is not equal");

                await management.setPermission(owner, CAN_INTERACT_WITH_ALLOCATOR, true);
                assert.equal(await management.permissions.call(owner, CAN_INTERACT_WITH_ALLOCATOR),
                    true, "permissions is not equal");

                await allocator.allocate(accounts[2], new BigNumber(100).multipliedBy(precision), 0)
                    .then(Utils.receiptShouldSucceed);

                let tokenBalance = await token.balanceOf.call(accounts[2]);
                assert.equal(
                    new BigNumber(tokenBalance).valueOf(),
                    new BigNumber(100).multipliedBy(precision),
                    "tokenBalance is not equal"
                );

                let result = await lockup.getUnlockedBalance(accounts[2], icoSince, tokenBalance);
                assert.equal(
                    new BigNumber(result).valueOf(),
                    new BigNumber(tokenBalance).valueOf(),
                    "getUnlockedBalance is not equal"
                );

                await lockup.allocationLog(
                    accounts[2],
                    0,
                    icoTill,
                    3600 * 24 * 5,
                    20,
                    3600 * 24
                )
                    .then(Utils.receiptShouldSucceed);

                result = await lockup.getUnlockedBalance(accounts[2], icoTill, tokenBalance);
                assert.equal(result.valueOf(), 0, "getUnlockedBalance is not equal");
            });

            it("should return getUnlockedBalance = initialUnlock", async () => {
                await management.setPermission(owner, CAN_LOCK_TOKENS, true);
                assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                    true, "permissions is not equal");

                await lockup.allocationLog(
                    accounts[1],
                    new BigNumber(100).multipliedBy(precision),
                    icoSince,
                    3600 * 24 * 5,
                    20,
                    0
                )
                    .then(Utils.receiptShouldSucceed);

                let result = await lockup.getUnlockedBalance(accounts[1], icoSince + 3600 * 24, new BigNumber(100).multipliedBy(precision));
                assert.equal(
                    new BigNumber(result).valueOf(),
                    new BigNumber(20).multipliedBy(precision),
                    "getUnlockedBalance is not equal"
                );
            });

            it("should return getUnlockedBalance = initialUnlock + releasePeriod tokens", async () => {
                await management.setPermission(owner, CAN_LOCK_TOKENS, true);
                assert.equal(await management.permissions.call(owner, CAN_LOCK_TOKENS),
                    true, "permissions is not equal");

                await lockup.allocationLog(
                    accounts[1],
                    new BigNumber(100).multipliedBy(precision),
                    icoSince,
                    3600 * 24 * 5,
                    20,
                    3600 * 24
                )
                    .then(Utils.receiptShouldSucceed);

                let result = await lockup.getUnlockedBalance.call(
                    accounts[1],
                    new BigNumber(icoSince).plus(3600 * 25),
                    new BigNumber(100).multipliedBy(precision)
                );

                assert.equal(
                    new BigNumber(result).valueOf(),
                    new BigNumber(36).multipliedBy(precision).valueOf(),
                    "getUnlockedBalance is not equal"
                );
            });
        });


});