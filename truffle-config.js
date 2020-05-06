const HDWalletProvider = require('@truffle/hdwallet-provider');
const privateKey = '2D49FFFBBB1A133AE70F3D2B071952B7FF75721E5EDDD9DD999B3DB90D064914';

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*",
            gas: 4612388
        },
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
            gas: 0xfffffffffff, // <-- Use this high gas value
            gasPrice: 0x01      // <-- Use this low gas price
        },
        rinkeby: {
            provider: function () {
                return new HDWalletProvider(privateKey, 'https://rinkeby.infura.io/v3/d3fd0e52a2af43fab31303f9c87c3030');
            },
            gasPrice: 9000000000,
            network_id: '*',
            gas: 6000000,
        },
    },
    plugins: ["solidity-coverage"],
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    compilers: {
        solc: {
            version: "0.5.17"
        }
    }
};
