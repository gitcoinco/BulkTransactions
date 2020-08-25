# Gitcoin Grants Bulk Checkout Contracts

Smart contracts for Gitcoin grants bulk checkout functionality

NOTES:

- BulkCheckout was compiled with 0.6.7
- Need 0.6.8 for BatchZkSyncDeposit (see comments in constructor)
- Set up .env file since we fork mainnet for the zkSync tests

## Development

1. Install dependencies with `npm install`
2. Run tests with `npm test`

## Deployment

`BulkCheckout.sol` has been deployed to the Mainnet and Rinkeby at
[0x7d655c57f71464B6f83811C55D84009Cd9f5221C](https://etherscan.io/address/0x7d655c57f71464B6f83811C55D84009Cd9f5221C).

To deploy a new version:

1. Create a file called `.env` with the following contents:
   ```bash
   INFURA_ID=yourInfuraId
   MNEMONIC_RINKEBY="your mnemonic for development"
   MNEMONIC_MAINNET="your mnemonic for production"
   ```
2. Open `networks.js` and configure the object for the network you want to deploy to
   1. You may want to change the gas price (specified in wei) if deploying to mainnet
   2. You may want to change the derivation path based on the result of the next step. See the [`@truffle/hdwallet-provider`](https://github.com/trufflesuite/truffle/tree/master/packages/hdwallet-provider) for more information.
3. Run `npx oz accounts` and select the network you wish to deploy to. The default account will be used unless otherwise specified.
4. Run `npm run deploy` and follow the prompts to deploy the `BulkCheckout` contract. This will first run `npm run compile` to compile the contracts.
   1. If the previous step did not show the desired default account, but you see the desired account in that list, instead run `npx oz deploy --from <desiredAddress>`. See the [OpenZeppelin CLI docs](https://docs.openzeppelin.com/cli/2.8/commands#deploy) for more information
   2. If you do not see the desired account, you likely need to change the derivation path. See the `@truffle/hdwallet-provider` docs linked above for instructions on how to change this
5. Once deployment is complete, you'll see a file in the `.openzeppelin` folder called `<network>.json`, where `<network>` is the network you deployed to. The file contains an array of objects containing information on each contract deployment.
