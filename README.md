# Gitcoin Grants Checkout Contracts

This repository contains smart contracts used during the Gitcoin grants checkout process.

- [Gitcoin Grants Checkout Contracts](#gitcoin-grants-checkout-contracts)
  - [Contracts](#contracts)
    - [Bulk Checkout](#bulk-checkout)
    - [Batch ZkSync Deposit](#batch-zksync-deposit)
  - [Development](#development)
    - [Setup](#setup)
    - [Deployment](#deployment)

## Contracts

### Bulk Checkout

`BulkCheckout.sol` improves the checkout UX and reduces gas costs by enabling users to donate
to multiple grants with one L1 transaction (ignoring the required ERC20 approval transactions).
This contract has been deployed on the following networks,

- Ethereum Mainnet and Rinkeby at [0x7d655c57f71464B6f83811C55D84009Cd9f5221C](https://etherscan.io/address/0x7d655c57f71464B6f83811C55D84009Cd9f5221C)
- Polygon (MATIC) Mumbai Testnet at [0x3E2849E2A489C8fE47F52847c42aF2E8A82B9973](https://mumbai.polygonscan.com/address/0x3E2849E2A489C8fE47F52847c42aF2E8A82B9973)
- Polygon (MATIC) Mainnet at [0xb99080b9407436eBb2b8Fe56D45fFA47E9bb8877](https://polygonscan.com/address/0xb99080b9407436eBb2b8Fe56D45fFA47E9bb8877)

It was compiled with Solidity 0.6.7.

### Batch ZkSync Deposit

The deposit functions on the [zkSync contract](https://etherscan.io/address/0xabea9132b05a70803a4e85094fd0e1800777fbef)
only allow users to deposit one currency per transaction. This means if a user wants to use zkSync to
donate, for example, ETH, USDC, and DAI to different grants, three transactions would be required to
deposit all three currencies into zkSync. `BatchZkSyncDeposit.sol` improves the UX of this process
and reduces gas costs by batching these deposit calls, so all three deposits are executed with
just one L1 transaction (ignoring the required ERC20 approval transactions).

This contract has been deployed on both Mainnet and Rinkeby at 
[0x9D37F793E5eD4EbD66d62D505684CD9f756504F6](https://etherscan.io/address/0x9D37F793E5eD4EbD66d62D505684CD9f756504F6)
and was compiled with Solidity 0.6.12. 


## Development

### Setup

1. Create a file called `.env` with the following contents:
   ```bash
   INFURA_ID=yourInfuraId
   MNEMONIC_TESTNET="your mnemonic for development" # only needed for deployment
   MNEMONIC_MAINNET="your mnemonic for production" # only needed for deployment
   ```
2. Install dependencies with `yarn`
3. Run tests with `yarn test`

### Deployment

To deploy a new version of the above contracts:

1. Open `networks.js` and configure the object for the network you want to deploy to
   1. You may want to change the gas price (specified in wei) if deploying to mainnet
   2. You may want to change the derivation path based on the result of the next step. See the [`@truffle/hdwallet-provider`](https://github.com/trufflesuite/truffle/tree/master/packages/hdwallet-provider) for more information.
2. Run `npx oz accounts` and select the network you wish to deploy to. The default account will be used unless otherwise specified in a later step.
   1. If you do not see the desired account, you likely need to change the derivation path. See the `@truffle/hdwallet-provider` docs linked above for instructions on how to change this
3. Run the appropriate compile script based on the contract you want to deploy. Either `yarn run compile-bulkCheckout` or `yarn run compile-batchZkSync`
4. Run `yarn run deploy` and follow the prompts to deploy the contract.
   1. If step 2 did not show the desired account as the default account, but you see the desired account in that list, instead run `npx oz deploy --skip-compile --from <desiredAddress>`. See the [OpenZeppelin CLI docs](https://docs.openzeppelin.com/cli/2.8/commands#deploy) for more information
5. Once deployment is complete, you'll see a file in the `.openzeppelin` folder called `<network>.json`, where `<network>` is the network you deployed to. The file contains an array of objects containing information on each contract deployment.
