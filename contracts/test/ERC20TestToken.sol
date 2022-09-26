// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ERC20TestToken is IERC20 {

    string public constant NAME = "TEST";
    string public constant SYMBOL = "TOK";
    uint8 public constant DECIMALS = 18;  

    mapping(address => uint256) private balances;

    mapping(address => mapping (address => uint256)) private allowed;
    
    uint256 private totalSupply_;

    using SafeMath for uint256;

    constructor(uint256 total) {  
        totalSupply_ = total;
        balances[msg.sender] = totalSupply_;
    }  

    function totalSupply() public view override returns (uint256) {
        return totalSupply_;
    }
    
    function balanceOf(address tokenOwner) public view override returns (uint) {
        return balances[tokenOwner];
    }

    function transfer(address receiver, uint numTokens) public override returns (bool) {
        require(numTokens <= balances[msg.sender], "insufficient balance");
        balances[msg.sender] = balances[msg.sender].sub(numTokens);
        balances[receiver] = balances[receiver].add(numTokens);
        emit Transfer(msg.sender, receiver, numTokens);
        return true;
    }

    function approve(address delegate, uint numTokens) public override returns (bool) {
        allowed[msg.sender][delegate] = numTokens;
        emit Approval(msg.sender, delegate, numTokens);
        return true;
    }

    function allowance(address owner, address delegate) public view override returns (uint) {
        return allowed[owner][delegate];
    }

    function transferFrom(address owner, address buyer, uint numTokens) public override returns (bool) {
        require(numTokens <= balances[owner], "insufficient balance");    
        require(numTokens <= allowed[owner][msg.sender], "insufficient allowance");
    
        balances[owner] = balances[owner].sub(numTokens);
        allowed[owner][msg.sender] = allowed[owner][msg.sender].sub(numTokens);
        balances[buyer] = balances[buyer].add(numTokens);
        emit Transfer(owner, buyer, numTokens);
        return true;
    }
}