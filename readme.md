*Version: 0.1.0*

# Proof of Time-Ownership

PoTO is a consensus protocol for ordering cryptocurrency transactions as an alternative to pure Proof of Work. PoTO is a hybrid of Proof of Work and Proof of Stake that sets up a time-based race for PoS blocks rather than using quorums or voting to mint blocks. As far as I'm aware, this is the only PoS or hybrid proposal that doesn't use quorums of voters to mint blocks.

Proof of work is a solid and secure mechanism for determining a canonical order of transactions, but a PoW system’s security is linearly related to expenditure of resources (which directly translates to transaction fees) and such a system is susceptible to centralization pressure that leaves a significant risk of a 51% attack. Also, there is the possibility (granted one that seems unlikely) that the amount of fees that must be paid for PoW to maintain enough security could be more than can be extracted via a fee market.

Proof of Stake has the ability to decouple the security of the blockchain from resource expenditure, but has its own substantial problems including the issue of resolving competing chains (the nothing-at-stake problem), the ability to cheaply create a fresh blockchain that compares as longer to the “true” chain, the risk of validator quorum capture, stake grinding, the fact that requiring users locking up funds limits how many people can participate in minting blocks, among other issues.

Other hybrid protocols that mitigate some of these problems have the problems of potentially significantly increased network traffic, higher risk of censorship attacks (both apply to [PoA](https://eprint.iacr.org/2014/452.pdf), [Decred](https://docs.decred.org/research/hybrid-design/), [Hcash](https://h.cash/themes/en/dist/pdf/HcashWhitepaperV0.8-edited.pdf), the [2-hop Blockchain](https://eprint.iacr.org/2016/716.pdf) and the related [TwinsCoin](https://eprint.iacr.org/2017/232.pdf)), or don't allow a large fraction of coin owners to practically mint blocks (eg Decred).

PoTO seeks to solve these problems by creating a hybrid protocol that doesn’t use minter quorums or provide any opportunity for stake grinding.

# Benefits

* Significantly more secure than pure PoW for a given mining cost
* Everyone can participate in minting blocks with only the resources necessary to run a full node (with the same resource usage as Bitcoin)
* Drastically reduces the effect of miner centralization
* Increases the incentives to run a fully validating node

# Major Tradeoffs

* Lower cost of a building a fresh-chain or other long-range revision than pure PoW for a given level of short-range attack security
* Double-spend attack cost is sometimes lower than in Proof-of-Activity but has a higher cost to perform a censorship-attack and has potentially much less network traffic

# Contents

- [Protocol](#protocol)
  * [Terms](#terms)
  * [Validating a Block](#validating-a-block)
  * [Follow-the-Satoshi](#follow-the-satoshi)
  * [Determining the Minter Progression](#determining-the-minter-progression)
  * [Determining Chain-length](#determining-chain-length)
  * [Confirmations and Transaction Finalization](#confirmations-and-transaction-finalization)
  * [Block Rewards](#block-rewards)
  * [Proxy Minting](#proxy-minting)
- [Protocol Extensions](#protocol-extensions)
  * [PoS-Absence Multiplier](#pos-absence-multiplier)
  * [Measuring Attack-cost and Fee-level Retargeting](#measuring-attack-cost-and-fee-level-retargeting)
  * [Multiple PoW algorithms](#multiple-pow-algorithms)
- [Analysis](#analysis)
  * [Security, Cost of Mining, and Cost of Attack](#security-cost-of-mining-and-cost-of-attack)
    + [Mitigating Long-range Revision Attacks](#mitigating-long-range-revision-attacks)
    + [Maximizing Active Stake](#maximizing-active-stake)
  * [Cost of Attack with the PoS-Absence Multiplier](#cost-of-attack-with-the-pos-absence-multiplier)
- [Potential Issues](#potential-issues)
    + [DDOS risk](#ddos-risk)
    + [Nothing at Stake](#nothing-at-stake)
    + [Time shifting](#time-shifting)
    + [Initial Centralization](#initial-centralization)
    + [Two-in-a-row minter problem](#two-in-a-row-minter-problem)
    + [Opportunistic mining halt](#opportunistic-mining-halt)
    + [Opportunistic chain switching](#opportunistic-chain-switching)
- [Comparisons](#comparisons)
  * [Comparison to pure Proof of Work](#comparison-to-pure-proof-of-work)
      - [Short-Range 51% attacks](#short-range-51%25-attacks)
      - [Long-Range 51% Attacks](#long-range-51%25-attacks)
      - [Fresh-chain and long-range attacks](#fresh-chain-and-long-range-attacks)
  * [Comparison to Ethereum's Casper Proof of Stake system](#comparison-to-ethereums-casper-proof-of-stake-system)
  * [Comparison to Proof of Activity](#comparison-to-proof-of-activity)
  * [Comparison to Decred's Consensus Protocol](#comparison-to-decreds-consensus-protocol)
- [Discussion and Review](#discussion-and-review)
- [Version History](#version-history)
- [License](#license)

# Protocol

This document describes the protocol using Bitcoin terms, but these techniques could be applied to pretty much any cryptocurrency.

The high level overview of PoTO is that Proof-of-Work (PoW) miners and Proof-of-Stake (PoS) minters race side-by-side for each block. PoS minters can mint for almost 0 cost, allowing anybody in the network to participate in block creation. PoW blocks are used to keep PoS minters in check by ensuring there is only one longest-chain (ie preventing the nothing-at-stake problem) and preventing PoS minters from stake-grinding (attempting to affect their probability of minting the next block).

There are two types of blocks that can be created: mined PoW blocks and minted PoS blocks. Mining PoW blocks works exactly how mining works in Bitcoin. Just like mining is a race to find a block with a hash below a certain value, minting PoS blocks is also a race against both miners and other minters. More and more addresses are given the ability to mint a block each second until either one of them mints a block or a PoW miner mines a block. This race incentivizes miners to release their blocks as soon as they find them and release minted blocks as soon as they become valid.

## Terms

**Minter** - An address that is used to mint a PoS block.

**Minter progression** - A time-bound progression of *minter* addresses that determines what addresses are valid minters at any given time. The address progression is determined using an algorithm known as follow-the-satoshi (defined below).

**Address hash** - `hash(prevAddrHash + minterAddr + height)`. This is a hash of the previous PoS block's address hash (the first PoS block omits this) concatenated with the address that minted the current block and the current block height. Only PoS blocks (not PoW blocks) have address hashes.

## Validating a Block

The *minter progression* is determined pseudo-randomly using the *address hash*. In this progression, X satoshi indexes are released each second, giving a chance for an active minter who owns one of those satoshi to mint a block. That number X is the inverse of the PoTO difficulty, meaning that the difficulty is 1/X. The more satoshi indexes that are released each second, the lower the difficulty.

Proof of Work blocks are mined alongside the minted PoS blocks. The target block-time for PoW blocks should be the same as the target block time for PoS blocks, but the size of PoW blocks should be larger than the PoS blocks.


A node will accept a block as valid if:

1. The block's timestamp is earlier than that node's current time

2. One of the following:

  2a. Its a PoS block and the address that signed the block (to mint it) owns a satoshi that has come up in the minter progression for that block before that block's timestamp
  2b. Its a PoW block and the block's hash is less than or equal to what the PoW difficulty requires (ie just like Bitcoin)

## Follow-the-Satoshi

The [follow-the-satoshi algorithm](https://www.decred.org/research/bentov2014.pdf) is any algorithm that assigns a unique index from 0 to X-1 to each of X relevant satoshi. For PoTO, the relevant satoshi are any satoshi that haven't been moved for at least 30 blocks, so people can't influence their probability of minting by sending their funds to a new wallet with a higher probability of being given minter rights. The order is completely arbitrary and does not need to be random (since the miner progression is random).

An example way to implement this is to take the UTXO set and order each output from oldest to newest, assign the first M indexes to the oldest unspent output of M satoshi, the next N indexes to the next oldest unspent output of N satoshi, etc. This would index the satoshi in order from oldest to newest.

## Determining the Minter Progression

The current minter progression is determined using the address hash of the last PoS block. This can be any algorithm that creates a deterministic pseudo-random list of satoshi indexes from 0 to N where N is the number of relevant satoshi indexed by the follow-the-satoshi algorithm, using the address hash as a seed.


## Determining Chain-length

When comparing two chains to see which is longer, the following formula will be used:

`Dwork*(Dstake^commonProportion)`

where

* `Dwork` is the accumulated PoW difficulty for the chain in question
* `Dstake` is the accumulated PoS difficulty for the chain in question
* `commonProportion` is the proportion of the chain common to both chains, given by `commonBlocks/maxBlocks`
    * `commonBlocks` is the number of common blocks that are the same in both chains
    * `maxBlocks` is the number of blocks in the relevant chain with the largest number of blocks

This formula makes it so when comparing two unrelated chains, only the accumulated proof of work difficulty is compared, and when comparing two chains that are mostly the same (a much more usual case), the chain length equation simplifies to the accumulated PoW difficulty multiplied by the accumulated PoTO difficulty. The reason this distinction is important is because if an attacker constructs  a completely fresh chain with enough proof of work, they can control every address that owns coins on that chain, and so could maximize Dstake. If the length equation was only `Dwork*Dstake`, it would make it a lot easier for an attacker to create a completely fresh chain that would be seen as longer. Neutralizing `Dstake` when comparing fresh chains or mostly fresh chains makes it a lot harder for an attacker to successfully execute a fresh-chain attack.

Similarly, if the length equation only cared about `Dwork` (and got rid of the `Dstake` component entirely), it would mean that only proof of work would be securing the system, eliminating any benefits we'd get from PoS blocks. And of course if the length equation only cared about `Dstake`, it would be easy to successfully pull off a fresh-chain attack.

This chain-length equation is an extension of both those extremes, creating a gradient from one extreme to the other.

## Confirmations and Transaction Finalization

A transaction should only be considered confirmed on the blockchain when the transaction has been confirmed by both a PoW block *and* a PoS block.

A transaction shouldn't be considered confirmed only by PoS blocks, since PoS blocks can mint on top of multiple conflicting chains. This shouldn't be a problem as long as people don't erroneously consider 1-PoS-confirmation transactions as confirmed.

Also, a transaction shouldn't be considered confirmed only by PoW blocks, since this could allow an attacker to double-spend via a 51% attack. While this attack is a lot harder than double-spending on someone accepting only PoS blocks as confirmation, it could be much easier than double-spending in today's bitcoin, since part of the point of PoTO is lowering the cost of mining (which by its nature reduce the hashpower in the system). This is why both PoW and PoTO must be used to determine how finalized a transaction is.

## Block Rewards

Because the revenue from mining blocks directly affects how much work will be put into mining, most of the fees and coinbase rewards should go to miners so the amount of hashpower is nearly maximized for a given average fee-rate. But some incentive should be left to entice people to keep their addresses actively minting blocks. I’ll suggest the same thing [Charlie Lee suggested](https://bitcointalk.org/index.php?topic=102355.0) for Proof of Activity, that the PoW blocks earn 90% of the revenue, which would mean that a PoS block are 10% the size of a PoW block (this ratio is up for debate).

## Proxy Minting

An empty address A can be used for minting PoS blocks on behalf of another address B as long as address A holds a rights-message signed by address B giving address A that right. The actual owner address B would be the one to receive any minted coins (not the minter address A). This would allow prospective minters to keep the keys securing their coins safely offline while still using their full balance to mint.

A proxy minting rights-message could also include a fee amount that can be given to any address. It could also include an expirey block, after which the rights are revoked. This would allow users to allow a 3rd party to use their coins to mint blocks, in order for that 3rd party to get part of the reward as a fee. This could also facilitate pool minting. However, pool mining (giving someone else the power to mint blocks for you) might incentivize minter centralization and disincentivize users from running their own full node, so perhaps a feature for giving a fee to another address shouldn't in fact be added.

# Protocol Extensions

## PoS-Absence Multiplier

Since the point of PoTO is to minimize PoW cost for a target security level (ie attack-cost), the likeliest type of short-range longer-chain attack on a PoTO blockchain is one where the attacker obtains many times the honest hashpower of the system to minimize the amount of stake they would need to control the chain. However, in such an attack, the number of PoW blocks mined per minted PoS block would drastically increase. One way we can exploit this fact (in order to increase the cost of such an attack) would be to make it increasingly more difficult to mine PoW blocks the longer PoW blocks are found without a PoS block having been found. While PoW blocks would be harder to mine, for the purposes of determining chain-length we would only count the difficulty has it would have been in normal circumstances so that the chain length would be actually seen as shorter.

I propose that when 2 PoW blocks have been found in a row, the 3rd PoW block would have double the current mining difficulty, but for the purposes of chain-length, only the non-doubled current mining difficulty would be counted. And the 4th PoW block in a row would have quadruple the current mining difficulty, etc. Using this rule, an attacker would have a far harder time successfully executing a double-spend attack.

This is analyzed in further detail in the Analysis section.

## Measuring Attack-cost and Fee-level Retargeting

The cost of an attack can be measured by measuring the cost of the hashpower and the active stake. The cost of the hashpower will tend toward miner revenues (fees and coinbase rewards) so that can be used as an approximation for the cost of the hashpower. The active stake can be calculated by using the stake difficulty, since that is the reciprocal of how many satoshi are released per second. The total number of satoshi divided by the number of satoshi released every PoS block (~ every 4 minutes) would give you the number of actively minting satoshi. Using these measurements, an attack-cost target could be chosen (some amount of bitcoins, or some percentage of bitcoins mined so far, etc) from which you could derive the revenue per block necessary to maintain that attack-cost. Then that information could be used to dynamically change the block size such that the block revenue will then continue to support the chosen target for attack-cost. This would  both make mining revenue more consistent and ensures a certain minimum level of security while also minimizing fees.

## Multiple PoW algorithms

This is orthogonal to the general hybrid idea and centralization of the PoW mining wouldn't cause much of a problem, but in the case it becomes an issue for some reason, multiple PoW algorithms could be used side by side. This would allow more seamless switch over from one algorithm to another if one of the algorithms is determined to be unfit at any point. It would also likely decentralize mining since different hardware and setup would be needed for each algorithm.

# Analysis

## Security, Cost of Mining, and Cost of Attack

The premise of PoTO is that the security of proof-of-work can combine with the security of proof-of-stake. Because of the chain-length equation, the proportion of hashrate and stake an attacker must minimally have to successfully perform an attack is inversely related. Having just over 50% of each will always work, but this is only the cheapest way to attack in the case that the cost of obtaining 50% of the hashrate is equal to the cost of obtaining 50% of the actively minting coins. With 75% of the hashrate (3 times the honest hashrate), an attacker would only need ⅓ of the active stake. 

The equation for finding the minimal cost of a successful 51%-style attack is:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`2*SQRT(StakeCost*HashCost)`
where  
* *HashCost* is the cost of acquiring an amount of hashpower equal to the honest hashpower in the system
* *StakeCost* is the cost of acquiring an amount of coin equal to the honest actively minting coins in the system

This is derived in the following way. In a successful attack, the attacker must be able to build a longer chain. We’ll assume this isn’t a long-range revision and can then simplify the chain-length equation to assume the commonProportion term is very close to 1 and therefore ignore it.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Attack Inequality: `a*HashCost*b*StakeCost > HashCost*StakeCost`  
where  
* *a* is the multiple of honest hashpower the attacker has
* *b* is the multiple of honest active stake the attacker has

Also, the cost of a successful attack is the cost of acquiring the hashpower for the attack and the coins used for minting in the attack:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`costOfAttack = a*HashCost + b*StakeCost`
    
The Attack Inequality can be simplified to:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a*b > 1`  
This means that the minimum attack cost is where `a*b = 1`. So let's assume `a` is the inverse of `b`:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `b = 1/a`  
From this we can simplify the `costOfAttack` to:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a*HashCost + StakeCost/a`  
Getting the derivative of this with respect to `a`:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `HashCost- StakeCost/a^2`  
The cost of attack will be minimized when the derivative is 0:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `HashCost - StakeCost/a^2 = 0`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `HashCost = StakeCost/a^2`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a*HashCost = StakeCost/a`  
As an aside, replacing `1/a` with `b`, we see that the cost of attack is minimized when the costs of acquiring the necessary hashpower and the necessary coin ownership is the same:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a*HashCost = b*StakeCost`  
But disregarding that last aside, we can solve for `a`:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a^2 = StakeCost/HashCost`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a = (StakeCost/HashCost)^.5`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `b = (HashCost/StakeCost)^.5`  
Using these values for `a` and `b` under the condition of minimal cost of attack, we can obtain the above minimal cost of attack:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `minimalCostOfAttack = (StakeCost/HashCost)^.5 * HashCost+ (HashCost/StakeCost)^.5 * StakeCost`
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `minimalCostOfAttack = (HashCost*StakeCost)^.5 + (StakeCost*HashCost)^.5`
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `minimalCostOfAttack = 2*(HashCost*StakeCost)^.5`

### Mitigating Long-range Revision Attacks

Long-range attacks are where an attacker builds off the chain from a block height that was a long time in the past (some large percent of the blockchain ago, eg 50% of the blockchain ago, which would be a chain split off from a block mined more than 4 years ago). In pure proof-of-work, a long-range attack is always more expensive than a short-range attack, but in PoTO this isn’t the case. For example, a completely fresh-chain that is longer than the real/honest chain can be built without any existing coin ownership as long as the attacker has more hashpower than the network currently has. This might take an attacker months but could still actually be cheaper since no coins need to be obtained.

One way to mitigate this type of attack would be to simply incentivize higher miner revenue (eg through higher coinbase rewards or a smaller block size and therefore higher transaction fees) such that more honest hashpower enters the system. If the cost of the hashpower is higher, the cost of a long-range attack is higher.

A second way to mitigate this type of attack is for nodes to reject revisions if there is no common block (a complete fresh-chain) or if the highest common block is dated more than X days ago (eg 1 day). However this rule wouldn't help new nodes just entering the network, especially if they're being sybil attacked, and wouldn’t help SPV clients using an compromised SPV server that uses the new chain to show proof that a transaction exists in a valid chain with an appropriate length.

A third way to mitigate this would be hardcoded checkpoints in node and wallet software. This would be some data asserting that a block at a certain height has a certain hash. Since users must already either validate or trust their software, having a checkpoint like this would be simply another thing that should be peer-reviewed. Including this hard-coded checkpoint would completely eliminate the possibility of a long-range attack that split from the true-chain before the checkpoint, even for new entrants and SPV clients using a compromised SPV server.

### Maximizing Active Stake

Since the security of PoTO depends on how much of the owned coins are actively searching for a block to mint, maximizing this proportion is important. At a high proportion of active stake, getting to mint a block would be like winning a lottery: cheap to participate in but rarely rewarded. For example, if each of the world's ~7 billion people had equal stake, with a 2 minute target blocktime (4 minutes per PoS block) there would be about 130,000 blocks per year giving about 1/50,000 chance of winning the ability to mint a block each year if everyone participated.

If the ability to mint 1 block every 50,000 years isn’t enticing enough to people, we could increase the number of winners per block by requiring that a minted block be signed by N addresses. For example, if we chose N=500 the chance of minting a block would be 1/100 per year (ie you could expect to mint one block in a 100 year lifetime). This would probably be a lot more enticing since you could actually expect to win at some point.

Of course, the more people that share the block rewards, the less reward there is per person. If we assume people make about 10 transactions per day on average with a fee of something like 1 cent per transaction (of on-chain fees associated with lightning channel rebalances or reopenings), that would be a reward per minter of about $200 (2018 dollars). Not tiny, but not that big either.

So to really maximize active stake would require some experimentation and probably constant automated retargeting, similar to the above proposal for retargeting the block size. It’s also possible that because of the low cost of running a minter, people may do it regardless of the reward. In that case, it might simply be best to keep the protocol so only 1 signature mints a block and gains a more substantial reward in the unlikely event they win.

Note that requiring more signatures for each PoS block would *not* increase security directly. It would only increase security in-so-far as it increased the actively minting proportion of the total coins.

## Cost of Attack with the PoS-Absence Multiplier

For example, let’s say there are 100,000 honest actively minting bitcoins and that the cost of acquiring an amount of hashpower equal to all the honest hashpower is 1000 bitcoins. In this scenario, a pure PoW system would cost 1001 bitcoins to attack and the basic PoTO system would cost 20,000 bitcoins to attack. However, let’s further say that the attacker spends 10,000 bitcoins on buying 10 times the honest hashpower, and 30,000 bitcoins purchasing 30% of the honest stake. Note that the stake required to make a successful attack in the basic PoTO system with 10 times the honest hashpower would be 10% of the honest stake. With these assumptions, using the above proposal, the attacker would only have a 30 minute window where at some points its chain is longer (and at some points not). After that, there is an almost 3 day window where the attacker’s chain is measurably shorter than the honest chain. After this, the attacker’s chain overtakes the honest chain.

If this example is changed so that the attacker has 100 times the honest hashpower, with no other changes, the attacker’s chain may read as longer for an 145 minute window and doesn’t regain the longest chain until more than 15 hours have passed.

In order to calculate the examples above, I wrote [poto-double-spend-cost-calculator.js](https://raw.githubusercontent.com/fresheneesz/proofOfTimeOwnership/master/poto-double-spend-cost-calculator.js), which outputs the chain lengths of the honest and attacker’s chains during a range of time.

With such a rule, usually there is a short window of time where it isn’t clear which chain is longer (an attacker’s chain may be longer than the main chain at times, or other other way around), then a long window of time where the attacker’s chain will no longer be able to keep up with the honest chain (which has most of the active stake). After this longer window, the attacker’s chain would again catch up and remain the longest chain for good. Sometimes if the attacker’s stake is large enough, there will only be a first window, after which the attacker's chain will always be the longest. I wrote [poto-attack-window-calculator.js](https://raw.githubusercontent.com/fresheneesz/proofOfTimeOwnership/master/poto-attack-window-calculator.js) to calcuate these attack windows for given honest network hashpower and stake for honest and attacker hashpower and stake.

However, a couple things could be done to avoid falling prey to the attack after the attacking chain permanently becomes the longest. First is that nodes that have been actively validating the chain during the attack can reject medium-range revisions. Second is that nodes that have *not* been actively validating the chain can detect that the longer chain has a sharp change in rate of PoS blocks or PoW blocks, alert the user, and wait for the user to manually choose which chain to follow (at which point the user can manually select the shorter honest chain once they check the news and verify whether its a real attack or not). 

After simulating the cost of attacks (see [poto-min-attack-cost.js](https://raw.githubusercontent.com/fresheneesz/proofOfTimeOwnership/master/poto-min-attack-cost.js)), it seems that if transactions are only considered confirmed after 60 minutes of confirmations (60 minutes is already standard in Bitcoin - 6 confirmations) the cost of successfully double-spending is approximately `6.4*HashCost+0.4*StakeCost` until the PoW cost is less than 1/10,000th of the PoS, below which the formula becomes `2048*HashCost+0.2*StakeCost`. It’s unclear why the simulation comes out to those ratios very consistently, and I myself don’t have the mathematical skills to drive an exact formula for the minimum cost of attack with this more complex model. However, if this is in fact near to the true minimal cost of attack with this extension, it is significantly higher than basic PoTO without this extension, especially when hashpower is very low compared to active stake. For example, when the cost of the honest hashpower is 1/25,000th the amount of active stake, PoTO with this extension is more than 30 times as secure as basic PoTO.

# Potential Issues

### DDOS risk
Since the addresses that are able to mint the next PoS block are known as soon as the previous block is mined, those minters could be DDOSed (by competing minters and miners or by other malicious actors). Even if this does happen, while it would suck for the minters who come up first in the progression, it wouldn't significantly impact the network as a whole, since more and more potential minters would come up in the progression, requiring a DDOS attack to attack more and more targets as time went on. But even this could only happen if the IP address associate with a given coin address becomes known, and other measures could be taken to shield yourself from new traffic and only interact with existing connections.

### Nothing at Stake

Since there is no punishment or downside for minters to mint on top of all unresolved chains, its likely every active minter that comes up in the progression will attempt to propagate their block, creating a number of competing chains that will only resolve to a single chain when a PoW block is mined on one of the chains. In a pure proof-of-stake system, this is a problem since chains may keep branching and never resolve to one definitely-longest chain. However in PoTO, the PoW blocks serve as the deciding factor for which chain ends up being the longest. On average only 1 PoS block will happen between PoW blocks, and it would be very rare for 3 or more PoS blocks to happen between two PoW blocks. In any case, the nothing at stake problem is limited to being a problem only for the amount of time that has passed since the last PoW block - which is why a transaction shouldn't be considered confirmed until it has had at least one PoW confirmation.

### Time shifting
If actors are incentivized to alter network-time to their advantage, things could go wrong. People might want to pretend time is moving faster in order to see more minting rewards. However, hopefully there would be enough honest actors to counteract this. Shifting time backward (pretending time is moving slower) could give current potential minters more time to realize they're a potential miner, mine, and broadcast the next block, but any active minter is probably instantly aware of this already and minting a block would be a fast operation. Broadcasting can take some seconds, and so might provide some small incentive to time-shift backward. But even if network-time becomes shifted over time, the accuracy of network time isn't that important, only approximate consistency.

### Initial Centralization
Since only people who have coins can mint PoS blocks, those people would have an advantage in gaining new coins. This wouldn't be as much of a problem as in pure PoS protocols, since perhaps only ~10% of block rewards (and generated coinbase coins) would be given to minters. But if this is still a concern, the coinbase rewards for minters could be lowered or even eliminated if that was deemed appropriate.

### Two-in-a-row minter problem
It would sometimes happen where a minter's addresses come up multiple times in a short span, giving that minter the opportunity to choose which address to mint with (which would multiply their chances of minting the next block). While this would be very very rare for anyone who doesn't own massive amounts of coin, it would happen sometimes. However, this is limited by PoW blocks, which may be mined at any time with the same frequency as PoS blocks. If someone's address comes up in the progression twice in a short span, they risk losing the block entirely if a PoW block gets mined while they wait for a block minted by their second address to be accepted.

### Opportunistic mining halt
A miner may stop mining if one of their addresses is coming up soon enough in the miner progression to maximize their chances to mint the next PoS block. While this could theoretically happen, the opportunity to do this should be very rare and the only problem it would cause is a 1-block temporary PoW slow down. Also, the incentives don’t promote this behavior, since mining a PoW block would be much more lucrative than minting a PoS block.

### Opportunistic chain switching
Because of the minter behavior related to the nothing-at-stake issue, a miner may have a handful of chains to mine on top of and could choose the one that maximizes their chances to mint the next PoS block. This does give an advantage on minting PoS blocks to PoW miners, and a bigger advantage to larger pools (with more hashpower and coin ownership).

One way to minimize this effect is to make the blocktime for PoS blocks much longer than the blocktime for PoW blocks. For example, if the blocktimes were equal, then there should be a 50% chance of a second minter address to come up before a PoW block is found, at which point a miner would have two valid blocks to choose to mine on top of - doubling their chances of minting the next PoS block. But if PoS blocktime target were twice that of the PoW blocks, the likelihood is cut in half to 25% of the time.

### Prediction Attack

Because that a satoshi must have not moved in the last 30 blocks for it to be eligible for minting, as long as no one can predict all the minters for the next 30 blocks, no one can move their coins around to gain an advantage in minting. But if an actor could predict more than 30 blocks in advance, they could potentially be able to mint far more blocks than they would otherwise have been able to - potentially taking over the chain. Without also having control over more than 50% of the hashpower, this should be practically impossible, since the blockheights at PoW blocks will be mined change what the *Address Hash* will be in future blocks. An attacker would have to predict not only which blocks at which heights would be minted by which *exact* addresses, but would have to also know what block heights will be instead mined by PoW miners.

Howerver, if the attacker has greater than 50% of the hashpower, they could influence which PoW blocks are mined, and which aren't. If their prediction predicted that a PoW block would not be mined at a particular height but one was found, if the expected minter created and propagated their block (perhaps ahead of time), the attacker can mine on top of that minted block instead. And similarly, if a PoS block was minted where the attacker predicted a PoW block, the attacker could mine a PoW block at that height so that minters will then mint on top of it. The first correction is much less likely to be successful than the second correction, but both are frustrated by honest miners and minters who will be following the longest chain. An attacking miner can also withhold their hashpower for blocks at heights they expect a minted PoS block. How successful this kind of manipulation would be would depend on the distribution of addresses that are actively minting as well as how much hashpower and stake the attacker has. 

It seems unlikely that a prediction attack would be possible, even at 30 blocks. However, if it becomes clear this is a risk, the idle-period for satoshi eligible to mint can be increased to 300 or 3000 blocks without much reduction in coins eligible for minting. 

# Comparisons

## Comparison to Pure Proof of Work

#### Short-Range longest-chain Attacks

The requirements for a successful hidden-chain 51%-style attack on PoTO would be far larger than for PoW for a given amount of honest mining expenditures. To be successful against PoTO, an attacker would likely need many times the hashpower along with owning a significant fraction of the coins actively watching for minting opportunities. Because the longest chain is determined by multiplication of the PoW and PoTO accumulated difficulties, even if a single miner managed to accumulate 90% of the hash power, they wouldn't be able to produce a significantly longer chain without also owning more than 10% of the active ownership coins. With the PoS-Abscence Multiplier extension, the stake requirements are even higher - about 40% of the active stake along with 85% of the hashpower.

For bitcoin as of Feb 2018, the cost of achieving 50% of the hashrate is about 440,000 btc (if using 1.9 million Antminer S9s) and 5% of all bitcoins is 900,000 btc. So assuming 5% of honest coin ownership actively mints in a PoTO system, the minimal cost of attack would be over 1 million btc. So at the same hashrate, the capital cost of 51% attacking bitcoin would triple if it used PoTO. Even if the Proof-of-Work blocks were reduced to 1/8th the total reward (fees and coinbase), the cost of the attack would still be about what is currently is in bitcoin (even without considering the difference in recoverable value between hashpower and stake). Any increase in the proportion of active minters or total value of the currency would increase that capital cost proportionally (eg with 50% activity instead of 5%, 1/80th the mining cost would maintain the current level of security). 

#### Long-Range 51% Attacks

Pure proof of work simply doesn’t have a risk of long-range attacks, since short-range attacks are always cheaper. 

If we incentivized fees of 1/10th of what Bitcoin has, the total mining cost would also be 1/10th of what it currently is for Bitcoin. If we built a blockchain with 1/10th the accumulated difficulty that bitcoin has and 1/10th the hashpower, the cost of creating a whole new fresh chain at that level would be 1/10th of the cost of doing that for bitcoin. So where this would cost about 1 million btc for Bitcoin, with this hypothetical PoTO chain with 1/10th the hashpower it would only cost 100,000 btc. In both cases it would take about 280 days. (See [PoTOcostOfFreshChainAttack.xlsx](https://github.com/fresheneesz/proofOfTimeOwnership/raw/master/PoTOcostOfFreshChainAttack.xlsx) for calculations.)

So there is a tradeoff here, if we rely less on PoW security and more on PoTO security, mining can be much cheaper for the same cost of performing a short-range 51% attack, but it becomes cheaper to build a fresh-chain. 

Ways of mitigating this are mentioned above in the section titled "Mitigating Long-range Revision Attacks".

## Comparison to Ethereum's Casper Proof of Stake system

PoTO remains P2P & protocol-neutral. While [Casper](https://github.com/ethereum/research/blob/master/papers/casper-basics/casper_basics.pdf) has a minter class (aka stakers) and a node class, everyone is potentially a miner in PoTO. 

Since stakers can't use their coins, this makes it impossible for everyone to participate in Casper minting, and in practice this will likely mean that fewer people will bother to actually actively participate. In PoTO, minting can be done automatically anytime you have an online node without any downside, but in Casper you need to take manual actual to stake or unstake your coins. While this could theoretically be as easy as transferring money from a savings to a checking account (and then waiting weeks for the transition to happen), the extra complication there will definitely deter some people from participating or would at minimum prevent willing participants from participating with all their coins. The security of both PoTO and Casper depend on high participation in minting, and so PoTO allowing more people to practically participate would increase the cost of an attack potentially drastically by comparison.

Two primary attacks Casper goes to lengths to mitigate are long-range revisions (where a coalition of validators with ⅔ of a past validator set can create conflicting chains) and catastrophic crashes (where more than ⅓ of validators go offline). PoTO’s susceptibility to long range revisions is limited due to its use of PoW, tho higher than a pure PoW system. And  PoTO doesn’t have the problem of catastrophic crashes because it doesn’t use quorums (validator sets), and instead a new satoshi will be given the right to mint a block each second, allowing more and more of the address space to mine a block, meaning that the longer it takes for a block to be mined, the more people will be able to mint a block.

Casper attempts to solve the nothing-at-stake problem by using pre-staked ether and confiscating that ether if the validator owning that stake validates blocks on multiple competing chains. HPoTO’s uses the same mechanism that Bitcoin uses to solve this problem: PoW blocks. A PoTO chain can allow multiple competing minted blocks, but only one will be mined on top of. 

Casper also requires a “proposal mechanism” and currently plans on using a PoW mechanism to do that. That proposal mechanism adds costs to Casper that aren’t discussed in the proposal, since they’re separate. PoTO is self-contained and doesn't need any external mechanism to operate properly.

## Comparison to Proof of Activity

[Proof of Activity (PoA)](https://www.decred.org/research/bentov2014.pdf) is a somewhat similar hybrid protocol, but rather than use PoW blocks and PoS blocks as separate entities, PoA requires that each block be validated by both proof of work and proof of stake.

PoA seems to have exceptionally good security against double-spending attacks, better than basic PoTO (when N > 1), tho they didn’t give a formula for the minimum cost of attack and I haven’t derived it. In comparison to PoTO with the PoS-Absence Extension (*using the security formulas they provided*), it looks like PoA has exceptionally high security when stakeholder participation is below 30%, N is greater than 3, and the cost of the honest hashpower is greater than 1/500th of the total coins. But usualy PoTO is more expensive to double-spend attack. (See [PoA-min-attack-cost.xlsx](https://github.com/fresheneesz/proofOfTimeOwnership/raw/master/PoA-min-attack-cost.xlsx) and [PoA-attack-cost.xlsx](https://github.com/fresheneesz/proofOfTimeOwnership/raw/master/PoA-attack-cost.xlsx) for calculations.)

However PoA potentially has significantly higher load on the network than either Bitcoin or PoTO. The protocol requires miners to usually mine multiple blocks until all N minters derived from one of those blocks are online. With N being 3 as suggested in the paper, this would take 8 blocks for 50% online stake. At 10% online stake, this would be 1000 blocks. At ~100 bytes per (empty) block, 1000 blocks would be 100kb. Not too bad, but it can certainly be significant network wide overhead, especially if blocktimes are reduced (with blocksizes proportionally reduced, which would mean a higher percentage of network traffic would be unused [vs used] block headers). With slightly higher values for N, this problem increases exponentially. For example, with N=5 and 10% online stake, this would be a very unwieldy extra 10MB per block. By contrast, PoTO doesn’t have any significant extra network overhead. 

Furthermore, the cost of successfully executing a censorship attack is equal to basic PoTO for N=1, and much less than when N > 1 or when compared against PoTO with the *PoS-Absence Extension*. This attack would be performed by an attacker with greater than A times the honest hashpower and B times the honest online stake, where A > 1 (at least 50% of total hashpower) and B > 1/(A*N) (a potentially small fraction of online stake). The attacker would mine blocks, but not release them unless one of the attackers addresses is one of the N winning stakeholders for that block.  When such a block is found, the attacker would release the block and wait until N-1 stakeholders sign the block, and then sign the block themselves as the Nth stakeholder putting in (or leaving out) any transactions they want, and mine only on top of that block. While a double-spend attack becomes exponentially more difficult as N grows, a censorship attack becomes proportionally easier to pull off as N grows. For example, at the suggested N=3, you only need 34% of the active stake along with 50% of hashpower, or 9% of the active stake with 88% of the total hashpower. This could be a significant limitation of PoA, since while a double-spend attack is terrible, a censorship attack is also unacceptable. This attack is costlier than pure PoW, but not as costly as it is in PoTO. An easy modification to PoA that would eliminate this lower-cost attack is to allow each of the N winning stakeholders for a block include up to 1/Nth of the bytes of transactions in the block. This way, each stakeholder would contribute some transactions to the block, and thus an attacker would need to control all stakeholders for a block in order to ensure that a transaction is censored.

## Comparison to Decred's Consensus Protocol

Decred is somewhat similar to PoA, with some key differences including the need to buy stake "tickets" (similar to staking ether in Casper) and requires 3 of 5 block signers vs PoA's requirement that all N winners sign the block for it to be valid. Decred's support for stakepools enables and encourages centralization and discourages people from running their own full nodes (which is important for having a say in the case of a fork). Decred hasn't given any information on the cost of attacking the system, but it looks to be less costly than both PoA and PoTO. Decred also has a censorship attack problem, where anyone with 51% of the hashpower can successfully censor transactions indefinitely even with no stake.

Discussion and Review
=====================

Please feel free to use the github issues as a forum for questions and discussing this protocol, as well as proposed changes to the protocol.

Version History
===============

* 0.1.1
	* Added formula for the minimum cost of double-spend attack (and derivation)
	* Added PoS-Abscense Extension
	* Changing block rewards such that miners get most of the fees
	* Adding section on feel-level retargeting
	* Adding the blockheight into the address hash and getting rid of the progression seed term
	* Lots of cleanup, better organization, and better more full explanations and analysis
* 0.1.0 - First version

License
=======
Released under the MIT license: http://opensource.org/licenses/MIT