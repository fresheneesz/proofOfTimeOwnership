*Version: 0.4.0*  
*Status: WIP*

**NOTE: I'm looking for a mathemetician to co-author this proposal with me, and do the more complex mathematics involved in calculating the minimum cost of attack with the Economic Mining Monopoly Attack in mind.**

# Proof of Time-Ownership

PoTO is a consensus protocol for ordering cryptocurrency transactions as an alternative to pure Proof of Work. PoTO is a hybrid of Proof of Work and Proof of Stake that sets up a time-based race for PoS blocks rather than using quorums or voting to mint blocks. As far as I'm aware, this is the only PoS or hybrid proposal that uses chronological progressions to determine who wins the chance to mint a block.

Proof of work is a solid and secure mechanism for determining a canonical order of transactions, but a PoW system’s security is linearly related to expenditure of resources (which directly translates to transaction fees) and such a system is susceptible to centralization pressure that leaves a significant risk of a 51% attack. Also, there is the possibility (granted one that seems unlikely) that the amount of fees that must be paid for PoW to maintain enough security could be more than can be extracted via a fee market.

Proof of Stake has the ability to decouple the security of the blockchain from resource expenditure, but has its own substantial problems including the issue of resolving competing chains (the nothing-at-stake problem), the ability to cheaply create a fresh blockchain that compares as longer to the “true” chain, the risk of validator quorum capture, stake grinding, the fact that requiring users locking up funds limits how many people can participate in minting blocks, among other issues.

