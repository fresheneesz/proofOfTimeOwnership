# Proof of Time-Ownership

PoTO is a consensus protocol for ordering cryptocurrency transactions as an alternative to pure Proof of Work. PoTO is a hybrid of Proof of Work and Proof of Stake that sets up a time-based race for PoS blocks rather than using quorums or voting to mint blocks. As far as I'm aware, this is the only PoS proposal that doesn't use quorums of voters to mint blocks.

# Benefits

* Much more secure for a given mining cost
* Everyone can participate in minting blocks with only the computer resources necessary to mint the chain
* Could eliminate risks of miner centralization

# Algorithm

I'm going to describe this protocol using Bitcoin terms, but the protocol can be applied to pretty much any cryptocurrency.

## Terms

**Minter** - An address that is used to mint a block (the equivalent of mining for PoS). 

**Minter progression** - A time-bound progression of minter addresses that determines what addresses are valid minters at any given time. The address progression is determined using an algorithm known as follow-the-satoshi (defined below) which is used to assign an index to every satoshi in the system. Any satoshi that has been moved within the last 30 blocks is ignored (not given an index), so people can't influence their probability of minting by sending their funds to a new wallet with a higher probability of being given minter rights.

**Address hash** - This is a hash of the previous PoTO block's address hash concatenated with the address that minted the current block. Only PoTO blocks (not PoW blocks) have address hashes. 

**Progression seed** - The seed used to determine the pseudo-random minter progression. This is a hash of the most recent PoTO block's address hash concatenated with the block height of the current block.

## Validating a Block

The *minter progression* is determined pseudo-randomly using the *progression seed*. In this progression, X address points are released each second, giving a chance for an active minter to mint a block. That number X is the inverse of the PoTO *difficulty*, meaning that the difficulty is 1/X. The more address points released each second, the lower the difficulty.

Proof of Work blocks are mined alongside the minted PoTO blocks. The target block-time for PoW blocks should be the same as the target block time for PoTO blocks, but the size of PoW blocks should be smaller than the PoTO blocks.

A node will accept a block as valid if:

1. The block's timestamp is later than that node's current time
2. If the block is a PoW block, it must be smaller than Y% of the average size of the last 100 PoTO blocks, where Y must be at minimum the ratio of current accumulated PoW difficulty for the last 10 days divided by the total accumulated PoW difficulty
3. One of the following:
  3a. Its a PoTO block and the address range of the address that signed the block (to mint it) contains an address that has come up in the minter progression for that block before that block's timestamp
  3b. Its a PoW block and the block's hash is less than or equal to what the PoW difficulty requires
  3c. Its a PoW block, more than the average time for a PoTO block to have happened has passed, and the block's hash is less than or equal to 1000 times what the usual PoW difficulty usually requires
4. There is no conflicting chain that is decisively longer and doesn't contain that block

## Follow-the-Satoshi

