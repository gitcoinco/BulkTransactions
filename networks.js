require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      protocol: 'http',
      host: 'localhost',
      port: 8545,
      gas: 5000000,
      gasPrice: 5e9,
      networkId: '*',
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC_TESTNET,
          process.env.PROVIDER_URL_TESTNET
        ),
      networkId: 4,
      gasPrice: 10e9,
      gas: 5e6,
    },
    mumbai: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC_TESTNET,
          process.env.PROVIDER_URL_TESTNET
        ),
      networkId: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gas: 2e6,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC_MAINNET,
          process.env.PROVIDER_URL_MAINNET
        ),
      networkId: 1,
      gasPrice: 35e9, // 35 gwei
      gas: 5e6,
    },
  },
};
