// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "./ICampaignSale.sol";

/* CampaingSale Contract
# Enables users to publish their projects in order to raise money in the form of ERC20 tokens.
# A campaign lasts for a duration and has to raise a minimum goal to unlock
# the development of the project & the tokens invested by contributors. Otherwise, the contributors can get refunded.
*/

contract CampaignSale is ICampaignSale, Ownable {
    // using SafeERC20 for IERC20;
    // using SafeMath for uint256;
    // The IERC20 token
    IERC20 public _ierc20;

    

    using Counters for Counters.Counter;
    /// @notice counter for the campaing id's
    Counters.Counter private campaignCounter;
    /// @notice mapping for storing the campaigns. id -> campaingInfo
    mapping(uint256 => Campaign) public activeCampaigns;
    /// @notice mapping for storig the staked amount of each user based on the campaign
    /// uint256 amountStaked = campaignStakings[campaignId][staker.address]
    mapping(uint256 => mapping(address => uint256)) private campaignStakings;
    
    modifier RunningCampaign (uint256 _id){
        require(activeCampaigns[_id].creator != address(0), 'Campaign does not exist.');
        require(block.timestamp >= activeCampaigns[_id].startAt, 'The campaign has not started yet.');
        require(block.timestamp <= activeCampaigns[_id].endAt, 'The campaign has already finished.');
        _;
    }

    constructor(IERC20 ierc20) {
        _ierc20 = ierc20;
    }

    /// @notice Launch a new campaign. 
    /// @param _goal The goal in token to raise to unlock the tokens for the project
    /// @param _startAt Starting date of the campaign
    /// @param _endAt Ending date of the campaign
    function launchCampaign(
        uint _goal,
        uint32 _startAt,
        uint32 _endAt
    ) external override {
        require(_startAt > block.timestamp, 'You can not create a campaign in the past.');
        require(_endAt > _startAt, 'Campaign duration can not be negative.');
        // Check that the campaign last less or equal to 90 days
        require((_endAt - _startAt) <= (90 * 24 * 60 * 60), 'Campaign should last at max 90 days.');
        require(_goal > 0, 'Campaign goal has to be greater than zero.');

        campaignCounter.increment();
        activeCampaigns[campaignCounter.current()] = Campaign({
            creator: msg.sender,
            goal: _goal,
            pledged: 0,
            startAt: _startAt,
            endAt: _endAt,
            claimed: false
        });
        
        emit LaunchCampaign(
            campaignCounter.current(),
            msg.sender,
            _goal,
            _startAt,
            _endAt
        );
    }

    /// @notice Cancel a campaign
    /// @param _id Campaign's id
    function cancelCampaign(uint _id) external override {
        require(activeCampaigns[_id].creator != address(0), 'Campaign does not exist.');
        require(msg.sender == activeCampaigns[_id].creator, 'Only the creator can cancel a campaign.');
        require(block.timestamp < activeCampaigns[_id].startAt, 'Can not cancel an already started campaign.');
        delete activeCampaigns[_id];

        emit CancelCampaign(_id);
    }

    /// @notice Contribute to the campaign for the given amount
    /// @param _id Campaign's id
    /// @param _amount Amount of the contribution    
    function contribute(uint _id, uint _amount) RunningCampaign(_id) external override {
        require(_amount > 0, 'amount can not be zero.');

        campaignStakings[_id][msg.sender] += _amount;
        activeCampaigns[_id].pledged += _amount;

        _ierc20.transferFrom(msg.sender, address(this), _amount);
        emit Contribute(_id, msg.sender, _amount);
    }

    /// @notice Withdraw an amount from your contribution
    /// @param _id Campaign's id
    /// @param _amount Amount of the contribution to withdraw
    function withdraw(uint _id, uint _amount) RunningCampaign(_id) external override {
        // This require is duplicated in the RunningCampaign modifier
        // If i remove it all tests run ok but the coverage of unrelated contracts plummets
        require(activeCampaigns[_id].creator != address(0), 'Campaign does not exist.');
        require(campaignStakings[_id][msg.sender] >= _amount, 'You can not withdraw that amount.');

        campaignStakings[_id][msg.sender] -= _amount;
        
        _ierc20.transfer(msg.sender, _amount);
        emit Withdraw(_id, msg.sender, _amount);
    }

    /// @notice Claim all the tokens from the campaign
    /// @param _id Campaign's id
    function claimCampaign(uint _id) external override {
        require(activeCampaigns[_id].creator != address(0), 'Campaign does not exist.');
        require(activeCampaigns[_id].creator == msg.sender, 'You are not the creator of this campaing.');
        require(block.timestamp >= activeCampaigns[_id].endAt, 'The campaign has not finished yet.');
        // This require even when tested OK breaks all the coverage
        require(activeCampaigns[_id].claimed == false, 'The campaign has already been claimed.');

        
        // delete campaignStakings[_id]; error because of fouble mapping
        uint256 amount = activeCampaigns[_id].pledged;
        activeCampaigns[_id].pledged = 0;
        activeCampaigns[_id].claimed = true;
        
        _ierc20.transfer(activeCampaigns[_id].creator, amount);
        emit ClaimCampaign(_id);
    }

    /// @notice Refund all the tokens to the sender
    /// @param _id Campaign's id
    function refundCampaign(uint _id) external override {
        // TEST THIS REQUIRE
        require(activeCampaigns[_id].creator != address(0), 'Campaign does not exist.');
        require(campaignStakings[_id][msg.sender] > 0, 'You have not contributed to this campaign.');
        require(activeCampaigns[_id].claimed == false, 'The campaign has already been claimed.');
        if (block.timestamp >= activeCampaigns[_id].endAt) {
            
            require(activeCampaigns[_id].pledged < activeCampaigns[_id].goal, 'The campaign reach its goal.');
        }
        uint256 amount = campaignStakings[_id][msg.sender];
        delete campaignStakings[_id][msg.sender];

        _ierc20.transfer(msg.sender, amount);
        emit RefundCampaign(_id, msg.sender, amount);
    }

    /// @notice Get the campaign info
    /// @param _id Campaign's id
    function getCampaign(uint _id) external view override returns (Campaign memory campaign) {
        require(activeCampaigns[_id].creator != address(0), 'Campaign does not exist.');

        return (activeCampaigns[_id]);
    }
}