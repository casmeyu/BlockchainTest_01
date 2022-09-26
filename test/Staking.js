const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
const { constants } = require("@openzeppelin/test-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('Staking Test', () => {
    beforeEach(async () => {
        const [owner, alice, bob] = await ethers.getSigners();
        const StakingFactory = await ethers.getContractFactory('Staking');
        const currencyFactory = await ethers.getContractFactory('ERC20TestToken');

        this.currency = await currencyFactory.deploy(100000);
        expect(await this.currency.totalSupply()).to.equal(100000);
        await this.currency.deployed();

        this.Staking = await StakingFactory.deploy(this.currency.address);
        await this.Staking.deployed();

        await this.currency.transfer(alice.address, 10000);
        await this.currency.transfer(bob.address, 5000);

        await this.currency.connect(alice).approve(this.Staking.address, 10000);
    });
    // describe('ERC20 Currency', async () => {
    //     const [owner, alice, bob] = await ethers.getSigners();
    describe('ERC20 Currency', () => {
        it('Should delegate the contract to handle x amount of ERC20tokens', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            await this.currency.connect(bob).approve(this.Staking.address, 5000);
            expect(await this.currency.connect(bob).allowance(bob.address, this.Staking.address)).to.equal(5000);
        });
    });
    

    describe('Staking approveAllowance', () => {
        it('Should fail to approve Staking allowance if not owner', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            await expect(
                this.Staking.connect(bob).approveReward(alice.address, 6000)
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });
        it('Should fail to approve Staking to zero address', async () => {
            await expect(
                this.Staking.approveReward(constants.ZERO_ADDRESS, 6000)
            ).to.be.revertedWith('Can not approve address zero.');
        });
        it('Should approve Staking allowance for alice', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            // console.log('REMEMBER TO CHANGE _rewardAllowances mapping to PRIVATE')
            await this.Staking.approveReward(alice.address, 1000);
            // expect(await this.Staking._rewardAllowances(alice.address)).to.equal(1000);
        });
    })
    
    describe('Staking addReward', () => {
        it('Should fail to add reward if caller is not approved', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            await this.currency.connect(bob).approve(this.Staking.address, 5000);
            await expect(this.Staking.connect(bob).addReward(100)).to.be.revertedWith('Retrieval value exceed authorized limit.');
        })
        it('Should fail to addReward if it is greater than the _rewardAllowance', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            await this.Staking.approveReward(alice.address, 100);
            await expect(this.Staking.connect(alice).addReward(101)).to.be.revertedWith('Retrieval value exceed authorized limit.');
        })
        it('addReward should work if approved and the amount is less than _rewardAllowance', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            const _aliceBalance = await this.currency.balanceOf(alice.address);
            const _allowance = 100;
            const _amount = 80;

            await this.Staking.approveReward(alice.address, _allowance);
            expect(await this.Staking.rewardTotal()).to.equal(0);

            await this.Staking.connect(alice).addReward(_amount);
            // Staking contract should have the tokens
            expect(await this.currency.balanceOf(this.Staking.address)).to.equal(_amount);

            expect(await this.Staking.rewardTotal()).to.equal(_amount);
            expect(await this.currency.balanceOf(alice.address)).to.equal(_aliceBalance - _amount);
        })
    });

    describe('Staking deposit', () => {
        it('Should fail if _rewardTotal is zero', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            await expect(this.Staking.connect(bob).deposit(100)).to.be.revertedWith('Not enough token to pay 2% reward.');
        });
        it('Should fail if there is not enough money to return the Staked tokens and the reward', async () => {
            const [owner, alice, bob] = await ethers.getSigners();

            await this.Staking.approveReward(alice.address, 1000);
            await this.Staking.connect(alice).addReward(1000);
            await expect(this.Staking.connect(alice).deposit(999)).to.be.revertedWith('Not enough token to pay 2% reward.');
            await expect(this.Staking.connect(bob).deposit(99999)).to.be.revertedWith('Not enough token to pay 2% reward.');
        });
        it('deposit should work if able to pay 2% of reward', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            const _aliceBalance = this.currency.balanceOf(alice.address);
            await this.Staking.approveReward(alice.address, 1000);
            await this.Staking.connect(alice).addReward(100);

            const lastDepositTime = await this.Staking.lastDepositTime(alice.address);
            expect(lastDepositTime).to.equal(0);
            await this.Staking.connect(alice).deposit(50);

            expect(await this.Staking.totalStaked()).to.equal(50);
            expect(await this.currency.balanceOf(this.Staking.address)).to.equal(150);

            expect(await this.Staking.lastDepositTime(alice.address)).to.be.greaterThan(lastDepositTime);
            expect(await this.Staking.balanceOf(alice.address)).to.equal(50);
            
        });
        it('alice should be able to deposit even if she did not added the reward herself', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            const _aliceBalance = this.currency.balanceOf(alice.address);
            await this.Staking.approveReward(alice.address, 1000);
            await this.Staking.approveReward(bob.address, 1000);
            await this.currency.connect(bob).approve(this.Staking.address, 1000);
            await this.Staking.connect(bob).addReward(100);

            const lastDepositTime = await this.Staking.lastDepositTime(alice.address);
            expect(lastDepositTime).to.equal(0);
            await this.Staking.connect(alice).deposit(50);
            expect(await this.currency.balanceOf(this.Staking.address)).to.equal(150);

            expect(await this.Staking.lastDepositTime(alice.address)).to.be.greaterThan(lastDepositTime);
            expect(await this.Staking.balanceOf(alice.address)).to.equal(50);
            
        })
    });

    describe('Staking setDuration', () => {
        it('Should fail if not owner', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            await expect(this.Staking.connect(alice).setDuration(5)).to.be.revertedWith('Ownable: caller is not the owner');
        })
        it('Should fail if set a duration < 1 week', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            const _duration = 6 * 60 * 60 * 24 // 6 days
            await expect(this.Staking.setDuration(_duration)).to.be.revertedWith('Duration should be at least 1 week.');
        })
        it('setDuration should work', async () => {
            const [owner, alice, bob] = await ethers.getSigners();
            let _duration = 8 * 60 * 60 * 24 // 8 days
            await this.Staking.setDuration(_duration);
            expect(await this.Staking.getDuration()).to.equal(_duration);
            _duration = 12 * 7 * 60 * 60 * 24 // 12 weeks
            await this.Staking.setDuration(_duration);
            expect(await this.Staking.getDuration()).to.equal(_duration);
        })
    });

    describe('Staking withdraw', () => {
        it('Should fail if the minimum staking duration did not passed', async () => {
            const [owner, alice, bob] = await ethers.getSigners();

            await this.Staking.approveReward(alice.address, 1000);
            await this.Staking.connect(alice).addReward(100);
            await this.Staking.connect(alice).deposit(80);
            
            const future = (1 * 7 * 24 * 60 * 60);
            // Jump x weeks into the future
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            
            await ethers.provider.send('evm_increaseTime', [future]);
            await ethers.provider.send('evm_mine');

            const blockNumAfter = await ethers.provider.getBlockNumber();
            const blockAfter = await ethers.provider.getBlock(blockNumAfter);
            const timestampAfter = blockAfter.timestamp;
            // Im in the future now
            await expect(this.Staking.connect(alice).withdraw())
                .to.be.revertedWith('You can not withdraw until you staked for the minimum duration.');
        });
        // Could never activate this path
        // it('Should fail if missing ERC20 staking tokens on contract', async () => {
        //     const [owner, alice, bob] = await ethers.getSigners();

        //     await this.Staking.approveReward(alice.address, 1000);
        //     await this.Staking.connect(alice).deposit(80);
        //     console.log('deposited');
        //     await this.Staking.connect(alice).addReward(80);
        //     console.log('added reward');
            

        //     const week = (7 * 24 * 60 * 60);
        //     // Jump x weeks into the future
        //     const blockNumBefore = await ethers.provider.getBlockNumber();
        //     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        //     const timestampBefore = blockBefore.timestamp;
            
        //     await ethers.provider.send('evm_increaseTime', [10 * 12 * 4 * week]);
        //     await ethers.provider.send('evm_mine');



        //     // await expect(this.Staking.withdraw()).to.be.revertedWith('Missing ERC20 tokens on contract');
            
        // })
        it('withdraw should work if the minimum duration has passed', async () => {
            const [owner, alice, bob] = await ethers.getSigners();

            await this.Staking.approveReward(alice.address, 1000);
            await this.Staking.connect(alice).addReward(100);
            await this.Staking.connect(alice).deposit(80);
            
            const future = (8 * 7 * 24 * 60 * 60);
            // Jump x weeks into the future
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            
            await ethers.provider.send('evm_increaseTime', [future]);
            await ethers.provider.send('evm_mine');

            const blockNumAfter = await ethers.provider.getBlockNumber();
            const blockAfter = await ethers.provider.getBlock(blockNumAfter);
            const timestampAfter = blockAfter.timestamp;

            const aliceERC20OldBalance = await this.currency.balanceOf(alice.address);
            const aliceOldStaking = await this.Staking.balanceOf(alice.address);
            const aliceReward = Math.floor(((timestampAfter - timestampBefore) * 2 * aliceOldStaking) / ((4 * 7 * 24 * 60 * 60) * 100));

            await this.Staking.connect(alice).withdraw();
            expect(await this.currency.balanceOf(alice.address)).to.be.greaterThan(aliceERC20OldBalance);
            expect(await this.Staking.balanceOf(alice.address)).to.equal(0);
            expect(
                await this.currency.balanceOf(alice.address))
                .to.equal(
                    aliceERC20OldBalance.toNumber() +
                    aliceOldStaking.toNumber() +
                    aliceReward
            );
        })
    })
});