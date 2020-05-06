const Managed = artifacts.require("managment/Managed.sol");
const Management = artifacts.require("./managment/Management.sol");
const Utils = require("./utils.js");

contract("Managed", accounts => {


    it("should set Management contract", async () => {
        const managed = await Managed.new(accounts[7]);
        assert.equal(await managed.management.call(), accounts[7], "management doesn't match");

        const management = await Management.new();

        await managed.setManagementContract(management.address,{from:accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);


        await managed.setManagementContract(management.address)
            .then(Utils.receiptShouldSucceed);

        assert.equal(await managed.management.call(), management.address, "management doesn't match");
    });
});