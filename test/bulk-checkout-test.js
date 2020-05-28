const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const BulkCheckout = contract.fromArtifact('BulkCheckout');

describe('BulkCheckout', () => {
  const [owner] = accounts;

  before(async () => {
    this.bulkCheckout = await BulkCheckout.new({ from: owner });
  });


  it('should see the deployed BulkCheckout contract', async () => {
    expect(this.bulkCheckout.address.startsWith('0x')).to.be.true;
    expect(this.bulkCheckout.address.length).to.equal(42);
  });

  it('lets the user submit only one donation for a token', async () => {
    expect(true).to.equal(false);
  });

  it('lets the user submit only one donation of ETH', async () => {
    expect(true).to.equal(false);
  });

  it('lets the user submit multiple donations of only tokens', async () => {
    expect(true).to.equal(false);
  });

  it('lets the user submit multiple donations of only ETH', async () => {
    expect(true).to.equal(false);
  });

  it('lets the user submit multiple donations as mix of tokens and ETH', async () => {
    expect(true).to.equal(false);
  });
});
