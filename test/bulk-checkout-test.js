const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const BulkCheckout = contract.fromArtifact('BulkCheckout');
const TestToken = contract.fromArtifact('TestToken');
const SelfDestruct = contract.fromArtifact('SelfDestruct');

const MAX_UINT256 = constants.MAX_UINT256.toString();
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const { fromWei, toWei } = web3.utils;

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

describe('BulkCheckout', () => {
  const [owner, user, grant1, grant2, grant3, withdrawal] = accounts;

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
    dai = await TestToken.new('Dai', 'DAI');
    usdc = await TestToken.new('USD Coin', 'USDC');

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

  it('sets the owner upon deployment', async () => {
    expect(await bulkCheckout.owner()).to.equal(owner);
  });

  // ====================================== Single Donations =======================================
  it('lets the user submit only one donation for a token', async () => {
    const donations = [{ token: dai.address, amount: toWei('5'), dest: grant1 }];
    const receipt = await bulkCheckout.donate(donations, { from: user });
    expect(fromWei(await dai.balanceOf(user))).to.equal('95');
    expect(fromWei(await dai.balanceOf(grant1))).to.equal('5');
    expectEvent(receipt, 'DonationSent', {
      token: dai.address,
      amount: toWei('5'),
      dest: grant1,
      donor: user,
    });
  });

  it('lets the user submit only one donation of ETH', async () => {
    const donations = [{ token: ETH_ADDRESS, amount: toWei('5'), dest: grant1 }];
    const receipt = await bulkCheckout.donate(donations, { from: user, value: toWei('5') });
    expect(fromWei(await balance.current(grant1))).to.equal('105');
    expectEvent(receipt, 'DonationSent', {
      token: ETH_ADDRESS,
      amount: toWei('5'),
      dest: grant1,
      donor: user,
    });
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

  // =================================== Donation Error Handling ===================================
  it('reverts if too much ETH is sent', async () => {
    const donations = [{ token: ETH_ADDRESS, amount: toWei('5'), dest: grant1 }];
    await expectRevert(
      bulkCheckout.donate(donations, { from: user, value: toWei('50') }),
      'BulkCheckout: Too much ETH sent'
    );
  });

  it('reverts if too little ETH is sent', async () => {
    const donations = [{ token: ETH_ADDRESS, amount: toWei('5'), dest: grant1 }];
    await expectRevert(
      bulkCheckout.donate(donations, { from: user, value: toWei('0.5') }),
      'Address: insufficient balance'
    );
  });

  it('does not let ETH be transferred to the contract', async () => {
    await expectRevert.unspecified(
      web3.eth.sendTransaction({ to: bulkCheckout.address, from: user, value: toWei('5') })
    );
  });

  // ======================================== Admin Actions ========================================
  it('lets ownership be transferred by the owner', async () => {
    expect(await bulkCheckout.owner()).to.equal(owner);
    await bulkCheckout.transferOwnership(user, { from: owner });
    expect(await bulkCheckout.owner()).to.equal(user);
  });

  it('does not let anyone except the owner transfer ownership', async () => {
    await expectRevert(
      bulkCheckout.transferOwnership(user, { from: user }),
      'Ownable: caller is not the owner'
    );
  });

  it('lets the owner pause and unpause the contract', async () => {
    // Contract not paused. Make sure we cannot unpause
    expect(await bulkCheckout.paused()).to.equal(false);
    await expectRevert(bulkCheckout.unpause({ from: owner }), 'Pausable: not paused');

    // Pause it and make sure we can no longer send donations
    await bulkCheckout.pause({ from: owner });
    expect(await bulkCheckout.paused()).to.equal(true);
    const donations = [{ token: ETH_ADDRESS, amount: toWei('5'), dest: grant1 }];
    await expectRevert(
      bulkCheckout.donate(donations, { from: user, value: toWei('5') }),
      'Pausable: paused'
    );

    // Unpause and make sure everything still works
    await bulkCheckout.unpause({ from: owner });
    await bulkCheckout.donate(donations, { from: user, value: toWei('5') });
  });

  it('does not let anyone except the owner pause the contract', async () => {
    // Contract not paused. Make sure user cannot pause it
    expect(await bulkCheckout.paused()).to.equal(false);
    await expectRevert(bulkCheckout.pause({ from: user }), 'Ownable: caller is not the owner');

    // Pause contract and make sure user cannot unpause it
    await bulkCheckout.pause({ from: owner });
    expect(await bulkCheckout.paused()).to.equal(true);
    await expectRevert(bulkCheckout.unpause({ from: user }), 'Ownable: caller is not the owner');
  });

  it('lets only the owner recover stray tokens accidentally sent to the contract', async () => {
    // Send Dai to the contract
    dai.mint(bulkCheckout.address, toWei('10'));
    expect(fromWei(await dai.balanceOf(bulkCheckout.address))).to.equal('10');

    // Make sure user cannot withdrawn the tokens
    await expectRevert(
      bulkCheckout.withdrawToken(dai.address, withdrawal, { from: user }),
      'Ownable: caller is not the owner'
    );

    // Make sure owner can withdraw
    expect(fromWei(await dai.balanceOf(withdrawal))).to.equal('0');
    const receipt = await bulkCheckout.withdrawToken(dai.address, withdrawal, { from: owner });
    expect(fromWei(await dai.balanceOf(withdrawal))).to.equal('10');
    expectEvent(receipt, 'TokenWithdrawn', {
      token: dai.address,
      amount: toWei('10'),
      dest: withdrawal,
    });
  });

  it('lets only the owner recover Ether forcibly sent to the contract', async () => {
    // Deploy our self-destruct contract
    const selfDestruct = await SelfDestruct.new();

    // Send ETH to that contract
    await web3.eth.sendTransaction({ to: selfDestruct.address, from: user, value: toWei('5') });
    expect(fromWei(await balance.current(selfDestruct.address))).to.equal('5');

    // Self-destruct it
    await selfDestruct.forceEther(bulkCheckout.address, { from: user });
    expect(fromWei(await balance.current(bulkCheckout.address))).to.equal('5');

    // Make sure user cannot withdrawn the ETH
    await expectRevert(
      bulkCheckout.withdrawEther(withdrawal, { from: user }),
      'Ownable: caller is not the owner'
    );

    // Make sure owner can withdraw
    expect(fromWei(await balance.current(withdrawal))).to.equal('100'); // initial balance
    const receipt = await bulkCheckout.withdrawEther(withdrawal, { from: owner });
    expect(fromWei(await balance.current(withdrawal))).to.equal('105');
    expectEvent(receipt, 'TokenWithdrawn', {
      token: ETH_ADDRESS,
      amount: toWei('5'),
      dest: withdrawal,
    });
  });
});
