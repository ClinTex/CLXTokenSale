module.exports = {
    skipFiles: [
        'Migrations.sol',
        'tests/ContributionTest.sol',
        'tests/CrowdsaleTest.sol',
        'tests/CrowdsaleAgentTest.sol',
        'tests/MintableCrowdsaleOnSuccessAgentTest.sol',
        'tests/ExchangeContractTest.sol',
        'tests/ManagedTest.sol',
    ],
    // need for dependencies
    copyNodeModules: true,
    copyPackages: [
        'openzeppelin-solidity'
    ],
    dir: '.',
    norpc: false
};
