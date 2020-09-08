const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const addresses = require('../addresses.json');

const BatchZkSyncDeposit = contract.fromArtifact('BatchZkSyncDeposit');
const TestToken = contract.fromArtifact('TestToken');

const MAX_UINT256 = constants.MAX_UINT256.toString();
const { toWei } = web3.utils;

const defaultTokenAmount = toWei('25');
const defaultEthAmount = toWei('5');

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

describe('BatchZkSyncDeposit', () => {
  const [owner, user] = accounts;

  let batchZkSyncDeposit;
  let dai;
  let bat;
  let mkr;

  beforeEach(async () => {
    // Get token instances
    dai = await TestToken.at(addresses.DAI);
    bat = await TestToken.at(addresses.BAT);
    mkr = await TestToken.at(addresses.MKR);

    // Send DAI and BAT to the user
    await dai.transfer(user, defaultTokenAmount, { from: addresses.exchange });
    await bat.transfer(user, defaultTokenAmount, { from: addresses.exchange });
    await mkr.transfer(user, defaultTokenAmount, { from: addresses.exchange });

    // Deploy batchZkSyncDeposit contract
    batchZkSyncDeposit = await BatchZkSyncDeposit.new(addresses.zkSync, acceptedTokens, {
      from: owner,
    });

    // Approve batchZkSyncDeposit contract to spend our tokens
    await dai.approve(batchZkSyncDeposit.address, MAX_UINT256, { from: user });
    await bat.approve(batchZkSyncDeposit.address, MAX_UINT256, { from: user });
    await mkr.approve(batchZkSyncDeposit.address, MAX_UINT256, { from: user });
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
  it('lets the user submit a single ETH deposit', async () => {
    const deposit = [{ token: addresses.ETH, amount: defaultEthAmount }];
    const receipt = await batchZkSyncDeposit.deposit(user, deposit, {
      from: user,
      value: defaultEthAmount,
    });
    expectEvent(receipt, 'DepositMade', { token: addresses.ETH, amount: defaultEthAmount, user });

    const contractEthBalance = (await balance.current(batchZkSyncDeposit.address)).toString();
    expect(contractEthBalance).to.be.bignumber.equal('0');
  });

  it('lets the user submit a single token deposit', async () => {
    const deposit = [{ token: addresses.DAI, amount: defaultTokenAmount }];
    const receipt = await batchZkSyncDeposit.deposit(user, deposit, { from: user });
    expectEvent(receipt, 'DepositMade', { token: addresses.DAI, amount: defaultTokenAmount, user });
  });

  it('lets the user submit an ETH + token batch deposit', async () => {
    const deposit = [
      { token: addresses.ETH, amount: defaultEthAmount },
      { token: addresses.DAI, amount: defaultTokenAmount },
      { token: addresses.BAT, amount: defaultTokenAmount },
    ];
    const receipt = await batchZkSyncDeposit.deposit(user, deposit, {
      from: user,
      value: defaultEthAmount,
    });
    expectEvent(receipt, 'DepositMade', { token: addresses.ETH, amount: defaultEthAmount, user });
    expectEvent(receipt, 'DepositMade', { token: addresses.DAI, amount: defaultTokenAmount, user });
    expectEvent(receipt, 'DepositMade', { token: addresses.BAT, amount: defaultTokenAmount, user });

    const contractEthBalance = (await balance.current(batchZkSyncDeposit.address)).toString();
    expect(contractEthBalance).to.be.bignumber.equal('0');
  });

  it('lets the user submit a multiple token batch deposit', async () => {
    const deposit = [
      { token: addresses.DAI, amount: defaultTokenAmount },
      { token: addresses.BAT, amount: defaultTokenAmount },
      { token: addresses.MKR, amount: defaultTokenAmount },
    ];
    const receipt = await batchZkSyncDeposit.deposit(user, deposit, {
      from: user,
    });
    expectEvent(receipt, 'DepositMade', { token: addresses.DAI, amount: defaultTokenAmount, user });
    expectEvent(receipt, 'DepositMade', { token: addresses.BAT, amount: defaultTokenAmount, user });
    expectEvent(receipt, 'DepositMade', { token: addresses.MKR, amount: defaultTokenAmount, user });
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

  it('lets the owner modify token allowances', async () => {
    // Confirm initial allowance set in construction
    const fullAllowance = await dai.allowance(batchZkSyncDeposit.address, addresses.zkSync);
    expect(fullAllowance).to.be.bignumber.equal(constants.MAX_UINT256);

    // Remove the full allowance
    const revokeTx = await batchZkSyncDeposit.setAllowance(addresses.DAI, '0', { from: owner });
    expectEvent(revokeTx, 'AllowanceSet', { token: addresses.DAI, amount: '0' });
    const emptyAllowance = await dai.allowance(batchZkSyncDeposit.address, addresses.zkSync);
    expect(emptyAllowance).to.be.bignumber.equal('0');

    // Restore allowance to an arbitrary value
    const approveTx = await batchZkSyncDeposit.setAllowance(addresses.DAI, '100', { from: owner });
    expectEvent(approveTx, 'AllowanceSet', { token: addresses.DAI, amount: '100' });
    const partialAllowance = await dai.allowance(batchZkSyncDeposit.address, addresses.zkSync);
    expect(partialAllowance).to.be.bignumber.equal('100');
  });

  it('does not let anyone except the owner add or revoke token allowances', async () => {
    await expectRevert(
      batchZkSyncDeposit.setAllowance(addresses.DAI, '100', { from: user }),
      'Ownable: caller is not the owner'
    );
  });
});
