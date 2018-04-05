var findMinimum = require("./findMinimum")

var honestValues = {
    hashPower: [/*.02,*/ .1,.25, .5, 1, 2.5, 5], // cost as percents of total coins
    mintingCoins: [.1, 1, 5, 10, 50],  // as percents of total coins
    minerStake: [0,.1,.5,1,2,10],   // as percents of total coins
    N: [1, 2, 3, 4, 8, 16, 32]//[0,.1,.3,.5,.8, 1, 1.5, 2, 3, 4]//[0,1,2,3,4] //[0,1]
}
//var ExpectedHonestValues = {
//    hashPower: [.02, .1,.25, .5, 1, 2.5], // cost as percents of total coins
//    mintingCoins: [5, 10, 50],            // as percents of total coins
//    minerStake: [.1,.5,1,2],              // as percents of total coins
//    N: [1]
//}
//honestValues = ExpectedHonestValues

//*
var results = calculateMinCosts(honestValues)

//printFullResultsTable(results)
printResultsTableCondensedOnN(results)
//printResultsTableCondensedOnMinerStake(results)


//*/

//var cost = attackCost({hashPower:.1, mintingCoins: 50, minerStake: 10, N:1}, 0, 0)
//console.log(cost)

//findMinimum.testFindMinimum()
//findMinimum.testFindTroughs()
//findMinimum.testFindLocalMinimum()

function printResultsTableCondensedOnMinerStake(results) {
    var last = {}, curLine = 'hashPower\tmintingCoins\t'+honestValues.minerStake.join('%\t')+'%'
    results.forEach(function (result) {
        var args = result.args

        if(last.mintingCoins !== args.mintingCoins) {
            last = args
            console.log(curLine)
            curLine = args.hashPower+'%\t\t'+args.mintingCoins+'%\t\t'
            if(args.minerStake !== 0 && args.N === 0) {
                curLine += '--\t'
            }
        } else {
            curLine += '\t'
        }

        curLine += precision(result.cost,3)+'%'
    })

    console.log(curLine)
}

function printResultsTableCondensedOnN(results) {
    var last = {}, curLine = 'hashPower\tmintingCoins\tminerStake\tN='+honestValues.N.join('\tN=')
    results.forEach(function (result) {
        var args = result.args

        if(last.minerStake !== args.minerStake) {
            last = args
            console.log(curLine)
            curLine = args.hashPower+'%\t\t'+args.mintingCoins+'%\t\t'+args.minerStake+'%'+'\t'
            if(args.N !== 0) {
                curLine += '--\t'
            }
        } else {
            curLine += '\t'
        }

        curLine += precision(result.cost,3)+'%'
    })

    console.log(curLine)
}

function printFullResultsTable(results) {
    console.log('hashPower\tmintingCoins\tminerStake\tN\tatkMinerPower\tatkStakeGrindingPower\tcost')
    results.forEach(function (result) {
        var args = result.args
        var stakeGrindingPower = result.stakeGrindingPower
        if(stakeGrindingPower !== '--')
            stakeGrindingPower = precision(stakeGrindingPower,3)

        var log = args.hashPower+'%\t\t'+args.mintingCoins+'%\t\t'+args.minerStake+'%\t\t'+args.N+'\t'+precision(result.minerPower,4)+'%\t\t'
                    + stakeGrindingPower+'%\t\t\t' + precision(result.cost,3)+'%'

        console.log(log)
    })
}