Other hybrid protocols that mitigate some of these problems have the problems of potentially significantly increased network traffic, higher risk of censorship attacks (both apply to [PoA](https://eprint.iacr.org/2014/452.pdf), [Decred](https://docs.decred.org/research/hybrid-design/), [Memcoin2](https://www.decred.org/research/mackenzie2013.pdf), [Hcash](https://h.cash/themes/en/dist/pdf/HcashWhitepaperV0.8-edited.pdf), the [2-hop Blockchain](https://eprint.iacr.org/2016/716.pdf) and the related [TwinsCoin](https://eprint.iacr.org/2017/232.pdf)), are suceptible to two types of mining monopoly attacks (described below), or don't allow a large fraction of coin owners to practically mint blocks (eg Decred and Memcoin2).

PoTO seeks to require a much smaller amount of hashpower for a given level of security without exibiting these problems by creating a hybrid protocol that doesn’t use lock-in staking or minter quorums, and doesn't require a PoW component for every block.

# Benefits

* Potentially significantly less hashpower (less than half) required in comparison to pure PoW, for a given level of security (ie cost of attack).
* Everyone can participate in minting blocks with only the resources necessary to run a full node (with the same resource usage as Bitcoin)
* Increases the incentives to run a fully validating node
* No additional network traffic over Bitcoin

# Major Tradeoffs

* Lower cost of a building a fresh-chain or other long-range revision than pure PoW for a given level of short-range attack security
* Lower cost of a longer-chain attack than some other hybrid protocols (eg PoA) in the case that the cost of the honest hashpower is a significant fraction of the active stake

# Contents

- [Protocol](#protocol)
  * [Terms](#terms)
  * [Validating a Block](#validating-a-block)
  * [Follow-the-Satoshi](#follow-the-satoshi)
  * [Determining the Minter Progression](#determining-the-minter-progression)
  * [Determining Chain-length](#determining-chain-length)
  * [Minter Punishment](#minter-punishment)
  * [Confirmations and Transaction Finalization](#confirmations-and-transaction-finalization)
  * [Block Rewards](#block-rewards)
  * [Proxy Minting](#proxy-minting)
- [Protocol Extensions](#protocol-extensions)
  * [Measuring Attack-cost and Fee-level Retargeting](#measuring-attack-cost-and-fee-level-retargeting)
  * [Multiple PoW algorithms](#multiple-pow-algorithms)
  * [Incentivizing full valiation by Proof of UTXO](#incentivizing-full-valiation-by-proof-of-utxo)
  * [PoA Extension](#poa-extension)
  * [Switchover Extension](#switchover-extension)
  * [Length Normalization](#length-normalization)
  * [Hash-Stake Extension](#hash-stake-extension)
  * [Analysis of the Hash-Stake Extension](#analysis-of-the-hash-stake-extension)
- [Analysis](#analysis)
  * [Security, Cost of Mining, and Cost of Attack](#security-cost-of-mining-and-cost-of-attack)
    + [Derivation](#derivation)
  * [Mitigating Long-range Revision Attacks](#mitigating-long-range-revision-attacks)
  * [Maximizing Active Stake](#maximizing-active-stake)
  * [Minter Punishment Collateral Damage](#minter-punishment-collateral-damage)
- [Potential Issues](#potential-issues)
    + [DDOS risk](#ddos-risk)
    + [Nothing at Stake](#nothing-at-stake)
    + [Time shifting](#time-shifting)
    + [Initial Centralization and long-term centralization](#initial-centralization-and-long-term-centralization)
    + [Opportunistic mining halt](#opportunistic-mining-halt)
    + [Prediction Attack](#prediction-attack)
    + [Economic Hidden-chain Attack](#economic-hidden-chain-attack)
    + [Orphan-based Mining Monopoly Attack](#orphan-based-mining-monopoly-attack)
    + [Economic Mining Monopoly Attack](#economic-mining-monopoly-attack)
    + [Minter Bribery](#minter-bribery)
- [Comparisons](#comparisons)
  * [Comparison to Pure Proof of Work](#comparison-to-pure-proof-of-work)
      - [Short-Range longest-chain Attacks](#short-range-longest-chain-attacks)
      - [Long-Range 51% Attacks](#long-range-51%25-attacks)
  * [Comparison to Ethereum's Casper Proof of Stake system](#comparison-to-ethereums-casper-proof-of-stake-system)
  * [Comparison to Proof of Activity](#comparison-to-proof-of-activity)
- [Discussion and Review](#discussion-and-review)
- [Version History](#version-history)
- [License](#license)

# Protocol

This document describes the protocol using Bitcoin terms, but these techniques could be applied to pretty much any cryptocurrency.

The high level overview of PoTO is that Proof-of-Work (PoW) miners and Proof-of-Stake (PoS) minters race side-by-side for each block. PoS minters can mint for almost 0 cost, allowing anybody in the network to participate in block creation. PoW blocks are used to keep PoS minters in check by ensuring there is only one longest-chain (ie preventing the nothing-at-stake problem) and preventing PoS minters from stake-grinding (attempting to affect their probability of minting the next block).

There are two types of blocks that can be created: mined PoW blocks and minted PoS blocks. Mining PoW blocks works exactly how mining works in Bitcoin. Just like mining is a race to find a block with a hash below a certain value, minting PoS blocks is also a race against both miners and other minters. More and more addresses are given the ability to mint a block each second until either one of them mints a block or a PoW miner mines a block. This race incentivizes miners to release their blocks as soon as they find them and release minted blocks as soon as they become valid.

## Terms

**Minter** - An address that is used to mint a PoS block.

**Minter progression** - A time-bound progression of *minter* addresses that determines what addresses are valid minters at any given time. The address progression is determined using an algorithm known as follow-the-satoshi (defined below) along with a pseudo-random list of indexes.

**Minter seed** - `hash(prevPowHash + height)`. This is a hash of the previous PoW block's (normal) hash concatenated with the current block height.

**Minter signature** - A message and a signature of that message that together prove a minter attempted to mint a particular block. The message contains the 18-byte ASCII "mintingTheBlockNow" followed by the hash of the last block and a hash of the block being minted.

**Satoshi cooldown period** - The period since the last PoW block, where a given satoshi must not have moved since that PoW block in order to be eligible to part of the minter progression.

## Validating a Block

The *minter progression* is determined pseudo-randomly using the *minter seed*. In this progression, X satoshi indexes are released each second, giving a chance for an active minter who owns one of those satoshi to mint a block. That number X is the inverse of the PoS difficulty, meaning that the difficulty is 1/X. The fewer satoshi indexes that are released each second, the higher the difficulty.

Proof of Work blocks are mined alongside the minted PoS blocks. The target block-time for PoW blocks should be the same as the target block time for PoS blocks, but the size of PoW blocks should probably be larger than the PoS blocks (since hashpower is critical for the security of the system).

A node will accept a block as valid if:

1. The block's timestamp is earlier than that node's current time

2. One of the following:

  2a. Its a PoS block and the address that signed the block (to mint it) owns a satoshi that has come up in the minter progression for that block before that block's timestamp
  2b. Its a PoW block and the block's hash is less than or equal to what the PoW difficulty requires (ie just like Bitcoin)

To mint a block, the minter simply creates a *minter signature* for that block and propagates it with the minted block.

## Follow-the-Satoshi

The [follow-the-satoshi algorithm](https://www.decred.org/research/bentov2014.pdf) is any algorithm that assigns a unique index from 0 to X-1 to each of X relevant satoshi. For PoTO, the relevant satoshi are any satoshi that haven't been moved since the last PoW block (so people can't influence their probability of minting by sending their funds to a new wallet with a higher probability of being given minter rights) and is also part of an address that contains at least enough funds to cover the minter punishment if it becomes applicable (more info below). The order is completely arbitrary and does not need to be random (since the miner progression is random).

An example way to implement this is to take the UTXO set and order each output from oldest to newest, assign the first M indexes to the oldest unspent output of M satoshi, the next N indexes to the next oldest unspent output of N satoshi, etc. This would index the satoshi in order from oldest to newest.

## Determining the Minter Progression

The current minter progression is determined using the *minter seed*. This can be any algorithm that creates a deterministic pseudo-random list of satoshi indexes from 0 to N where N is the number of relevant satoshi indexed by the follow-the-satoshi algorithm, using the *minter seed* as a seed.

## Determining Chain-length

When comparing two chains to see which is longer, the following formula will be used:

`Dwork*Dstake^(N*commonProportion)`

where

* `Dwork` is the accumulated PoW difficulty for the chain in question
* `Dstake` is the accumulated PoS difficulty for the chain in question
* `N` is an exponent that determines how heavily to weight accumulated PoS difficulty in comparison to accumuluated PoW difficulty
* `commonProportion` is the proportion of the chain common to both chains, given by `commonBlocks/maxBlocks`
    * `commonBlocks` is the number of common blocks that are the same in both chains
    * `maxBlocks` is the number of blocks in the relevant chain with the largest number of blocks

The `commonProportion` term of the formula makes it so when comparing two unrelated chains, only the accumulated proof of work difficulty is compared, and when comparing two chains that are mostly the same (a much more usual case), the chain length equation simplifies to the accumulated PoW difficulty multiplied by the accumulated PoTO difficulty. The reason this distinction is important is because if an attacker constructs a completely fresh chain with enough proof of work, they can control every address that owns coins on that chain, and so could maximize Dstake. If the length equation was only `Dwork*Dstake^N`, it would make it a lot easier for an attacker to create a completely fresh chain that would be seen as longer. Neutralizing `Dstake` when comparing fresh chains or mostly fresh chains makes it a lot harder for an attacker to successfully execute a fresh-chain attack.

Similarly, if the length equation only cared about `Dwork` (and got rid of the `Dstake^N` component entirely), it would mean that only proof of work would be securing the system, eliminating any benefits we'd get from PoS blocks. And of course if the length equation only cared about `Dstake`, it would be easy to successfully pull off a fresh-chain attack.

This chain-length equation is an extension of both those extremes, creating a gradient from one extreme to the other.

The `N` component allows the system to remain secure even if the attacker has a large super-majority of the hashpower. By weighting accumulated PoS difficulty more, it becomes possible to use a small fracion of the hashpower that Bitcoin currently has to achieve the same level of security. The appropriate value for N has yet to be determined, but should depend on the expected ratio between active stake and cost of hashpower. I suggest N=3 (similarly to PoA's similar proposal).

## Minter Punishment

The ability for PoS minters to mint on shorter chains in the hopes they become the longest chain (ie the nothing-at-stake problem) opens up the possibility of the Orphan-based Mining Monopoly Attack.

To combat this, the PoTO protocol allows a minter or miner to include a proof, in their minted or mined block, that another minter attempted to mint a block on a chain where the most recent PoW block is different from the chain in which the proof is included. If a valid proof is included in a block, the minter punishment fine transferred from the address that minted the offending block to the address that mined or minted the block in which the proof was given, and if the address no longer contains enough coins to cover the fine, the minimum number of most recent transactions from that address will be invalidated in order to make enough coins available to cover the fine. 

The proof will only be valid if the difference in height of the block in which the proof is given and the offending block about which proof is given is 5 or less. This is so there is a tight upper bound on how long a receiver must wait to be sure that their received transaction can no longer be invalidated by a minter fine applied to the sender. Since 5 blocks at 2 minutes would be about 10 minutes, this would provide a similar confidence of finalization as one bitcoin confirmation.

The proof consists of a chain of *minter signatures* (and *miner signatures* in the case that the Hash-Stake Extension is being used) that lead back to a block on the current chain. Any minter included in that chain after a PoW block that isn't in the current chain (for a block within 5 blocks of the current block) is fined. 

This punishment should be able to both solve the nothing-at-stake problem as well as the Mining Monopoly Attack and does it in a way that doesn't require any locked-in stake for minters so that there are no barriers to actively minting blocks.

## Confirmations and Transaction Finalization

A transaction should only be considered confirmed on the blockchain when the transaction has been confirmed by both a PoW block *and* a PoS block.

A transaction shouldn't be considered confirmed only by PoS blocks, since PoS blocks can mint on top of multiple conflicting chains. This shouldn't be a problem as long as people don't erroneously consider 1-PoS-confirmation transactions as confirmed.

Also, a transaction shouldn't be considered confirmed only by PoW blocks, since this could allow an attacker to double-spend via a 51% attack. While this attack is a lot harder than double-spending on someone accepting only PoS blocks as confirmation, it could be much easier than double-spending in today's bitcoin, since part of the point of PoTO is lowering the cost of mining (which by its nature reduces the hashpower in the system). This is why both PoW and PoS must be used to determine how finalized a transaction is.

## Block Rewards

Because the revenue from mining blocks directly affects how much work will be put into mining, most of the fees and coinbase rewards should go to miners so the amount of hashpower is nearly maximized for a given average fee-rate. But some incentive should be left to entice people to keep their addresses actively minting blocks. I’ll suggest the same thing [Charlie Lee suggested](https://bitcointalk.org/index.php?topic=102355.0) for Proof of Activity, that the PoW blocks earn 90% of the revenue, which would mean that a PoS block would be 10% the size of a PoW block (this ratio is up for debate).

## Proxy Minting

An empty address A can be used for minting PoS blocks on behalf of another address B as long as address A holds a rights-message signed by address B giving address A that right. The actual owner address B would be the one to receive any minted coins (not the minter address A). This would allow prospective minters to keep the keys securing their coins safely offline while still using their full balance to mint.

A proxy-minting-rights message could also include a fee amount that can be given to any address. It could also include an expirey block, after which the rights are revoked. This would allow users to allow a 3rd party to use their coins to mint blocks, in order for that 3rd party to get part of the reward as a fee. This could also facilitate pool minting. However, pool mining (giving someone else the power to mint blocks for you) might incentivize minter centralization and disincentivize users from running their own full node, so perhaps a feature for giving a fee to another address shouldn't in fact be added.

# Protocol Extensions

## Measuring Attack-cost and Fee-level Retargeting

The cost of an attack can be measured by measuring the cost of the hashpower and the active stake. The cost of the hashpower will tend toward miner revenues (fees and coinbase rewards) so that can be used as an approximation for the cost of the hashpower. The active stake can be calculated by using the stake difficulty, since that is the reciprocal of how many satoshi are released per second. The total number of satoshi divided by the number of satoshi released every PoS block (~ every 4 minutes) would give you the number of actively minting satoshi. Using these measurements, an attack-cost target could be chosen (some amount of bitcoins, or some percentage of bitcoins mined so far, etc) from which you could derive the revenue per block necessary to maintain that attack-cost. Then that information could be used to dynamically change the block size such that the block revenue will then continue to support the chosen target for attack-cost. This would  both make mining revenue more consistent and ensures a certain minimum level of security while also minimizing fees.

Note that in the case that the Hash-Stake Extension is being used, things are complicated a bit by the fact that hashpower isn't the only resource needed to mine. In that case, revenue from mining blocks should theoretically include the time-value of money for the miner-stake being used to mine. However, I would think this can be reasonably ignored as neglibigle for the purpose of this extension.

## Multiple PoW algorithms

In order to reduce mining centralization, multiple PoW algorithms could be used side by side. This would allow more seamless switch over from one algorithm to another if one of the algorithms is determined to be unfit at any point. It would also likely decentralize mining since different hardware and setup would be needed for each algorithm. While this extension is orthogonal to the general hybrid idea and its likely that centralization of the PoW mining wouldn't cause nearly as much of a problem as with pure PoW, it still seems prudent to minimize mining centralization. One coin that currently does this is MyriadCoin.

## Incentivizing full valiation by Proof of UTXO

Since deciding which fork to follow can only be done by fully validating nodes, its critical that a majority of that currency's economic actors (when counted by transaction volume) actively decide which forks to allow either by fully validating the chain or by intentionally and actively choosing a delgate to validate for it (eg using an SPV server or, in the case of PoTO, by delegating a minter proxy). This goal can be furthered by requiring that minters have the full UTXO set in order to practically mint blocks. This is further discussed in the [PoA whitepaper under the section "Discouraging thin clients by Proof of UTXO"](https://www.decred.org/research/bentov2014.pdf) and in the [Permacoin whitepaper](http://soc1024.ece.illinois.edu/permacoin.pdf).

## PoA Extension

PoTO's PoS blocks could be augmented by changing the minter progression from specifying individual satoshi to specifying specific sets of N satoshi that must all sign the block in order for it to be valid, similar to the set of N winners in Proof-of-Activity. This could raise PoTO's theoretical security to the level of PoA without introducing PoA's suceptibility to the Orphan-Based Mining Monopoly Attack. It would also allow more minters to be rewarded per minted block. However it would also increase the network traffic required for the protocol, since there would be many minted blocks that are propagated then eventually orphaned because of not having all N signatures needed. 

## Switchover Extension

If PoTO is added to an existing cryptocurrency, like Bitcoin, it wouldn't be wise to switch over abruptly because the system would start out with no active minters, giving an attacker the opportunity to exploit that to their benefit by becoming a large fraction of the set of active minters. To prevent this weakness, the chain-length equation could start without any consideration of PoS blocks and could be switched over to the chain-length equation shown above once enough active stake is in the system. Everything else about the protocol could be kept in place, including PoS block rewards (to entice people to actively mint).

## Length Normalization

Its possible that the chain-length equation above would de-emphasize accumulated PoS difficulty over time, since while PoS difficulty can max out at 100% actively minting coins, PoW difficulty can grow theoretical without bound (if a boundary caused by the current implementation is reached, that boundary can theoretically be removed, whereas the same isn't true of PoS difficulty). In other words, there will be some equilibrium reached where PoS difficulty maxes out, while processing cost will continue to decrease (thereby increasing the PoW difficulty). Because of this, every PoS block will add less to the chain than the last one (ie the last block's `PoSDifficulty/totalPoSDifficulty` will trend downward over time). PoW blocks have this effect, but to a lesser degree as the PoW difficulty will increase over time. 

If this is indeed the case, the length equation could be changed to the following:

`Sum(PoWDifficulty*RecentAccumulatedPoSDifficulty^(N*commonProportion))`  

where

* `PoWDifficulty` is the difficulty of the last PoW block, and
* `RecentAccumulatedPoSDifficulty` is the sum of difficulties of all the PoS blocks that have happened since the last PoS block.

In any case, more analysis is needed on this issue.

## Hash-Stake Extension

Additional Terms: 

**Miner-stake address** - An address with locked-in **miner-stake** funds required to mine blocks.

**Miner-stake lock-in period** - The number of blocks a particular *miner-stake address* has its funds locked for.

**Miner signature** - A message and a signature of that message required for a mined block to be valid. The message contains the 18-byte ASCII "miningThisBlockNow" followed by the height of the hash of the last block and a hash of the block being minted. The miner uses their *miner stake address* to create the signature.

Description:

Because of the Economic Mining Monopoly Attack, relying on miners puts an upper bound for the minimum cost of an attack at the cost of the maximum amount of miner resources that would remain profitable. In the case of pure-hashpower miners, this resource limit depends only on the cost of obtaining and maintaining hashpower. To increase this amount (and therefore the security of PoTO), the number of blocks a miner is able to mine can be tied to how much coin the miner owns in the following way:

Before mining, a miner would lock-up funds (using a message mined into a prior block) in a *miner-stake address*, then sign a subsequent block with that single miner-stake address (or proxy address similar to what's described in the section on *Proxy Minting*) and include that signature in the block. A block will only be valid if the hash is lower than the difficulty (as normal) and the used *minter stake address* has mined fewer than `minerStakeLockinPeriod*totalCurrentMinerStake/minerStake` blocks.

where

* `minerStakeLockinPeriod` is the number of blocks the *miner-stake address* has locked up its funds for.
* `minerStake` is the number of satoshi contained in the address the miner used to sign the block.
* `totalCurrentMinerStake` is the total number of satoshi currently locked in *miner-stake addresses*.

Coins can be added into a *miner-stake address* while its funds are locked and this can increase the number of blocks the miner can mine during the lock-in period. Coins in a *miner-stake address* **may not** be used for minting. When a *miner-stake address* is used to successfully mine a block, if its *lock-in period* ends sooner than 30 days-worth of blocks, the lock-in period is extended so that the coins are locked in for at least 30 more days-worth of blocks.

Miner stake should not be poolable, so it might be prudent to only allow mining addresses where just one signature is required to spend funds - ie no pay-to-script-hash or multi-signature addresses, to ensure that there is only one controller of those funds (the miner). A problem with this is it limits a miner's ability to properly secure their funds (for example in an address where signatures from 2 or 3 members of the miner organization are required to spend funds). One solution might be to only allow a very specific subset of the possible range of multi-signature addresses, maybe only allow 2-of-2, 2-of-3 and 3-of-3 multi-signature addresses.

## Analysis of the Hash-Stake Extension

The Hash-Stake Extension would make it so miners can only mine a maximum percentage of blocks equal to the percentage of `minerStake` they have when mining. One of the primary effects of this is that the cost of a Mining Monopoly Attack is increased, since a miner not only has to own x% of hashpower, but also x% of the total miner-stake.

Because the miner stake address locks up funds, a miner can't simply trade coins around in order to hash more blocks. Because miner-stake can't be (trustlessly) pooled, a miner can't easily obtain more miner-stake without purchasing it in full itself. And because miner-stake isn't allowed to be used in minting, an attacking miner must obtain *additional* coins if they want to successfully perform a longest-chain attack. 

Steps should be taken to ensure that stake can't be pooled, because allowing stake to be pooled for mining would eliminate the benefits of this extension - a miner could simply use honest stake to perform the Mining Monopoly Attack. So it should be ensured that there are no easy ways for stake to be pooled in any trustless way. Of course, trust-based pooling methods would still be available, which could end up being a problem if there is any pressure to centralize miner stake pooled in such a way.

Its also important that miner coin-ownership is rewarded proportionally to the number of coins - ie a miner with twice the coin should mine exactly twice as effectively. If twice as much coin ownership meant a miner would earn more than twice as much reward, this would act as pressure for miners to centralize toward one giant mining entity, which would be potentially dangerous. Note that the opposite is *note* true, if twice as much coin ownership meant a miner would earn less than twice as much reward, this would not provide any significant pressure to decentralize, because miners could simply split up their stake into multiple addresses.

Smaller miners will have a lower ROI because the lock-in transaction costs the same no matter how much coin is being locked in. This should produce very little centralization pressure beyond a certain (small) miner size.

The 30-day cooldown period a miner must wait to use for their miner-stake to unlock is there so miners can't attack the system and then immediately sell their stake. This provides some additional incentive for miners to play nice and not attack the system. The reasoning behind this is that miners who hold a significant amount of coin wouldn't want to attack the system because of the liklihood of losing the value of their held coins.

## Cost Analysis of the Hash-Stake Extension

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Attack Inequality: `a*HashCost*(b*MinterStakeCost)^N > HashCost*MinterStakeCost^N`  
where  
* *a* is the multiple of honest mining power the attacker has
* *b* is the multiple of honest active stake the attacker has

While the attack inequality remains essentially the same with this extension, the cost of an attack changes a bit:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`costOfAttack = a/(a+1)*(HashCost + MinerStakeCost) + b*StakeCost`

where

* *HashCost* is the cost of acquiring an amount of hashpower equal to the honest hashpower in the system
* *StakeCost* is the cost of acquiring an amount of coin equal to the honest actively minting coins in the system
* *MinerStakeCost* is the cost of acquiring an amount of coin equal to the amount of coin being used to mine by honest miners **PLUS** the cost of acquiring an amount of hashpower equal to the amount of hashpower being used to mine by honest miners.

You might think the cost of obtaining a times the honest mining power would be `a*(HashCost + MinerStakeCost)`, but the Economic Mining Monopoly Attack means that buying any new mining power will lead to an exit of honest mining power equal to what the attacker obtained. This brings the cost down to a multiple of just `a/(a+1)` rather than `a`.

**For N=0**, the Attack Inequality can be simplified to:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`a > 1`
This means that the minimum attack cost is where `a = 1`. From this we can transform the costOfAttack to its minimum cost:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`1/2*(HashCost + MinerStakeCost)`

So from this, we can see that even without any PoS minting at all, we can decrease the hashpower necessary to maintain a particular level of security as long as `MinerStakeCost` can make up the rest of the cost-of-attack. For example, if `2*MinerStakeCost` exceeds the target cost-of-attack, `HashCost` can theoretically be made arbitrarily low. In the case of N>0, making `HashCost` does open up the possibility of stake grinding, however at N=0 this obviously doesn't matter.

**For N>0**, things get a lot more complicated. The simplified Attack Inequality turns into:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`a*b^N > 1`
This means that the minimum attack cost is where `a*b^N = 1`. So in the case of a minimum-cost attack:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`a = b^-N`
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`b = a^(-1/N)`
From this we can transform the costOfAttack to:
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`a/(1+a)*(HashCost + MinerStakeCost) + a^(-1/N)*StakeCost`

At this point, the method for finding the minimum cost of attack might involve getting the derivative of this, then finding the zeros of that derivative and using that to find the minimum cost of attack. However, the math got far too complicated for me. I'm looking for someone to help me co-author this proposal and do some of this more complex mathematics to find the minimum cost of attacking PoTO with the Economic Mining Monopoly Attack in mind. 

# Analysis

## Security, Cost of Mining, and Cost of Attack

The premise of PoTO is that the security of proof-of-work can combine with the security of proof-of-stake. Because of the chain-length equation, the proportion of hashrate and stake an attacker must minimally have to successfully perform an attack is inversely related. Having just over 50% of each will always work, but this is almost never the cheapest way to attack. For example at N=1, with 75% of the hashrate (3 times the honest hashrate) an attacker would only need 1/3 of the active stake, and at N=3, an attacker with 75% of the hashrate needs a little over 40% of the active stake.

**Note that the possibility for the Economic Mining Monopoly Attack mostly makes the following analysis moot, since it significantly reduces the cost of attacking any miner-based system (including PoTO, of course). See the section on analysis of the Hash-Stake Extension for more info.**

The equation for finding the minimal cost of a successful longest-chain (*51%-style*) attack is:  

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;![`HashCost^(1/(N+1)) * StakeCost^(N/(N+1)) * (N^(-N/(N+1)) + N^(1/(N+1)))`](minCostFormula.svg)  
where  
* *HashCost* is the cost of acquiring an amount of hashpower equal to the honest hashpower in the system
* *StakeCost* is the cost of acquiring an amount of coin equal to the honest actively minting coins in the system

For N=1, this is `2 * SQRT(StakeCost*HashCost)`.  
For N=3, this is approximately `1.754765 * HashCost^(1/4) * StakeCost^(3/4)`. 

![Minimum Attack Cost](MinAttackCost.png)  
The above shows how much it costs to successfully execute a longest-chain attack in PoTO for a given cost of hashpower and active stake (hashpower, stake, and attack cost all as percentages of the total coins). Note that Bitcoin currently cost about 2.5% of all bitcoins to successfully longest-chain attack it. Even with 1/1000th of Bitcoin's hashpower, PoTO with N=4 would cost more to attack than Bitcoin as long as it has more than 8% of the coins actively minting. See [PoTO-v0.2-attack-cost.xlsx](PoTO-v0.2-attack-cost.xlsx) for details.

### Derivation

The formula for calculating the minimum cost of attack is derived in the following way. In a successful attack, the attacker must be able to build a longer chain. We’ll assume this isn’t a long-range revision, and therefore assume that the `commonProportion` term is very close to 1 and can then simplify the chain-length equation by ignoring it.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Attack Inequality: `a*HashCost*(b*StakeCost)^N > HashCost*StakeCost^N`  
where  
* *a* is the multiple of honest mining power the attacker has
* *b* is the multiple of honest active stake the attacker has

Also, the cost of a successful attack is the cost of acquiring the hashpower for the attack and the coins used for minting in the attack:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`costOfAttack = a*HashCost + b*StakeCost`
    
The Attack Inequality can be simplified to:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a*b^N > 1`  
This means that the minimum attack cost is where `a*b^N = 1`. So in the case of a minimum-cost attack:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a = b^-N`  
From this we can simplify the `costOfAttack` to:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `StakeCost*b + HashCost*b^-N`  
Getting the derivative of this with respect to `b`:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `StakeCost - HashCost*N*b^(-N-1)`  
The cost of attack will be minimized when the derivative is 0:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `StakeCost - HashCost*N*b^(-N-1) = 0`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `StakeCost = HashCost*N*b^(-N-1)`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `StakeCost/(N*HashCost) = b^(-N-1)`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `b = (StakeCost/(N*HashCost))^(1/(-N-1))`  
We can then solve for `a`:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a = (StakeCost/(N*HashCost))^(-N/(-N-1))`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `a = (StakeCost/(N*HashCost))^(N/(N+1))`  
Using these values for `a` and `b` under the condition of minimal cost of attack, we can obtain the above minimal cost of attack:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `HashCost*(StakeCost/(N*HashCost))^(N/(N+1)) + StakeCost*(StakeCost/(N*HashCost))^(1/(-N-1))`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `HashCost*StakeCost^(N/(N+1))*N^(-N/(N+1))*HashCost^(-N/(N+1)) + StakeCost*StakeCost^(1/(-N-1))*N^(1/(N+1))*HashCost^(1/(N+1))`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `StakeCost^(N/(N+1))*N^(-N/(N+1))*HashCost^(1/(N+1)) + StakeCost^(N/(N+1))*N^(1/(N+1))*HashCost^(1/(N+1))`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `HashCost^(1/(N+1)) * StakeCost^(N/(N+1)) * (N^(-N/(N+1)) + N^(1/(N+1)))`

## Mitigating Long-range Revision Attacks

Long-range attacks are where an attacker builds off the chain from a block height that was a long time in the past (some large percent of the blockchain ago, eg 50% of the blockchain ago, which would be a chain split off from a block mined more than 4 years ago). In pure proof-of-work, a long-range attack is always more expensive than a short-range attack, but in PoTO this isn’t the case. For example, a completely fresh-chain that is longer than the real/honest chain can be built without any existing coin ownership as long as the attacker has more hashpower than the network currently has. This might take an attacker months but could still actually be cheaper since no coins need to be obtained.

One way to mitigate this type of attack would be to simply incentivize higher miner revenue (eg through higher coinbase rewards or a smaller block size and therefore higher transaction fees) such that more honest hashpower enters the system. If the cost of the hashpower is higher, the cost of a long-range attack is higher.

A second way to mitigate this type of attack is for nodes to reject revisions if there is no common block (a complete fresh-chain) or if the highest common block is dated more than X days ago (eg 1 day). However this rule wouldn't help new nodes just entering the network, especially if they're being sybil attacked, and wouldn’t help SPV clients using an compromised SPV server that uses the new chain to show proof that a transaction exists in a valid chain with an appropriate length.

A third way to mitigate this would be hardcoded checkpoints in node and wallet software. This would be some data asserting that a block at a certain height has a certain hash. Since users must already either validate or trust their software, having a checkpoint like this would be simply another thing that should be peer-reviewed, and thus doesn't introduce any additional level of trust nor security risk. Including this hard-coded checkpoint would completely eliminate the possibility of a long-range attack that split from the true-chain before the checkpoint, even for new entrants and SPV clients using a compromised SPV server.

## Maximizing Active Stake

Since the security of PoTO depends on how much of the owned coins are actively searching for a block to mint, maximizing this proportion is important. At a high proportion of active stake, getting to mint a block would be like winning a lottery: cheap to participate in but rarely rewarded. For example, if each of the world's ~7 billion people had equal stake, with a 2 minute target blocktime (4 minutes per PoS block) there would be about 130,000 blocks per year giving about 1/50,000 chance of winning the ability to mint a block each year if everyone participated.

If the ability to mint 1 block every 50,000 years isn’t enticing enough to people, we could increase the number of winners per block by requiring that a minted block be signed by N addresses. For example, if we chose N=500 the chance of minting a block would be 1/100 per year (ie you could expect to mint one block in a 100 year lifetime). This would probably be a lot more enticing since you could actually expect to win at some point.

Of course, the more people that share the block rewards, the less reward there is per person. If we assume people make about 10 transactions per day on average with a fee of something like mɃ0.1 per transaction (of on-chain fees associated with lightning channel rebalances or reopenings), that would be a reward per minter of about mɃ35. Not tiny, but not that big either.

So to really maximize active stake would require some experimentation and probably constant automated retargeting, similar to the above proposal for retargeting the block size. It’s also possible that because of the low cost of running a minter, people may do it regardless of the reward. In that case, it might simply be best to keep the protocol so only 1 signature mints a block and gains a more substantial reward in the unlikely event they win.

Note that requiring more signatures for each PoS block would *not* increase security directly. It would only increase security in-so-far as it increased the actively minting proportion of the total coins.

## Minter Punishment Collateral Damage

In the process of minting, some unlucky honest minters will mint on a chain they think will remain the longest but actually becomes beat out by another chain. This will mean some honest minters get fined for minting. However, the number of honest minters that have to pay fines should be very low compared to the number of honest minters that mint a block on the longest chain, so as long as the fine is lower than the revenue received from minting a block, the expected revenue from attempting to mint should be greater than 0. Since the fine probably doesn't need to be very big to be effective, the expected revenue from attempting to mint should be approximately the full minter revenue. How big the fine needs to be depends on the likelihood that dishonest minting on a shorter chain ends up in the dishonest minter's favor. So the size of the fine is up for debate.

Note that a minter punishment proof isn't valid if the minted block and the current block share the same most-recent PoW block because PoS blocks don't make much of a difference in whether an attacker can succeed in a Mining Monopoly Attack unless the attacker has a large fraction of the actively minting coins, and punishing minters that minted on top of another PoS block would double the collateral damage. Some analysis on how much stake an attacker would have to have to successfuly execute a Mining Monopoly Attack is needed to verify that this is safe.

# Potential Issues

### DDOS risk
Since the addresses that are able to mint the next PoS block are known as soon as the previous block is mined, those minters could be DDOSed (by competing minters and miners or by other malicious actors). Even if this does happen, while it would suck for the minters who come up first in the progression, it wouldn't significantly impact the network as a whole, since more and more potential minters would come up in the progression, requiring a DDOS attack to attack more and more targets as time went on. But even this could only happen if the IP address associate with a given coin address becomes known, and other measures could be taken to shield yourself from new traffic and only interact with existing connections.

### Nothing at Stake

Since there is no punishment or downside for minters to mint on top of all unresolved PoS chains, its likely every active minter that comes up in the progression will attempt to propagate their block, creating a number of competing PoS chains that will only resolve to a single chain when a PoW block is mined on one of the chains. In a pure proof-of-stake system, this is a problem since chains may keep branching and never resolve to one definitely-longest chain. However in PoTO, the PoW blocks serve as the deciding factor for which chain ends up being the longest. On average only 1 PoS block will happen between PoW blocks, and it would be very rare for 3 or more PoS blocks to happen between two PoW blocks. In any case, the nothing-at-stake problem is limited to being a problem only for the amount of time that has passed since the last PoW block - which is why a transaction shouldn't be considered confirmed until it has had at least one PoW confirmation.

### Time shifting
If actors are incentivized to alter network-time to their advantage, things could go wrong. People might want to pretend time is moving faster in order to see more minting rewards. However, hopefully there would be enough honest actors to counteract this. Shifting time backward (pretending time is moving slower) could give current potential minters more time to realize they're a potential miner, mine, and broadcast the next block, but any active minter is probably instantly aware of this already and minting a block would be a fast operation. Broadcasting can take some seconds, and so might provide some small incentive to time-shift backward. But even if network-time becomes shifted over time, the accuracy of network time isn't that important, only approximate consistency.

### Initial Centralization and long-term centralization
Since only people who have coins can mint PoS blocks, those people would have an advantage in gaining new coins. This wouldn't be as much of a problem as in pure PoS protocols, since perhaps only ~10% of block rewards (and generated coinbase coins) would be given to minters. But if this is still a concern, the coinbase rewards for minters could be lowered or even eliminated if that was deemed appropriate.

Some have brought up the idea that proof-of-stake makes the rich get richer, so to speak. The idea is that the people who have more money will make more money and this would somehow lead to the largest owners eventually owning all the coins. However, this isn't actually what would happen. Since each actively minting address has a chance of minting exactly proportional to their ownership, this means that your expected ROI for minting (as a percentage) will be the same no matter how much coin you own. This means that if everyone is actively minting, no one will gain or lose anything on average over time, tho those that are actively minting would gain more than those that aren't.

Similar arguments hold for miner-stake in the case that the Hash-Stake Extension is being used.

### Opportunistic mining halt
A miner may stop mining if one of their addresses is coming up soon enough in the miner progression to maximize their chances to mint the next PoS block. While this could theoretically happen, the opportunity to do this should be very rare and the only problem it would cause is a 1-block temporary PoW slow down. Also, the incentives don’t promote this behavior, since mining a PoW block would be much more lucrative than minting a PoS block.

### Prediction Attack

A prediction attack would be executed by predicting what minter addresses will come up for some blocks in the future, generating addresses that come up very early in the minter progression, then moving their funds into those addresses so they can mint a higher proportion of blocks than their coin ownership would normally allow. However, because PoTO uses PoW to determine the minter progression, as long as a proof-of-work hash can be considered a random oracle, accurately predicting the minter progression should be impossible.

A note about stake grinding should be made here. While an attacker could stake grind a PoW block in order to give themselves a better chance of coming up early in the minter progression, this would require them to throw away a valid block they could gain a reward from. It would always be more beneficial for an attacker to add their PoW block to the chain as normal, since this doesn't in any way reduce their chances of finding a block where their addresses come up early in the progression. The section on opportunistic miner halting above discusses how a miner *could* give themselves a minting advantage.

To reiterate here about the Hash-Stake Extension, a miner with more hashpower than miner-stake could stake grind, and more analysis is needed to figure out how game theory plays out in such a case.

### Economic Hidden-chain Attack

A "25% attack" or [economic attack](https://bitcoinmagazine.com/articles/selfish-mining-a-25-attack-against-the-bitcoin-network-1383578440/) is where a selfish mining (and/or minting) strategy can allow a particular entity to gain more than their fair share of blocks and thereby either run honest miners out of the system by reducing their revenue below protitable levels or incentivize miners to join their coalition of selfish mining. Both of these outcomes increase the risk of a single entity or coalition gaining enough hashpower/stake to control the chain and do things like double-spend. [A paper](https://arxiv.org/abs/1311.0243) was written that talked about how Bitcoin is susceptible to this attack no matter how much hashpower the attacker has and suggested a partial-fix that when a miner has two potential chains of equal length to mine on top of, they randomly choose the chain to mine on top of. The paper says this makes it so the attacker requires 25% hashpower and goes on to say that theoretically there is no fix that could make this requirement larger than 33%. PoTO likely has this same problem, tho rather than being 25% it would be half the usual requirement of combined hashpower and stake, in turn halving the cost of an attack - however this is just conjecture until further analysis is done.

### Orphan-based Mining Monopoly Attack

For hybrid systems that rely on both PoW and PoS, like PoA, an attacker with greater than 50% of the mining power can push out other miners and monopolize the generation of PoW blocks. The attacker would gain more than 50% of the mining power, then simply refuse to mine (and/or mint in the case of PoTO) on top of any chain that contains new PoW blocks created by another miner and instead selfishly mine (and mint) only on the chain where the last PoW block was their's. Since the blocks would be valid blocks propagated normally through the network, any honest minter would mint blocks on top of the attacker's blocks, giving the attacker's chain just as much PoS as the honest chain. However, it would have more PoW and therefore would be the longest chain. At that point, no other miner would be able to make money and would be forced to exit the network, giving the attacker 100% or almost 100% of the hashpower. The attacker could then use their near complete control of the mining power to perform other attacks with very little coin ownership.

PoTO fixes this problem using minter punishments that incentivize minters to only mine on a chain if they think it will end up being the longest. This incentivizes rational minters to ignore shorter chains they have the opportunity to mint on, and only mint on top of the longest chain they're aware of (to minimize their chance of being punished).

### Economic Mining Monopoly Attack

Consider a mining environment where mining has near-break-even revenue (or exactly break-even considering opportunity cost) and where there are no altruistic honest miners willing to mine at a loss. In such a situation, any entering hashpower would correspond with an exit of a similar amount of hashpower (theoretically an identical amount of hashpower, given identical hashpower costs). What this means is that an attacker willing to mine 100% of the blocks at a loss can obtain 100% of the (active) hashpower.

The attacker with cost-effective hashpower could slowly obtain more and more hashpower while incurring very little loss, since any consistent loss is unsustainable for miners mining as a business and miners would stop mining until the remaining miners miners would again be profitable. The quicker the attacker gains this hashpower, the less loss they would incur. For bitcoin's 2-week difficulty periods, if the attacker obtains all the hashpower in that 2-week period, they would incur no loss at all during that time, and would only incur loss for the amount of time it takes the honest hashpower to stop mining bitcoin (probably to switch to a different cryptocurrency) once the difficulty adjusts.

Because this attack vector has nothing to do with manipulating the blockchain in programmatically detectable dishonest ways, there's no way to prevent anyone from executing this, other than by increasing the cost of obtaining enough hashpower such that operating that obtained hashpower exceeds the revenue earned by mining blocks. This means that any system where miners compete with each other only via hashpower and that relies on the attacker not achieving near-100% of the hashpower, is susceptible to this attack.

Even detecting this attack would be difficult as this would look like some miners simply found a more cost-effective way to mine. What you would see is that the honest miners who identify themselves in their blocks will stop mining. Once a lot of such miners exit the system, the only way to prevent the attack would be to add more block revenue (coinbase reward and fees).

Bitcoin is also susceptible to this, which means that an actor attacking Bitcoin at equilibrium (which Bitcoin is not at today) would only need to obtain an amount of hashpower equal to half the existing hashpower, rather than having to double the existing hashpower. Of course, Bitcoin is not at equilibrium, and it remains to be seen how long it will take for miner profit margins shrink to the point where the effects of this form of attack would be significant.

So while PoTO is more secure for a given amount of mining power than pure-PoW protocols, the cost of an attack is only, at maximum, doubled (from 50% of the profitable mining power to 100%). And this should actually be the theoretical maximum security of any consensus protocol that has attack vectors if the attacker gains 100% of the hashpower.

While this problem can't be circumvented entirely, you can increase the cost of this attack by increasing requirements for mining a block. One example is giving a miner an advantage depending on how much coin they own. I detailed this in the section on the Hash-Stake Extension.

### Minter Bribery

Because of the possibility of a Orphan-based Mining Monopoly Attack, it is important that honest minters only mint on top of the longest chain. If an attacker can bribe a significant fraction of minters to sign their blocks secretly, those minters could escape the possibility of being punished for dishonest mining while giving an attacker the ability to successfully execute the Mining Monopoly Attack. The likelihood of this seems incredibly small tho, since it would require active dishonesty by a large portion of coin holders, all of whom have a huge incentive to keep the system (and thus their money) secure and would risk that security by dishonestly minting, only getting rewarded for it if the attacker succeeded.

# Comparisons

## Comparison to Pure Proof of Work

**NOTE: Comparisons of cost-of-attack in this section are currently outdated because of the discovery of the Economic Mining Monopoly Attack. Updated analysis of the Hash-Stake Extension is pending.**

#### Short-Range longest-chain Attacks

The requirements for a successful hidden-chain 51%-style attack on PoTO would be far larger than for PoW for a given amount of honest mining expenditures. To be successful against PoTO, an attacker would likely need many times the honest hashpower along with owning a significant fraction of the coins actively watching for minting opportunities. Because the longest chain is determined by multiplication of the PoW and PoTO accumulated difficulties, for N=3, even if a single miner managed to accumulate 90% of the hash power, they wouldn't be able to produce a significantly longer chain without also owning more than 32% of the active stake. 

For bitcoin as of Feb 2018, the cost of achieving 50% of the hashrate is about 440,000 btc (if using 1.9 million Antminer S9s) and 5% of all bitcoins is 900,000 btc. So assuming 5% of honest coin ownership actively mints in a PoTO system with N=3, the minimal cost of attack would be about 1.3 million btc. So at the same hashrate, the capital cost of longest-chain attacking Bitcoin would triple if it used PoTO. Even if the Proof-of-Work blocks were reduced to 1/100th the total reward (fees and coinbase), the cost of the attack would still be about what is currently is in bitcoin (even without considering the difference in recoverable value between hashpower and stake). Any increase in the proportion of active minters or total value of the currency would increase that capital cost substantially. 

#### Long-Range 51% Attacks

Pure proof of work simply doesn’t have a risk of long-range attacks, since short-range attacks are always cheaper. 

If we incentivized fees of 1/10th of what Bitcoin has, the total mining cost would also be 1/10th of what it currently is for Bitcoin. If we built a blockchain with 1/10th the accumulated difficulty that bitcoin has and 1/10th the hashpower, the cost of creating a whole new fresh chain at that level would be 1/10th of the cost of doing that for bitcoin. So where this would cost about 1 million btc for Bitcoin, with this hypothetical PoTO chain with 1/10th the hashpower it would only cost 100,000 btc. In both cases it would take about 280 days. (See [PoTOcostOfFreshChainAttack.xlsx](https://github.com/fresheneesz/proofOfTimeOwnership/raw/master/PoTOcostOfFreshChainAttack.xlsx) for calculations.)

So there is a tradeoff here, if we rely less on PoW security and more on PoTO security, mining can be much cheaper for the same cost of performing a short-range 51% attack, but it becomes cheaper to build a fresh-chain. 

Ways of mitigating this are mentioned above in the section titled "Mitigating Long-range Revision Attacks".

## Comparison to Ethereum's Casper Proof of Stake system

PoTO remains P2P & protocol-neutral. While [Casper](https://github.com/ethereum/research/blob/master/papers/casper-basics/casper_basics.pdf) has a minter class (aka stakers) and a node class, everyone is potentially a miner in PoTO. 

Since stakers can't use their coins, this makes it impossible for everyone to participate in Casper minting, and in practice this will likely mean that fewer people will bother to actually actively participate. In PoTO, minting can be done automatically anytime you have an online node without any downside, but in Casper you need to take manual actual to stake or unstake your coins. While this could theoretically be as easy as transferring money from a savings to a checking account (and then waiting weeks for the transition to happen), the extra complication there will definitely deter some people from participating or would at minimum prevent willing participants from participating with all their coins. The security of both PoTO and Casper depend on high participation in minting, and so PoTO allowing more people to practically participate would increase the cost of an attack potentially drastically by comparison.

Two primary attacks Casper goes to lengths to mitigate are long-range revisions (where a coalition of validators with ⅔ of a past validator set can create conflicting chains) and catastrophic crashes (where more than 1/3 of validators go offline). PoTO’s susceptibility to long range revisions is limited due to its use of PoW, tho higher than a pure PoW system. And  PoTO doesn’t have the problem of catastrophic crashes because it doesn’t use quorums (validator sets), and instead a new satoshi will be given the right to mint a block each second, allowing more and more of the address space to mine a block, meaning that the longer it takes for a block to be mined, the more people will be able to mint a block.

Casper attempts to solve the nothing-at-stake problem by using pre-staked ether and confiscating that ether if the validator owning that stake validates blocks on multiple competing chains. PoTO’s uses the same mechanism that Bitcoin uses to solve this problem: PoW blocks. A PoTO chain can allow multiple competing minted blocks, but only one will be mined on top of. 

Casper also requires a “proposal mechanism” and currently plans on using a PoW mechanism to do that. That proposal mechanism adds costs to Casper that aren’t discussed in the proposal, since they’re separate. PoTO is self-contained and doesn't need any external mechanism to operate properly.

## Comparison to Proof of Activity

[Proof of Activity (PoA)](https://www.decred.org/research/bentov2014.pdf) is a somewhat similar hybrid protocol, but rather than use PoW blocks and PoS blocks as separate entities, PoA requires that each block be validated by both proof of work and proof of stake.

PoA seems to have exceptionally good theoretical security against double-spending attacks, similar to PoTO, tho they didn’t give a formula for the minimum cost of attack and I haven’t derived it. (See [PoA-min-attack-cost.xlsx](https://github.com/fresheneesz/proofOfTimeOwnership/raw/master/PoA-min-attack-cost.xlsx)).

However PoA potentially has significantly higher load on the network than either Bitcoin or PoTO. The protocol requires miners to usually mine multiple blocks until all N minters derived from one of those blocks are online. With N being 3 as suggested in the paper, this would take 8 blocks for 50% online stake. At 10% online stake, this would be 1000 blocks. At ~100 bytes per (empty) block, 1000 blocks would be 100kb. Not too bad, but it can certainly be significant network-wide overhead, especially if blocktimes are reduced (with blocksizes proportionally reduced, which would mean a higher percentage of network traffic would be unused [vs used] block headers). With slightly higher values for N, this problem increases exponentially. For example, with N=5 and 10% online stake, this would be a very unwieldy extra 10MB per block. By contrast, PoTO doesn’t have any significant extra network overhead. 

Furthermore, the cost of successfully executing a censorship attack is equal to basic PoTO for N=1, and much less than PoTO when N > 1. This attack would be performed by an attacker with greater than A times the honest hashpower and B times the honest online stake, where A > 1 (at least 50% of total hashpower) and B > 1/(A*N) (a potentially small fraction of online stake). The attacker would mine blocks, but not release them unless one of the attacker's addresses is one of the N winning stakeholders for that block.  When such a block is found, the attacker would release the block and wait until N-1 stakeholders sign the block, and then sign the block themselves as the Nth stakeholder putting in (or leaving out) any transactions they want, and mine only on top of that block. While a double-spend attack becomes exponentially more difficult as N grows, a censorship attack becomes proportionally easier to pull off as N grows. For example, at the suggested N=3, you only need 34% of the active stake along with 50% of hashpower, or 9% of the active stake with 88% of the total hashpower. This could be a significant limitation of PoA, since while a double-spend attack is terrible, a censorship attack is also unacceptable. This attack is costlier than pure PoW, but not as costly as it is in PoTO. An easy modification to PoA that would eliminate this lower-cost attack is to allow each of the N winning stakeholders for a block include up to 1/Nth of the bytes of transactions in the block. This way, each stakeholder would contribute some transactions to the block, and thus an attacker would need to control all stakeholders for a block in order to ensure that a transaction is censored.

PoA is also suceptible to the PoW Monopoly Attack, where an attacker gains more than 50% of the hashpower and monopolizes the generation of PoW blocks, pushing any other miner out of business. The attacker would gain more than 50% of the hashpower, then simply refuse to mine on top of any chain that contains new PoW blocks created by another miner and instead selfishly mine on the chain where the last PoW block was their's. Since the blocks would be valid blocks propagated normally through the network, any honest minter would mint blocks on top of the attacker's blocks, giving the attacker's chain just as much PoS as the honest chain. However, the attacker's chain would have more hashpower and therefore would be the longest chain. At that point, no other miner would be able to make money and would be forced to exit the network, giving the attacker 100% or almost 100% of the hashpower. The attacker could then use their near complete control of the hashpower to perform other attacks with very little coin ownership. Since blocks can't be created without a miner, I don't see a way to fix this problem in PoA without fundamentally changing the PoA protocol.

[Decred](https://docs.decred.org/research/hybrid-design/), [Memcoin2](https://www.decred.org/research/mackenzie2013.pdf), [Hcash](https://h.cash/themes/en/dist/pdf/HcashWhitepaperV0.8-edited.pdf), the [2-hop Blockchain](https://eprint.iacr.org/2016/716.pdf) and the related [TwinsCoin](https://eprint.iacr.org/2017/232.pdf) all have very similar protocols to PoA and also have similar problems. All use PoS and PoW in lock step: a PoW block is mined and then a PoS stage chooses a validator or group of validators who then sign the PoW block (in the case of the 2-hop Blockchain, the PoS mint a single new block). If no validator signs the block, a new PoW block is mined which chooses a different validator that will sign the block. In all of these protocols PoS simply validates a PoW block, but doesn't compete against it. 

Because of this lock-step behavior, all these coins are vulnerable to the PoW Monopoly Attack, just like PoA. Decred, Memcoin2, and Hcash also are vulnerable to the censorship attack problem, where anyone with 51% of the hashpower can successfully censor transactions indefinitely even with no stake. 

Decred and Memcoin2 also require stakers to buy stake "tickets" (similar to staking ether in Casper). It's unclear to me whether that has any significant security consequences. Decred's support for stakepools enables and encourages centralization and discourages people from running their own full nodes (which is important for having a say in the case of a fork). Decred hasn't given any information on the cost of attacking the system, but it looks to be less costly than both PoA and PoTO, since only 3 of 5 block signers vs PoA's requirement that all N winners sign the block for it to be valid. 

Discussion and Review
=====================

Please feel free to use the github issues as a forum for questions and discussing this protocol, as well as proposed changes to the protocol.

Version History
===============

* 0.4.0
    * Adding the Hash-Stake Extension
    * Changing the name of the "Hashpower Monopoly Attack" to the more general name "Mining Monopoly Attack"
* 0.3.1 - Adding a discussion of the Economic Hashpower Monopoly Attack, which significantly reduces the security of PoTO (and all other similar hybrid protocols) to about twice the security of pure PoW.
* 0.3.0
	* Getting rid of the address hash which considered the last PoS block's address hash, and replacing it with the *minter seed* which considers only the last PoW block hash and the current block height to solve the prediction attack problem
	* Removing the sections on the two-in-a-row minting issue and opportunistic chain switching, since that's resolved by switching to a minter seed that doesn't consider anything from PoS blocks.
* 0.2.0
	* Added the `N` component to the chain-length equation, which substantially boslters the security of PoTO for networks with a low amount of hashpower.
	* Added minter punishments
	* Added Minter Bribery attack
	* Removed PoA Extension and PoS-Absence Extension (since they are obsoleted when the N component of chain-length is greater than 1). Note that the PoS-Absence extension might still be useful, but its complicated and doesn't seem to add much additional security over using for example N=3.
* 0.1.2
	* Added analysis of a couple more attack vectors
	* Added PoA Extension section 
* 0.1.1
	* Added formula for the minimum cost of double-spend attack (and derivation)
	* Added PoS-Absence Extension
	* Changing block rewards such that miners get most of the fees
	* Adding section on feel-level retargeting
	* Adding the blockheight into the address hash and getting rid of the progression seed term
	* Lots of cleanup, better organization, and better more full explanations and analysis
* 0.1.0 - First version

License
=======
Released under the MIT license: http://opensource.org/licenses/MIT