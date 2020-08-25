const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const addresses = require('../addresses.json');

const BatchZkSyncDeposit = contract.fromArtifact('batchZkSyncDeposit');
const TestToken = contract.fromArtifact('TestToken');
const SelfDestruct = contract.fromArtifact('SelfDestruct');

const MAX_UINT256 = constants.MAX_UINT256.toString();
const { toWei } = web3.utils;

const defaultTokenAmount = toWei('100');

// List of tokens that can be used with zkSync on mainnet
const acceptedTokens = [
  addresses.DAI,
  addresses.USDC,
  addresses.TUSD,
  addresses.USDT,
  addresses.SUSD,
  addresses.BUSD,
  addresses.LEND,
  addresses.BAT,
  addresses.KNC,
  addresses.LINK,
  addresses.MANA,
  addresses.MKR,
  addresses.REP,
  addresses.SNX,
  addresses.WBTC,
  addresses.ZRX,
  addresses.MLTT,
  addresses.LRC,
  addresses.HEX,
];

// Define helper function to revert token/ETH balances after each test. This simplifies
// testing since we no longer have to track balances between tests
// More info at: https://github.com/trufflesuite/truffle/issues/888 and https://medium.com/fluidity/standing-the-time-of-test-b906fcc374a9
const takeSnapshot = () =>
  new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        id: new Date().getTime(),
      },
      (err, snapshotId) => {
        if (err) return reject(err);
        return resolve(snapshotId);
      }
    );
  });

const revertToSnapShot = (stateId) =>
  new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_revert',
        params: [stateId],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      }
    );
  });

describe('BatchZkSyncDeposit', () => {
  const [owner, user, grant1, withdrawal] = accounts;

  let stateId;
  let batchZkSyncDeposit;
  let dai;
  let usdc;

  beforeEach(async () => {
    // Save current ganache state
    stateId = (await takeSnapshot()).result;

    // Get token instances
    dai = await TestToken.at(addresses.DAI);

    // Send DAI to the user
    dai.transfer(user, defaultTokenAmount, { from: addresses.exchange });
    expect(await dai.balanceOf(user)).to.be.bignumber.equal(defaultTokenAmount);

    // Deploy bulk checkout contract
    batchZkSyncDeposit = await BatchZkSyncDeposit.new(addresses.zkSync, acceptedTokens, {
      from: owner,
    });

    // Approve batchZkSyncDeposit contract to spend our tokens
    dai.approve(batchZkSyncDeposit.address, MAX_UINT256, { from: user });
  });

  afterEach(async () => {
    // Revert to restore balances to default
    await revertToSnapShot(stateId);
  });

  // ======================================= Initialization ========================================
  it('should see the deployed BatchZkSyncDeposit contract', async () => {
    expect(batchZkSyncDeposit.address.startsWith('0x')).to.be.true;
    expect(batchZkSyncDeposit.address.length).to.equal(42);
  });

  it('sets the owner upon deployment', async () => {
    expect(await batchZkSyncDeposit.owner()).to.equal(owner);
  });

  // ======================================= Batch Deposits ========================================
  it.skip('lets the user submit a single ETH deposit', async () => {
    const deposit = [{ token: addresses.ETH, amount: toWei('5') }];
    const receipt = await batchZkSyncDeposit.deposit(user, deposit, {
      from: user,
      value: toWei('5'),
    });
    expectEvent(receipt, 'DepositMade', { token: addresses.ETH, amount: toWei('5'), user });
  });

  it.skip('lets the user submit a single token deposit', async () => {
    const deposit = [{ token: addresses.DAI, amount: toWei('5') }];
    const receipt = await batchZkSyncDeposit.deposit(user, deposit, {
      from: user,
      value: toWei('5'),
    });
    expectEvent(receipt, 'DepositMade', { token: addresses.dai, amount: toWei('5'), user });
  });

  it.skip('lets the user submit an ETH + token batch deposit', async () => {
    const deposit = [{ token: addresses.ETH, amount: toWei('5') }];
  });

  it.skip('lets the user submit a multiple token batch deposit', async () => {
    const deposit = [{ token: addresses.ETH, amount: toWei('5') }];
  });

  // ======================================== Admin Actions ========================================
  it('lets ownership be transferred by the owner', async () => {
    expect(await batchZkSyncDeposit.owner()).to.equal(owner);
    await batchZkSyncDeposit.transferOwnership(user, { from: owner });
    expect(await batchZkSyncDeposit.owner()).to.equal(user);
  });

  it('does not let anyone except the owner transfer ownership', async () => {
    await expectRevert(
      batchZkSyncDeposit.transferOwnership(user, { from: user }),
      'Ownable: caller is not the owner'
    );
  });

  it('lets the owner pause and unpause the contract', async () => {
    // Contract is unpaused, so make sure we cannot call unpause
    expect(await batchZkSyncDeposit.paused()).to.equal(false);
    await expectRevert(batchZkSyncDeposit.unpause({ from: owner }), 'Pausable: not paused');

    // Pause contract and make sure we can no longer make deposits
    await batchZkSyncDeposit.pause({ from: owner });
    expect(await batchZkSyncDeposit.paused()).to.equal(true);
    const deposit = [{ token: addresses.ETH, amount: toWei('5') }];
    await expectRevert(
      batchZkSyncDeposit.deposit(user, deposit, { from: user, value: toWei('5') }),
      'Pausable: paused'
    );

    // Unpause and make sure everything still works
    await batchZkSyncDeposit.unpause({ from: owner });
    await batchZkSyncDeposit.deposit(user, deposit, { from: user, value: toWei('5') });
  });

  it('does not let anyone except the owner pause the contract', async () => {
    // Contract is unpaused, so make sure user cannot pause it
    expect(await batchZkSyncDeposit.paused()).to.equal(false);
    await expectRevert(
      batchZkSyncDeposit.pause({ from: user }),
      'Ownable: caller is not the owner'
    );

    // Now pause contract and make sure user cannot unpause it
    await batchZkSyncDeposit.pause({ from: owner });
    expect(await batchZkSyncDeposit.paused()).to.equal(true);
    await expectRevert(
      batchZkSyncDeposit.unpause({ from: user }),
      'Ownable: caller is not the owner'
    );
  });
});