function calculateMinCosts(honestValues) {
    var combinations = createCombinations(honestValues, Object.keys(honestValues))
    //console.dir(combinations)
    var results = combinations.map(function(args,comboN) {
        process.stdout.write('\r'+comboN+'/'+combinations.length)

        if(args.N === 0) {
            if(args.mintingCoins === honestValues.mintingCoins[0]) {
                args.mintingCoins = 0
                var cost = attackCost(args,50, 0)
                args.mintingCoins = '--'
                return {args: args, minerPower: 50, stakeGrindingPower: '--', cost:cost}
            } else {
                return undefined
            }
        }

    //    console.dir(args)
        var minStakeGrindingPowerMap = {}
        var minimumMinerPower = findMinimum.findMinimum([0, 100],5, .0001, function(miningPower) {
            var maxStakeGrindingPower = args.mintingCoins/args.hashPower // the rational being that an attacker will never want to pay more for hashpower than for minting
            if(maxStakeGrindingPower === 0) {
                var minimumStakeGrindingMiningPower = 0
            } else {
                var minimumStakeGrindingMiningPower = findMinimum.findMinimum([0, maxStakeGrindingPower], maxStakeGrindingPower/1000, .0001, function(stakeGrindingPower) {
                    return attackCost(args, miningPower, stakeGrindingPower)
                })
            }

    //        console.log("var minimumStakeGrindingMiningPower = "+minimumStakeGrindingMiningPower)
            minStakeGrindingPowerMap[miningPower] = minimumStakeGrindingMiningPower
            return attackCost(args, miningPower, minimumStakeGrindingMiningPower)
        })


        return {
            args: args,
            minerPower: minimumMinerPower, stakeGrindingPower: minStakeGrindingPowerMap[minimumMinerPower],
            cost: attackCost(args, minimumMinerPower, minStakeGrindingPowerMap[minimumMinerPower])
        }
    })

    process.stdout.write('\r')
    return results.filter(function(x){return x !== undefined})
}

function attackCost(args, miningPower, stakeGrindingPower) {
    var mintingPower = calcMintingPower(args.N, miningPower/100, stakeGrindingPower/100)

    var mintingCoins = args.mintingCoins/(1/mintingPower - 1)
    // derivation:
    //
    // s1/(s0+s1) = mintingPower
    // where
    // mintingPower = attacker's percentage of actively minting coins
    // s0 = honest amount of actively minting coins
    // s1 = attacker's amount of actively minting coins
    //
    // s1 = mintingPower*(s0+s1)
    // 1 = mintingPower*(s0/s1+1)
    // 1-mintingPower = mintingPower*s0/s1
    // 1/mintingPower - 1 = s0/s1
    // s1 = s0/(1/mintingPower-1)

    var hashpowerCost = miningPower*args.hashPower/100
    var minerStake = miningPower*args.minerStake/100
    var stakeGrindingHashpowerCost = stakeGrindingPower*args.hashPower/100

    return hashpowerCost+minerStake+mintingCoins+stakeGrindingHashpowerCost
}

// miningPower - the fraction of honest mining power the attacker has (not including hashpower used to stake grind)
// stakeGrindingPower - the fraction of honest mining power used to stake grind (can be higher than 100%)
function calcMintingPower(N, miningPower, stakeGrindingPower) {
    // derivation:
    //
    // Attack Inequality: m*(1+g)*s^N > (1-m)*(1-s)^N
    // Cost of Attack: m*(HashCost + MiningStake) + s*MintingCoins
    // where
    // s = attacker's % of minting stake
    // m = attacker's % of mining power
    // g = how much hashpower the attacker is using to stake-grind, expressed as a fraction of total hashpower
    //
    // m*(1+g)*s^N = (1-m)*(1-s)^N
    // (1+g)*s^N = (1/m-1)*(1-s)^N
    // (1+g) = (1/m-1)*(1-s)^N/s^N
    // (1+g) = (1/m-1)*(1/s-1)^N
    // (1+g)/(1/m-1) = (1/s-1)^N
    // ((1+g)/(1/m-1))^(1/N) = 1/s-1
    // 1+((1+g)/(1/m-1))^(1/N) = 1/s
    // s = 1/( 1 + ((1+g)/(1/m-1))^(1/N) )
    //
    // Note also that stake-grinding allows the miner using stake-grinding to mint stakeGrindingPower*mintingPower extra PoS blocks

    if(N === 0)
        return 0  // if N is zero, minting doesn't happen at all
    else
        return 1/( (1+Math.pow((1+stakeGrindingPower)/(-1 + 1/miningPower), 1/N)) )
}

function createCombinations(paramValues, keyList) {
    var results = []

    if(keyList.length > 1) {
        var subResults = createCombinations(paramValues, keyList.slice(1))
    } else {
        var subResults = [{}]
    }

    paramValues[keyList[0]].forEach(function(value) {
        subResults.forEach(function(result) {
            var resultCopy = Object.assign({}, result)
            resultCopy[keyList[0]] = value
            results.push(resultCopy)
        })
    })

    return results
}

function precision2(x) {
    return Math.floor(10*x)/10
}
function precision(x,precision) {
    var multiplier = Math.pow(10,precision-1)
    return Math.floor(multiplier*x)/multiplier
}













