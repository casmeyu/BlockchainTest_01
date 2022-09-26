const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
const { constants } = require("@openzeppelin/test-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const goToTheFuture = async (time) => {
    await ethers.provider.send('evm_increaseTime', [time]);
    await ethers.provider.send('evm_mine');
}

describe('CampaignSale', () => {
    let owner, alice, bob;
    beforeEach(async () => {
        [owner, alice, bob] = await ethers.getSigners();
        const CSFactory = await ethers.getContractFactory('CampaignSale');
        const ERC20Factory = await ethers.getContractFactory('ERC20TestToken');
        this.currency = await ERC20Factory.deploy(100000);
        await this.currency.deployed();
        this.CS = await CSFactory.deploy(this.currency.address);
        await this.CS.deployed();
    })
    
    describe('launchCampaign', () => {
        it('Should fail to add a campaign in the past', async () => {
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await expect(this.CS.launchCampaign(1000, (timestamp - week), (timestamp + (5 * week))))
                .to.be.revertedWith('You can not create a campaign in the past.');
        })
        it('Should fail to add a campaign with negative duration', async () => {
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await expect(this.CS.launchCampaign(1000, (timestamp + week), (timestamp - (5 * week))))
                .to.be.revertedWith('Campaign duration can not be negative.');
        })
        it('Should fail to add a campaign longer than 90 days', async () => {
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            // Setting duration of 120 days
            await expect(this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (4 * 4 * week))))
                .to.be.revertedWith('Campaign should last at max 90 days.');
        })
        it('Should fail to add a campaign with a goal of zero', async () => {
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await expect(this.CS.launchCampaign(0, (timestamp + week), (timestamp + (5 * week))))
                .to.be.revertedWith('Campaign goal has to be greater than zero.');
        })
        it('launchCampaign should work', async () => {
            
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));

            const newCampaign = await this.CS.activeCampaigns(1);
            expect(newCampaign.creator).to.equal(owner.address);
            expect(newCampaign.goal).to.equal(1000);
            expect(newCampaign.claimed).to.equal(false);
        })
    });
    
    describe('cancelCampaign', () => {
        it('Should fail if the campaign does not exist', async () => {
            
            await expect(this.CS.cancelCampaign(256)).to.be.revertedWith('Campaign does not exist.')
        })
        it('Should fail to cancel if not the proyect owner', async () => {
            
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));
            await expect(this.CS.connect(alice).cancelCampaign(1)).to.be.revertedWith('Only the creator can cancel a campaign.');
        })
        it('Should fail to cancel if the campaign already started', async () => {
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));

            await goToTheFuture(2 * week);

            await expect(this.CS.cancelCampaign(1)).to.be.revertedWith('Can not cancel an already started campaign.');
        })
        it('cancelCampaign should work', async () => {
            
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));
            const newCampaign = await this.CS.activeCampaigns(1);
            await this.CS.cancelCampaign(1);
            expect(await this.CS.activeCampaigns(1)).to.not.equal(newCampaign);
        })
    });

    describe('contribute', () => {
        it('Should fail if the campaign does not exist', async () => {
            
            await expect(this.CS.contribute(256, 10)).to.be.revertedWith('Campaign does not exist.')
        })
        it('Should fail to contribute to a campaign that did not START', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);

            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));
            const newCampaign = await this.CS.activeCampaigns(1);
            await expect(this.CS.connect(alice).contribute(1, 500)).to.be.revertedWith('The campaign has not started yet.');
        })
        it('Should fail to contribute to a campaign already ended', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 5000);

            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));
            const newCampaign = await this.CS.activeCampaigns(1);

            //Going to the future
            await goToTheFuture(9 * week);

            await expect(this.CS.connect(alice).contribute(1, 500)).to.be.revertedWith('The campaign has already finished.');
        })
        it('Should fail to contribute 0 tokens', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);

            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));
            
            //Going to the future
            await goToTheFuture(2 * week);

            await expect(this.CS.connect(alice).contribute(1, 0)).to.be.revertedWith('amount can not be zero.');
        })
        it('contribute should work', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);

            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));
            
            //Going to the future
            await goToTheFuture(2 * week);

            await this.CS.connect(alice).contribute(1, 500);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(500);
        })

    });

    describe('withdraw', () => {
        it('Should fail if the campaign does not exist', async () => {
            
            await expect(this.CS.withdraw(256, 50)).to.be.revertedWith('Campaign does not exist.')
        })
        it('Should fail to withdraw if the campaign did not start yet', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);

            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            const timestamp = block.timestamp;
            const week = 7 * 24 * 60 * 60
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (5 * week)));
            await expect(this.CS.connect(alice).withdraw(1, 100)).to.be.revertedWith('The campaign has not started yet.');
        })
        it('Should fail to withdraw if the campaign has ended', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60

            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (4 * week)));

            await goToTheFuture(2 * week);

            await this.CS.connect(alice).contribute(1, 500);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(500);

            await goToTheFuture(12 * week);

            blockNum = await ethers.provider.getBlockNumber();
            block = await ethers.provider.getBlock(blockNum);
            timestamp = block.timestamp;

            await expect(this.CS.connect(alice).withdraw(1, 500)).to.be.revertedWith('The campaign has already finished.');
            
        })
        it('Should fail to withdraw more than i have contributed', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60

            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (6 * week)));
            
            await goToTheFuture(2 * week);

            await this.CS.connect(alice).contribute(1, 500);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(500);
            
            await expect(this.CS.connect(alice).withdraw(1, 5000)).to.be.revertedWith('You can not withdraw that amount.');
        })
        it('withdraw should work', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60

            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (6 * week)));
            
            await goToTheFuture(2 * week);

            // console.log(`alice INITIAL currency: ${await this.currency.balanceOf(alice.address)}`);
            await this.CS.connect(alice).contribute(1, 500);
            // console.log(`alice AFTER CONTRIBUTE currency: ${await this.currency.balanceOf(alice.address)}`);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(500);
            expect(await this.currency.balanceOf(alice.address)).to.equal(500);

            await this.CS.connect(alice).withdraw(1, 100);
            // console.log(`alice AFTER WITHDRAW currency: ${await this.currency.balanceOf(alice.address)}`);
            expect(await this.currency.balanceOf(alice.address)).to.equal(600);
            await this.CS.connect(alice).withdraw(1, 400);
            // console.log(`alice AFTER WITHDRAW currency: ${await this.currency.balanceOf(alice.address)}`);
            expect(await this.currency.balanceOf(alice.address)).to.equal(1000);
        })
    });

    describe('claimCampaign', () => {
        it('Should fail if the campaign does not exist', async () => {
            
            await expect(this.CS.claimCampaign(256)).to.be.revertedWith('Campaign does not exist.')
        })
        it('Should fail if you are not the creator of the campaign', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60

            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (4 * week)));
            
            await goToTheFuture(2 * week);
            // console.log(`alice INITIAL currency: ${await this.currency.balanceOf(alice.address)}`);
            await this.CS.connect(alice).contribute(1, 500);
            // console.log(`alice AFTER CONTRIBUTE currency: ${await this.currency.balanceOf(alice.address)}`);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(500);

            await goToTheFuture(5 * week);

            await expect(this.CS.connect(alice).claimCampaign(1)).to.be.revertedWith('You are not the creator of this campaing.');
        })
        it('Should fail to claim if the campaign has not finish yet', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60

            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (6 * week)));
            
            // Going to the future
            await goToTheFuture(2 * week);
            await ethers.provider.send('evm_mine');

            // console.log(`alice INITIAL currency: ${await this.currency.balanceOf(alice.address)}`);
            await this.CS.connect(alice).contribute(1, 500);
            // console.log(`alice AFTER CONTRIBUTE currency: ${await this.currency.balanceOf(alice.address)}`);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(500);

            await expect(this.CS.claimCampaign(1)).to.be.revertedWith('The campaign has not finished yet.');
        })
        it('Should fail to claim if the campaign has already been claimed', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60

            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (4 * week)));
            
            await goToTheFuture(2 * week);

            // console.log(`alice INITIAL currency: ${await this.currency.balanceOf(alice.address)}`);
            await this.CS.connect(alice).contribute(1, 500);
            // console.log(`alice AFTER CONTRIBUTE currency: ${await this.currency.balanceOf(alice.address)}`);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(500);

            await goToTheFuture(5 * week);

            await this.CS.claimCampaign(1);

            await expect(this.CS.claimCampaign(1)).to.be.revertedWith('The campaign has already been claimed.');
        })
        it('claimCampaign should work', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60

            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1000, (timestamp + week), (timestamp + (4 * week)));
            
            await goToTheFuture(2 * week);
            // console.log(`alice INITIAL currency: ${await this.currency.balanceOf(alice.address)}`);
            await this.CS.connect(alice).contribute(1, 500);
            // console.log(`alice AFTER CONTRIBUTE currency: ${await this.currency.balanceOf(alice.address)}`);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(500);

            await goToTheFuture(5 * week);

            await this.CS.claimCampaign(1);
            expect(await this.currency.balanceOf(owner.address)).to.equal(99500);
            expect((await this.CS.activeCampaigns(1)).pledged).to.equal(0);
            expect((await this.CS.activeCampaigns(1)).claimed).to.equal(true);
        })
    });

    describe('refundCampaing', () => {
        it('Should fail if the campaign does not exist', async () => {
            
            await expect(this.CS.refundCampaign(256)).to.be.revertedWith('Campaign does not exist.')
        })
        it('Should fail if the campaing reach its goal', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 2000);
            this.currency.connect(alice).approve(this.CS.address, 2000);
            const week = 7 * 24 * 60 * 60
    
            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1500, (timestamp + week), (timestamp + (6 * week)));
    
            await goToTheFuture(1.5 * week);

            await this.CS.connect(alice).contribute(1, 1600);
            await goToTheFuture(9 * week);
            
            await expect(this.CS.connect(alice).refundCampaign(1)).to.be.revertedWith('The campaign reach its goal.');
        })
        it('Should fail if the campaign has already been claimed', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60
    
            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(500, (timestamp + week), (timestamp + (6 * week)));
    
            await goToTheFuture(1.5 * week);
            await this.CS.connect(alice).contribute(1, 600);
            await goToTheFuture(9 * week);
            await this.CS.claimCampaign(1);

            await expect(this.CS.connect(alice).refundCampaign(1)).to.be.revertedWith('The campaign has already been claimed.');

        })
        it('refundCampaign should work', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 1000);
            this.currency.connect(alice).approve(this.CS.address, 1000);
            const week = 7 * 24 * 60 * 60
    
            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1500, (timestamp + week), (timestamp + (6 * week)));
    
            await goToTheFuture(1.5 * week);

            await this.CS.connect(alice).contribute(1, 500);

            await goToTheFuture(9 * week);
            
            await this.CS.connect(alice).refundCampaign(1);
            expect(await this.currency.balanceOf(alice.address)).to.equal(1000);
        })
    });

    describe('getCampaign', () => {
        it('Should fail if the campaign does not exist', async () => {
            
            await expect(this.CS.refundCampaign(256)).to.be.revertedWith('Campaign does not exist.')
        })
        it('getCampaign should work', async () => {
            
            // Sending some ERC20 to alice
            this.currency.transfer(alice.address, 2000);
            this.currency.connect(alice).approve(this.CS.address, 2000);
            const week = 7 * 24 * 60 * 60
    
            let blockNum = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNum);
            let timestamp = block.timestamp;
            
            await this.CS.launchCampaign(1500, (timestamp + week), (timestamp + (6 * week)));
    
            await goToTheFuture(1.5 * week);

            await this.CS.connect(alice).contribute(1, 1600);
            await goToTheFuture(9 * week);

            const campaign = await this.CS.getCampaign(1);
            expect(campaign.creator).to.equal(owner.address);
            expect(campaign.pledged).to.equal(1600);
            expect(campaign.goal).to.equal(1500);
            expect(campaign.claimed).to.equal(false);
        })
    })
})