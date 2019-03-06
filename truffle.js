require('babel-register');
require('babel-polyfill');

module.exports = {
    networks: {
        development: {
            host: 'localhost',
            port: 7545,
            network_id: '*', // Match any network id
            gasPrice: 1000000000
        },
        ganache: {
            host: '127.0.0.1',
            port: 8545,
            network_id: 5777,
            gas: 6721975,
            gasPrice: 1,
        },
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8555,
            gas: 0xfffffffffff,
            gasPrice: 0x01
        },
    },
    mocha: {
        useColors: true,
        slow: 30000,
        bail: true
    }
};
