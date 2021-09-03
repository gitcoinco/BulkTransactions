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
          `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`
        ),
      networkId: 4,
      gasPrice: 10e9,
      gas: 5e6,
    },
    mumbai: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC_TESTNET,
          'https://rpc-mumbai.maticvigil.com'
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
          `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`
        ),
      networkId: 1,
      gasPrice: 35e9, // 35 gwei
      gas: 5e6,
    },
    polygonMainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC_MAINNET,
          'https://rpc-mainnet.maticvigil.com'
        ),
      networkId: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gas: 5e6,
    },
  },
};
