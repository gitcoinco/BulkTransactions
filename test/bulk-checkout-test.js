const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const BulkCheckout = contract.fromArtifact('BulkCheckout');
const TestToken = contract.fromArtifact('TestToken');

const MAX_UINT256 = constants.MAX_UINT256.toString();
const { fromWei, toWei } = web3.utils;

describe('BulkCheckout', () => {
  const [owner, user, grant1, grant2, grant3] = accounts;

  let bulkCheckout;
  let dai;
  let usdc;

  beforeEach(async () => {
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


  it('should see the deployed BulkCheckout contract', async () => {
    expect(bulkCheckout.address.startsWith('0x')).to.be.true;
    expect(bulkCheckout.address.length).to.equal(42);
  });

  it('lets the user submit only one donation for a token', async () => {
    const donations = [
      { token: dai.address, amount: toWei('5', 'ether'), dest: grant1 },
    ];
    await bulkCheckout.donate(donations, { from: user });
    expect(fromWei(await dai.balanceOf(user))).to.equal('95');
    expect(fromWei(await dai.balanceOf(grant1))).to.equal('5');
  });

  it('lets the user submit only one donation of ETH', async () => {
    expect(true).to.equal(false);
  });

  it('lets the user submit multiple donations of the same token', async () => {
    const donations = [
      { token: dai.address, amount: toWei('5', 'ether'), dest: grant1 },
      { token: dai.address, amount: toWei('10', 'ether'), dest: grant2 },
      { token: dai.address, amount: toWei('25', 'ether'), dest: grant3 },
    ];
    await bulkCheckout.donate(donations, { from: user });
    expect(fromWei(await dai.balanceOf(user))).to.equal('60');
    expect(fromWei(await dai.balanceOf(grant1))).to.equal('5');
    expect(fromWei(await dai.balanceOf(grant2))).to.equal('10');
    expect(fromWei(await dai.balanceOf(grant3))).to.equal('25');
  });

  it('lets the user submit multiple donations of different tokens', async () => {
    const donations = [
      { token: dai.address, amount: toWei('5', 'ether'), dest: grant1 },
      { token: dai.address, amount: toWei('10', 'ether'), dest: grant2 },
      { token: usdc.address, amount: toWei('25', 'ether'), dest: grant3 },
    ];
    await bulkCheckout.donate(donations, { from: user });
    expect(fromWei(await dai.balanceOf(user))).to.equal('85');
    expect(fromWei(await usdc.balanceOf(user))).to.equal('75');
    expect(fromWei(await dai.balanceOf(grant1))).to.equal('5');
    expect(fromWei(await dai.balanceOf(grant2))).to.equal('10');
    expect(fromWei(await usdc.balanceOf(grant3))).to.equal('25');
  });

  it('lets the user submit multiple donations of only ETH', async () => {
    expect(true).to.equal(false);
  });

  it('lets the user submit multiple donations as mix of tokens and ETH', async () => {
    expect(true).to.equal(false);
  });
});
