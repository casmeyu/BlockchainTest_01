# Infuy Blockchain Test

requires npm > 16.x

```
npm install -y
npx hardhat coverage
npx hardhat test
```

## Blockchain technical tests
## General Questions					

### A)  In Ethereum and blockchain ecosystem in general, what are the use-cases of hash functions?

Hash Functions are escential to blockchain in general.
For example Ethereum uses a Merkle (Ptricia) Tree, wich is a type of binary tree that uses a hash as the node value.
This node's hash is based on the combination and encryption of its child nodes. This way, if any change would to happen
to any node, the hashes would be completly different.
The merkle root of a transaction is a merkle tree where all the transactions start as the leafs, and the root is calculated on that base.
Also each block hash is based on the hash of the previous one, this way if any block changed the chain would differ.

Also in the private/public keys workflow for digital signatures (like ssh or https).
A user has a private and a public key (wallet address: Keccak-256 hash of the public key).
The user shares his public key with alice, then he can encrypt a message with his PRIVATE and send it to alice, who can decrypte it with the users public key.
This is fine, but, anyone who knows the public key of the user could decipher the message, so a solution for this is that:
The user and alice both know each others public keys.
Then the user signs the message first encrypts the message with HIS OWN private key and then with ALICE PUBLIC KEY.
This way alice knows its for her since only she can decrypted it, and then its asured that it came from the user since it decrypts again with his public key.

In blockchhain one generates a random private key, then the public is generated based on that, signs the message with his private and that is authenticated with his public and the signed message (checking that the address is the same one).

### B)  What are the bottlenecks in terms of performance when operating on a network like Ethereum? What kind of solutions can be utilized to overcome them?						 								

One of the main bottlenecks in the ethereum in congestion in the network.
That is why sidechains are an example of a kind of solution for this problem.
I think that they work by sending information about their state to the main ethereum network from time to time.
They are their own separate blockchain, so they handle their own transactions and have their own currency (for example Polygon).
They can have their own conensus and security on top or apart from the ethereum one, so that is one thing to be aware of.

Another options are Ethereum Rollups.
A rollup lets you bundle a bunch of transactions as data into as signle one. This cheapens the cost if you have to constinuesly do a lot of transactions, since its a single one the gas is divided among the transactions senders and the network gets lot less trafic and greater transaction times.

### C)  What are the different types of bridges and how do they work ? Explain in detail step by step how bridging an ERC721 would work.

The two main categories of bridges are trust based and trustless bridges, basically the same applies here as custodial and non-custodial wallets.
Trust based bridges force you to TRUST in a centralized authority to handle your tokens and transactions.
Where as trustless are run purely by contract/s logic. Usually requiring multiple signatures to make changes. (One has to be careful as some times the required signatures are some what centralized).
Bridge workflow:
The NFT is send and locked on the bridge contract on the blockchain A (with the RECIPIENT address of in blockchain B).
An oracle is necessary to determin whether this transaction was validated on blockchain A.
Then the contract on blockchain B creates the exact token/s that where locked on blockchain A.
For example for an NFT the user locks the token on the contract and then calls the bridge on blockchain B with the necesary signature
and a replica version of the NFT is transfered to him on that blockchain.
The original is still locked on the bridge contract.
Then there are 2 main options if the user wants to transfer it back to the original chain.
1) The replica token/s could be locked and the process would happen in reverse (an oracle verifies that it can be retrieved on blockchain A).
2) The replica token/s are just burned and retrieved on blockchain A.


### D)  Describe the EIP-2771 standard with your own words and describe some use cases using this EIP.

The EIP-2771 is a standard for meta-transactions ("gasless" transatcions). This standards delegates a RELAYER. 
Which is the responsible for paying the gas.
The user wallet sends a signed MESSAGE to the RELAYER with information about the transaction, the RELAYER confirms it and is the one
that actually signs and executes the transaction. This way the RELAYER is the one that pays for the execution.
The Gas Station Network (GSN) is a decentralized network of RELAYERS. It allows you to build dapps where you pay for your users transactions, so they do not need to hold Ether to pay for gas, easing their onboarding process.
Using this GSN of course increases the amount of gas spent, since a fee has to go to keep the service running.

### E)  What are the centralization issues to be aware of when developing a smart contract ? Propose a technical solution for each of them.
Centralized Oracles
The way to get "real world" data into the execution of smart contracts is via Oracles. This data can be obtained via API calls or even hardware.
One can not rely on just calling an API in a smart contract, since this is a SPOF (Single Point of Failure).
ex: what whould happen if the serive got disconnected?
	what if the data is tampered with by someone with access to it?
(same goes with hardware)

One should use a decentralized network of oracles.
An oracle network ensures that is not a single computer (node) or entity (company) that handles the data aquisition and validation.
For example witnet: a reputation based oracle network, in which users gain or lose reputation based on the amount of valid data retrieved.
Usually one can determin the amount of nodes that have to run the validation and if APIs are involved they give various ones to determine the ourput.