The [follow-the-satoshi algorithm](https://www.decred.org/research/bentov2014.pdf) is any algorithm that assigns a unique index from 0 to X-1 to each of X relevant satoshi. For PoTO, the relevant satoshi are any satoshi that haven't been moved for at least 30 blocks.

An example way to implement this is to take the UTXO set and order each output from oldest to newest, assign the first M indexes to the oldest unspent output of M satoshi, the next N indexes to the next oldest unspent output of N satoshi, etc. This would index the satoshi in order from oldest to newest, but the order doesn't matter at all, since the prgression of indexes chosen for the minter progression will be completely random.

## Determining chain length

Two cases:

When comparing two chains to see which is longer, the following formula will be used:

`Dwork*PDstake^(commonProportion)`

where

* `Dwork` is the accumulated PoW difficulty for the chain in question
* `PDstake` is the proportional accumulated PoTO difficulty, given by `Dstake/MDstake`
* `Dstake` is the accumulated PoTO difficulty for the chain in question
* `MDstake` is the highest of the accumulated PoTO difficulties from each chain
* `commonProportion` is the proportion of the chain common to both chains, given by `commonBlocks/maxBlocks`
* `commonBlocks` is the number of common blocks that are the same in both chains
* `maxBlocks` is the number of blocks in the relevant chain with the largest number of blocks

This formula makes it so when comparing two unrelated chains, only the accumulated proof of work difficulty is compared, and when comparing two chains that are mostly the same (a much more usual case), the chain length equation simplifies to the accumulated PoW difficulty multiplied by the accumulated PoTO difficulty. The reason we want to make this distinction is because if someone does construct a completely fresh chain with enough proof of work, they can control every address that owns coins on that chain, and so could maximize PDstake. If the length equation was only `Dwork*PDstake`, it would make it a lot easier for someone to create a completely fresh chain that would be seen as longer. Neutralizing `PDstake` when comparing fresh chains or mostly fresh chains makes it a lot harder for an attacker to successfully pull off a fresh-chain attack.

Similarly, if the length equation only cared about `Dwork` (and got rid of the `PDstake` component entirely), it would mean that only proof of work would be securing the system, eliminating any benefits we'd get from PoTO blocks. And of course if the length equation only cared about `PDstake`, it would be easy to successfully pull off a fresh-chain attack.

This chain-length equation is an extension of both those extremes, creating a gradient from one exteme to the other. 

## Confirmations and Transaction Finalization

A transaction should only be considered confirmed on the blockchain when the transaction has been confirmed by both a PoW block *and* a PoTO block.

A transaction shouldn't be considered confirmed only by PoTO blocks, since PoTO blocks can mint on top of multiple conflicting chains. This shouldn't be a problem as long as people don't erroneously consider 1-PoTO-confirmation transactions as confirmed in any significant way.

Also, a transaction shouldn't be considered confirmed only by PoW blocks, since this could allow an attacker with a lot of hash power to double-spend. While this attack is a lot harder than double-spending on someone accepting only PoTO blocks as confirmation, it would could be much easier than double-spending in today's bitcoin, since part of the point of PoTO is lowering the cost of mining (which by its nature reduce the hashpower in the system). This is why both PoW and PoTO must be used to determine how finalized a transaction is.

## Proxy Minting

An empty address A can be used for minting PoS blocks on behalf of another address B as long as address A holds a rights-message signed by address B giving address A that right. The actual owner address B would be the one to receive any minted coins (not the minter address A). This would allow propsective minters to keep the keys securing their coins safely offline while still using their full balance to mint.

A proxy minting rights-message could also include a fee amount that can be given to any address. It could also include an expirey block, after which the rights are revoked. This would allow users to allow a 3rd party to use their coins to mint blocks, in order for that 3rd party to get part of the reward as a fee. This could also faciliatate pool minting. Giving someone else rights to mint blocks for you might defeat the purpose of a more decentralized consensus protocol, so perhaps a feature for giving a fee to another address shouldn't in fact be added.

## Security, Cost of Mining, and Cost of Attack

The premise of PoTO is that the security of proof-of-work can combine with the security of proof-of-stake. In order to perform a 51% attack, for example, an attacker must have over 50% of both the hashrate and the active coins. For bitcoin as of Feb 2018, the cost of achieving over 50% of the hashrate is about $3.7 billion (if using 1.6 million Antminer S9s) and the cost of purchasing 50% of active bitcoins, assuming 5% activity, is $7 billion. So at the same hashrate, the capital cost of 51% attacking bitcoin would triple if it used PoTO. Even if the Proof-of-Work blocks were reduced to 1/1000th the total reward (fees and coinbase), the cost of the attack would still be about double. Any increase in the proportion of active minters or total value of the currency would increase that capital cost.

And yet, the cost of sustaining the network can be relatively far smaller than bitcoin costs at the moment. The current bitcoin hashrate would be able to recreate the current (Feb 2018) chain in about 180 days, exceeding the minimum PoW suggested above by 18 times. So let's say we set the max PoW blocksize to be 1/18th of the PoTO block size. In this case, the total mining cost would also be 1/18th of what it currently is for bitcoin, but the cost to attack would still be $200 million for the hashpower and $7 billion in order to obtain the coins necessary to dominate blockchain minting. The cost of creating a whole new fresh chain would be that $200 million for the hashpower + all the hashpower you'll have wasted since a completely fresh-chain is almost guaranteed to not be accepted by most people, which comes out to about $70 million (60 days of revenue for slightly more than half the hashpower) for a total cost of $270 million. For Bitcoin, the minimum cost of creating a fresh-chain longer than the current chain would take about 300 days and cost about $9 billion.

So there is a tradeoff here, if we rely less on PoW security and more on PoTO security, mining can be much cheaper (1/18th the cost in this example case) and it becomes at the same time more expensive to perform a secret-chain 51% attack, but it becomes cheaper to build a fresh-chain. Keep in mind that a fresh chain attack is pretty much only possible against new entrants (that could be tricked into thinking the new chain is the real one) and compromised SPV clients who could use the new chain to show proof that a transaction exists when it doesn't exist in the old main chain.

## Multiple PoW algorithms

This is orthogonal to the general hybrid idea and centralization of the PoW mining wouldn't cause much of a problem, but in the case it becomes an issue for some reason, multiple PoW algorithms could be used side by side. This would allow more seamless switch over from one algorithm to another if one of the algorithms is determined to be unfit at any point. It would also likely decentralize mining since different hardware and setup would be needed for each algorithm.

# Potential Issues

### DDOS risk
Since the addresses that are able to mint the next PoTO block are known as soon as the previous block is mined, those minters could be DDOSed (by competing minters and miners or by other malicious actors). Even if this does happen, while it would suck for the minters who come up first in the progression, it wouldn't significantly impact the network as a whole, since more and more potential minters would come up in the progression, requiring a DDOS attack to attack more and more targets as time went on. But even this could only happen if the IP address associate with a given coin address becomes known, and other measures could be taken to shield yourself from new traffic and only interact with existing connections.

### Nothing at Stake

Since there is no punishment or downside for minters to mint on top of all unresolved chains, its likely every active minter that comes up in the progression will attempt to propagate their block, creating a number of competing chains that will only resolve to a single chain when a PoW block is mined on one of the chains. In a pure proof-of-stake system, this is a problem since chains may keep branching and never resolve to one definitely-longest chain. However, in PoTO the PoW blocks serve as the deciding factor for which chain ends up being the longest. On average only 1 PoTO block will happen between PoW blocks, and it would be very rare for 3 or more PoTO blocks to happen between two PoW blocks. In any case, the nothing at stake problem is limited to being a problem only for the amount of time that has passed since the last PoW block - which is why a transaction shouldn't be considered confirmed until it has had at least one PoW confirmation.

### Time shifting
If actors are incentivized to alter network-time to their advantage, things could go wrong. People might want to pretend time is moving faster in order to see more minting rewards. However, hopefully there would be enough honest actors to counteract this. Also, this incentive to time-shift could be eliminated by only giving coinbase rewards in PoW blocks (and not in PoTO blocks). Shifting time backward (pretending time is moving slower) could give current potential minters more time to realize they're a potential miner, mine, and broadcast the next block, but any active minter is probably instantly aware of this already and minting a block would be pretty fast. Broadcasting can take some seconds, and so might provide some small incentive to time-shift backward. But even if network-time becomes shifted over time, the accuracy of network time isn't that important, only approximate consistency.

### Initial Centralization
Since only people who have coins can mine PoTO blocks, a new blockchain would be pretty centralized since most owned coins would be coins held by the miners who earned them. The solution to this would be to start the nextwork off with a much higher maximum blocksize for the proof of work blocks (and a corresponding lower maximum blocksize for the PoTO blocks) until the coinbase rewards are no longer a significant part of the coin circulation.

### Two-in-a-row minter problem
It would sometimes happen where a minter's addresses come up multiple times in a short span, giving that minter the opportunity to choose which address to mint with (which would multiply their chances of minting the next block). While this would be very very rare for anyone who doesn't own massive amounts of coin, it would happen sometimes. However, this is limited by PoW blocks, which may be mined at any time with the same frequency as PoTO blocks. If someone's address comes up in the progression twice in a short span, they risk losing the block entirely if a PoW block gets mined while they wait for a block minted by the second address to be accepted.

### Opportunistic mining halt
A miner may stop mining if one of their addresses is coming up soon enough in the miner progression to maximize their chances to mint the next PoTO block (which would likely be more lucritive than mining a PoW block). While this might happen, the opportunity to do this should be very rare and the only problem it would cause is a 1-block temporary PoW slow down.

### Opportunistic chain switching
Because of the minter behavior related to the nothing-at-stake issue, a miner may have a handful of chains to mine on top of and could choose the one that maximizes their chances to mint the next PoTO block. This does give an advantage on minting PoTO blocks to PoW miners, and a bigger advantage to larger pools (with more hashpower and coin ownership).

One way to minimize this effect is to make the blocktime for PoTO blocks much longer than the blocktime for PoW blocks. For example, if the blocktimes were equal, then there should be a 50% chance of a second minter address to come up before a PoW block is found, at which poing a miner would have two valid blocks to choose to mine on top of - doubling their chances of minting the next PoTO block. But if PoTO blocktime target were twice that of the PoW blocks, the likelihood is cut in half to 25% of the time.

# Comparisons

## Comparison to pure Proof of Work

#### 51% attacks

The requirements for a normal hidden-chain 51% attack would be far larger for the same good-faith mining cost. Not only would an attacker need to own enough hardware to exceed 50% of the network's hashpower, but the attacker would also need to own more than 50% of the coins actively watching for minting opportunities. Because the longest chain is determined by multiplication of the PoW and PoTO accumulated difficulties, even if a single miner managed to accumulate 99% of the hash power, they wouldn't be able to produce a significantly longer chain without also owning more than 50% of the active ownership addresses.

The cost of a complete imposter chain is also kept very high by the requirement that PoW blocks have a maximum size high enough such that rebuilding the entire PoW chain would take at least 10 days (described above as Y) with the entire current hash power in the network. Even if someone successfully created an imposter chain with just as much total accumulated difficulty, any node that had a previously valid chain could see that the submitted chain is completely separate and can reject it. For example, a rule rejecting any alternative chain different by more than 1 day of blocks (or even fewer) could be used to reject attacking hidden-chains out of hand, although that rule won't help new nodes just entering the network, especially if they're being sybil attacked.

## Comparison to Ethereum's Casper Proof of Stake system

PoTO remains P2P & protocol-neutral - While casper has a minter class and a node class, with PoTO everyone is potentially a miner. While in Casper, you have a specific quorum chosen each round, in PoTO, new address points will be chosen, allowing more and more of the address space to mine a block, meaning that the longer it takes for a block to be mined, the more people will be able to mine a block. We could even make it so that if the target time has been exceeded by a certain threshold, the number of address points chosen per second can increase so even in the case some apocalypse happens, we wouldn't have to wait months for a block.

PoTO also doesn't have the baton-passing problem. In Casper, some set of old minters must approve a set of new minters. Perhaps there's something I don't understand here, but this seems like an enormous potential problem that could cause centralization. In PoTO, there is no quorum that chooses the next quorum - the next progression of potential miners are chosen completely randomly.

## Comparison to Proof of Activity

[Proof of Activity (PoA)](https://www.decred.org/research/bentov2014.pdf) is a somewhat similar hybrid protocol, but rather than use PoW blocks and PoS blocks as separate entities, it requires that each block be validated by both proof of work and proof of stake. 

Because the N "winning" stakeholders chosen to validate a block depend on the mined PoW block header, this enables users to grind out block headers that maximizes the chances that an address they control will be selected in the next set of validators. Because this avenue exists, it essentially eliminates any cost-advantage the PoS part of the system could offer. This is because rational miners will grind out and throw away the less valuable proof of work blocks in order to have a higher chance of being part of the more valuable PoS validators. PoTO doesn't have this problem since the minter progression is determined solely by the previous minting address and the block height, neither of which have any grinding possiblity. Any algorithm that uses PoW block data to determine the next minter(s) is suceptible to this kind of grinding, including [Hcash](https://h.cash/themes/en/dist/pdf/HcashWhitepaperV0.8-edited.pdf), [Decred](https://docs.decred.org/research/hybrid-design/), the [2-hop blockchain](https://eprint.iacr.org/2016/716.pdf) and the related [TwinsCoin](https://eprint.iacr.org/2017/232.pdf).

License
=======
Released under the MIT license: http://opensource.org/licenses/MIT