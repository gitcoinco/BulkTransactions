require('dotenv').config();
const addresses = require('./addresses.json');

module.exports = {
  node: {
    fork: `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`,
    // Unlock a mainnet address to source tokens and ETH from
    unlocked_accounts: [addresses.exchange],
  },
};