Ownable contracts
Ownable contracts allow the owner to make key changes and interactions with the contract that could harm its integrity.
For example changing the rate of Staking rewards just before its allowed for users to withdraw.
One solution for this are multi signature contracts, that require a certain amount of wallets to make changes or execute certain functions.
Although this signatures could be centralized (requiring just a few signatures or under the same organization) making for easy confabulation.

Bridges

### F)  What process (step by step) do you follow to build a protocol (a set of smart contracts) from given specifications ?

Most important things to have in mind are: Security, Scalability and Decentralization.
For that one should carefully chose the right blockchain (with its consensus meacnism, tx/sec, fees)
1) Understand the problem and decompose it
2) Investigate about similar solutions
3) Design workflow of the protocol
4) Start developing with TDD ( 90% coverage ;) )


Solidity Questions
### G)  After analyzing the file “Signature.sol”, describe the use case of this contract, how to use it and all the technical steps (off-chain & on-chain) & key methods of the contract.

Verify that a message whas signed by the user that sends it.
It confirms that the address is the same recovering it from the hashed message along with the signature.
				
### H)  Perform an audit of the contract “Staking.sol”, find at least 3 technical technical, logic issues or hacks, explain why it is an issue and provide a way to fix those.
I could not replicate:
	"Missing ERC20 tokens for reward on contract"
	"Missing ERC20 tokens on contract"
	Thats why Staking.sol has a Branch coverage of 88.89%

##### Duration error
```
  // What happens if the duration is changed when there while staking?
  // Woudnt the _reward change if i want to withdraw
```

##### Withdraw:
```
  // Shoudn't this be setted just in deposit() ??
  // And if it is here it should be after calling computeReward, otherwise it will always returns 0.
  //
  // update user's last deposit time
  // _lastDepositTime[_msgSender()] = block.timestamp;
```

##### Approve Reward:
 // added "Can not approve address zero."

##### Deposit (logic error?):
```
  // What if the user deposit 100 for 4 weeks, then adds 50 and wants to withdraw everything
  // Woudnt the reward be only calculated based on the second deltaTime???
  _lastDepositTime[_msgSender()] = block.timestamp;
```

##### ComputeReward:
```
  // duration delta is hard set to start at _duration, this could bring some issues
  // uint256 durationDelta = _duration;
  // If the durationDelta is grater than _duration it just stays static???
  // Shoudnt I get more reward based on the time i staked it??
  // if (block.timestamp - _lastDepositTime[account] < _duration) {
  //   durationDelta = block.timestamp - _lastDepositTime[account];
  // }
```

				
I)  How would you build a proxy contract where the implementation lives in another contract in solidity (do not worry about syntax error or mispel)

Smart contracts are inmutable, proxy contracts are a way to use "upgradable" contracts for example.
A proxy contract is basically a contract that delegate the execution to the address of another contract.
The proxy contract handles the state, for example balances, mappings, etc, but the implementation of the functions live in the contract that is pointed to.
This way, if we want to add or change some functionality, we can deploy another contract and make the PROXY point to it.
One thing to be aware is that the new contract could be anything, so it could be malicious.


J)  In this exercise, you have been given specifications and your goal is to develop a smart contract that satisfies those. This contract should be named “CampaignSale.sol” and implements the interface “ICampaignSale.sol” included in this test. This interface includes comments that should help you build your contract. Here are the specifications:		
We are building a fundraising dApp that enables creators to publish their projects in order to raise money in the form of ERC20 tokens. A campaign lasts for a duration and has to raise a minimum goal to unlock the development of the project & the tokens invested by contributors. Otherwise, the contributors can get refunded.
						
Launching a campaign
A campaign can be created by any user and should include:					 								
	-  the starting date of the campaign that should be in the future
 				
	-  the ending date of the campaign that should be in the future, greater than the
 								
starting date. Also a campaign should last at max 90 days.						
-  The goal to reach (token amount)
 								
Canceling a campaign
 								
A campaign can be canceled before it starts. The campaign is then no longer accessible and should be deleted. Only the creator of the campaign can cancel it
 								
Contributing to a campaign
 								
A user can contribute to the campaign by sending an amount of tokens to the contract only if the campaign is running.
 								
Withdrawing from a campaign
 								
A user can withdraw an amount of token from a campaign only if the campaign is running. Then, that amount of tokens is sent back to the user.
 								
Claiming the token from a campaign
 								
Once a campaign is over, the creator of the campaign is able to claim all the tokens only if the goal of the campaign has been reached. A campaign can be claimed only once.
 								
Refunding a campaign
 								
If the campaign didn’t reach the goal after the campaign is over, the contributors can still get refunded. A contributor will receive back his whole contribution (tokens) to the campaign.
