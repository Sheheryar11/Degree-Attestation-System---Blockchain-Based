import { expect } from 'chai';
import { ethers } from 'hardhat';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { DegreeAttestation } from '../typechain-types';

describe('DegreeAttestation', () => {
  let contract: DegreeAttestation;
  let owner: Awaited<ReturnType<typeof ethers.getSigner>>;
  let stranger: Awaited<ReturnType<typeof ethers.getSigner>>;

  const DEGREE_ID = 'HEC-2024-CS-00001';
  // A valid 64-char hex SHA-256 hash
  const DEGREE_HASH = 'a'.repeat(64);
  const UNI = 'University of Engineering & Technology Lahore';
  const DEGREE_NAME = 'Bachelor of Computer Science';
  const GRAD_YEAR = '2024';
  const ATTEST_ID = 'APP-2024-00001';

  beforeEach(async () => {
    [owner, stranger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('DegreeAttestation');
    contract = (await factory.deploy()) as DegreeAttestation;
    await contract.waitForDeployment();
  });

  describe('Deployment', () => {
    it('sets deployer as owner', async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe('registerDegree', () => {
    it('registers a degree and emits event', async () => {
      await expect(
        contract.registerDegree(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID)
      )
        .to.emit(contract, 'DegreeRegistered')
        .withArgs(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID, anyValue);
    });

    it('reverts when called by non-owner', async () => {
      await expect(
        contract.connect(stranger).registerDegree(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID)
      ).to.be.revertedWith('DegreeAttestation: caller is not the owner');
    });

    it('reverts on duplicate degreeId', async () => {
      await contract.registerDegree(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID);
      await expect(
        contract.registerDegree(DEGREE_ID, 'b'.repeat(64), UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID)
      ).to.be.revertedWith('DegreeAttestation: degree already registered');
    });

    it('reverts on duplicate hash', async () => {
      await contract.registerDegree(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID);
      await expect(
        contract.registerDegree('OTHER-ID', DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID)
      ).to.be.revertedWith('DegreeAttestation: hash already registered');
    });

    it('reverts on invalid hash length', async () => {
      await expect(
        contract.registerDegree(DEGREE_ID, 'tooshort', UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID)
      ).to.be.revertedWith('DegreeAttestation: invalid SHA-256 hash length');
    });

    it('reverts on empty degreeId', async () => {
      await expect(
        contract.registerDegree('', DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID)
      ).to.be.revertedWith('DegreeAttestation: empty degreeId');
    });
  });

  describe('verifyDegree', () => {
    beforeEach(async () => {
      await contract.registerDegree(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID);
    });

    it('returns correct data for registered degree', async () => {
      const result = await contract.verifyDegree(DEGREE_ID);
      expect(result.isValid).to.be.true;
      expect(result.isRevoked).to.be.false;
      expect(result.degreeHash).to.equal(DEGREE_HASH);
      expect(result.universityName).to.equal(UNI);
      expect(result.degreeName).to.equal(DEGREE_NAME);
      expect(result.graduationYear).to.equal(GRAD_YEAR);
      expect(result.attestationId).to.equal(ATTEST_ID);
    });

    it('returns isValid=false for unknown degree', async () => {
      const result = await contract.verifyDegree('UNKNOWN');
      expect(result.isValid).to.be.false;
    });
  });

  describe('revokeDegree', () => {
    beforeEach(async () => {
      await contract.registerDegree(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID);
    });

    it('revokes a degree and emits event', async () => {
      await expect(contract.revokeDegree(DEGREE_ID))
        .to.emit(contract, 'DegreeRevoked')
        .withArgs(DEGREE_ID, anyValue);
    });

    it('marks degree as revoked after revocation', async () => {
      await contract.revokeDegree(DEGREE_ID);
      const result = await contract.verifyDegree(DEGREE_ID);
      expect(result.isValid).to.be.true;
      expect(result.isRevoked).to.be.true;
    });

    it('reverts on double revocation', async () => {
      await contract.revokeDegree(DEGREE_ID);
      await expect(contract.revokeDegree(DEGREE_ID)).to.be.revertedWith('DegreeAttestation: already revoked');
    });

    it('reverts when called by non-owner', async () => {
      await expect(contract.connect(stranger).revokeDegree(DEGREE_ID)).to.be.revertedWith(
        'DegreeAttestation: caller is not the owner',
      );
    });
  });

  describe('getDegreeIdByHash', () => {
    it('returns degreeId for known hash', async () => {
      await contract.registerDegree(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID);
      expect(await contract.getDegreeIdByHash(DEGREE_HASH)).to.equal(DEGREE_ID);
    });

    it('returns empty string for unknown hash', async () => {
      expect(await contract.getDegreeIdByHash('c'.repeat(64))).to.equal('');
    });
  });

  describe('verifyHash', () => {
    beforeEach(async () => {
      await contract.registerDegree(DEGREE_ID, DEGREE_HASH, UNI, DEGREE_NAME, GRAD_YEAR, ATTEST_ID);
    });

    it('returns registered+active for known active hash', async () => {
      const { isRegistered, isActive } = await contract.verifyHash(DEGREE_HASH);
      expect(isRegistered).to.be.true;
      expect(isActive).to.be.true;
    });

    it('returns registered+inactive after revocation', async () => {
      await contract.revokeDegree(DEGREE_ID);
      const { isRegistered, isActive } = await contract.verifyHash(DEGREE_HASH);
      expect(isRegistered).to.be.true;
      expect(isActive).to.be.false;
    });

    it('returns false/false for unknown hash', async () => {
      const { isRegistered, isActive } = await contract.verifyHash('d'.repeat(64));
      expect(isRegistered).to.be.false;
      expect(isActive).to.be.false;
    });
  });

  describe('transferOwnership', () => {
    it('transfers ownership and emits event', async () => {
      await expect(contract.transferOwnership(stranger.address))
        .to.emit(contract, 'OwnershipTransferred')
        .withArgs(owner.address, stranger.address);
      expect(await contract.owner()).to.equal(stranger.address);
    });

    it('reverts transfer to zero address', async () => {
      await expect(contract.transferOwnership(ethers.ZeroAddress)).to.be.revertedWith(
        'DegreeAttestation: zero address',
      );
    });

    it('reverts when called by non-owner', async () => {
      await expect(contract.connect(stranger).transferOwnership(stranger.address)).to.be.revertedWith(
        'DegreeAttestation: caller is not the owner',
      );
    });
  });
});

async function latestTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock('latest');
  return block!.timestamp;
}
