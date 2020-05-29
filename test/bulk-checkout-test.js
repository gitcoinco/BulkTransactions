const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const {
  balance, constants, expectEvent, expectRevert,
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const BulkCheckout = contract.fromArtifact('BulkCheckout');
const TestToken = contract.fromArtifact('TestToken');

const MAX_UINT256 = constants.MAX_UINT256.toString();
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const { fromWei, toWei } = web3.utils;

// Define helper function to revert token/ETH balances after each test. This simplifies
// testing since we no longer have to track balances between tests
// More info at: https://github.com/trufflesuite/truffle/issues/888 and https://medium.com/fluidity/standing-the-time-of-test-b906fcc374a9
const takeSnapshot = () => new Promise((resolve, reject) => {
  web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_snapshot',
    id: new Date().getTime(),
  }, (err, snapshotId) => {
    if (err) return reject(err);
    return resolve(snapshotId);
  });
});

const revertToSnapShot = (id) => new Promise((resolve, reject) => {
  web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_revert',
    params: [id],
    id: new Date().getTime(),
  }, (err, result) => {
    if (err) return reject(err);
    return resolve(result);
  });
});

describe('BulkCheckout', () => {
  const [owner, user, grant1, grant2, grant3] = accounts;

  let stateId;
  let bulkCheckout;
  let dai;
  let usdc;

  beforeEach(async () => {
    // Save current ganache state
    stateId = (await takeSnapshot()).result;

    // Deploy bulk checkout contract
    bulkCheckout = await BulkCheckout.new({ from: owner });

    // Deploy a few test tokens
    dai = await TestToken.new('TestToken', 'DAI');
    usdc = await TestToken.new('TestToken', 'USDC');

    // Mint a bunch to the user
    const mintAmount = toWei('100');
    dai.mint(user, mintAmount);
    usdc.mint(user, mintAmount);

    // Approve bulkCheckout contract to spend our tokens
    dai.approve(bulkCheckout.address, MAX_UINT256, { from: user });
    usdc.approve(bulkCheckout.address, MAX_UINT256, { from: user });
  });

  afterEach(async () => {
    // Revert to restore balances to default
    await revertToSnapShot(stateId);
  });

  // ======================================= Initialization ========================================
  it('should see the deployed BulkCheckout contract', async () => {
    expect(bulkCheckout.address.startsWith('0x')).to.be.true;
    expect(bulkCheckout.address.length).to.equal(42);
  });

  // ====================================== Single Donations =======================================
  it('lets the user submit only one donation for a token', async () => {
    const donations = [
      { token: dai.address, amount: toWei('5'), dest: grant1 },
    ];
    await bulkCheckout.donate(donations, { from: user });
    expect(fromWei(await dai.balanceOf(user))).to.equal('95');
    expect(fromWei(await dai.balanceOf(grant1))).to.equal('5');
  });

  it('lets the user submit only one donation of ETH', async () => {
    const donations = [
      { token: ETH_ADDRESS, amount: toWei('5'), dest: grant1 },
    ];
    await bulkCheckout.donate(donations, { from: user, value: toWei('5') });
    expect(fromWei(await balance.current(grant1))).to.equal('105');
  });

  // ======================================= Bulk Donations ========================================
  it('lets the user submit multiple donations of the same token', async () => {
    const donations = [
      { token: dai.address, amount: toWei('5'), dest: grant1 },
      { token: dai.address, amount: toWei('10'), dest: grant2 },
      { token: dai.address, amount: toWei('25'), dest: grant3 },
    ];
    await bulkCheckout.donate(donations, { from: user });
    expect(fromWei(await dai.balanceOf(user))).to.equal('60');
    expect(fromWei(await dai.balanceOf(grant1))).to.equal('5');
    expect(fromWei(await dai.balanceOf(grant2))).to.equal('10');
    expect(fromWei(await dai.balanceOf(grant3))).to.equal('25');
  });

  it('lets the user submit multiple donations of different tokens', async () => {
    const donations = [
      { token: dai.address, amount: toWei('5'), dest: grant1 },
      { token: dai.address, amount: toWei('10'), dest: grant2 },
      { token: usdc.address, amount: toWei('25'), dest: grant3 },
    ];
    await bulkCheckout.donate(donations, { from: user });
    expect(fromWei(await dai.balanceOf(user))).to.equal('85');
    expect(fromWei(await usdc.balanceOf(user))).to.equal('75');
    expect(fromWei(await dai.balanceOf(grant1))).to.equal('5');
    expect(fromWei(await dai.balanceOf(grant2))).to.equal('10');
    expect(fromWei(await usdc.balanceOf(grant3))).to.equal('25');
  });

  it('lets the user submit multiple donations of only ETH', async () => {
    const donations = [
      { token: ETH_ADDRESS, amount: toWei('5'), dest: grant1 },
      { token: ETH_ADDRESS, amount: toWei('15'), dest: grant2 },
      { token: ETH_ADDRESS, amount: toWei('10'), dest: grant3 },
    ];
    await bulkCheckout.donate(donations, { from: user, value: toWei('30') });
    expect(fromWei(await balance.current(grant1))).to.equal('105');
    expect(fromWei(await balance.current(grant2))).to.equal('115');
    expect(fromWei(await balance.current(grant3))).to.equal('110');
  });

  it('lets the user submit multiple donations as mix of tokens and ETH', async () => {
    const donations = [
      { token: dai.address, amount: toWei('5'), dest: grant1 },
      { token: ETH_ADDRESS, amount: toWei('15'), dest: grant2 },
      { token: usdc.address, amount: toWei('25'), dest: grant3 },
    ];
    await bulkCheckout.donate(donations, { from: user, value: toWei('15') });
    expect(fromWei(await dai.balanceOf(user))).to.equal('95');
    expect(fromWei(await usdc.balanceOf(user))).to.equal('75');
    expect(fromWei(await dai.balanceOf(grant1))).to.equal('5');
    expect(fromWei(await balance.current(grant2))).to.equal('115');
    expect(fromWei(await usdc.balanceOf(grant3))).to.equal('25');
  });

  // ======================================= Error Handling ========================================
  it('reverts if too much ETH is sent', async () => {
    const donations = [
      { token: ETH_ADDRESS, amount: toWei('5'), dest: grant1 },
    ];
    await expectRevert(
      bulkCheckout.donate(donations, { from: user, value: toWei('50') }),
      'BulkCheckout: Too much ETH sent',
    );
  });

  it('reverts if too little ETH is sent', async () => {
    const donations = [
      { token: ETH_ADDRESS, amount: toWei('5'), dest: grant1 },
    ];
    await expectRevert(
      bulkCheckout.donate(donations, { from: user, value: toWei('0.5') }),
      'Address: insufficient balance',
    );
  });

  it('does not let ETH be transferred to the contract', async () => {
    await expectRevert.unspecified(
      web3.eth.sendTransaction({ to: bulkCheckout.address, from: user, value: toWei('5') }),
    );
  });
});
