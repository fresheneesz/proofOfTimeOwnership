var attackCost = require('./attackCost')

var targetTime = 4 // note: same target time for both PoS and PoW (so a block would happen twice in this amount of time)
var noPotoBase = 2 // the base used for upping the real (but not counted) difficulty the longer there is between PoS blocks
var minutesToCalc = 200*60
var onlyShowLongestChainChanges = true  // if true, the output only shows lines where the chain that is the longest has changed

console.log("Target Time: "+targetTime+"min")
console.log("No-PoTO base: "+noPotoBase)
console.log()

console.log("NOTE: calculating each line can take quite a while (~20 seconds)\n")
console.log("   Honest\t   Attacker\t\t1st Contention Window\t2nd Contention Window")
console.log("Hashpwr\tStake\tHashpwr\tStake\tCost\t  (in minutes)\t\t  (in minutes)")


// the numbers here are only for ratios, but they could represent thousands of bitcoins or billions of dollars
for(var honestStake=100; honestStake<=1000*1000*1000*1000*1000*1000; honestStake*=10) {
    var honestSpend = {hashPower: 1, activeStake: honestStake}

    var info = attackCost.calcMinAttackCost({
        targetTime:targetTime, noPotoBase:noPotoBase, honestStake:honestStake,
        increment: 2, targetWindow: {low:55, high:65}
    })

    printAttackWindow(honestSpend, info.attackerSpend, info.windows)
}

function printAttackWindow(honestSpend, attackerSpend, attackWindows) {
    var line =
        honestSpend.hashPower+"\t"+precision2(honestSpend.activeStake)+'\t'
        +percent(attackerSpend.hashPower,honestSpend.hashPower)+"\t"+percent(attackerSpend.activeStake,honestSpend.activeStake)+'\t'
        +precision2(attackerSpend.hashPower+attackerSpend.activeStake)+'\t\t'

    if(attackWindows.first) {
        line += precision2(attackWindows.first.start)+"-"+precision2(attackWindows.first.end)
    } else {
        line += "none"
    }

    line += '\t\t'

    if(attackWindows.second) {
        line += precision2(attackWindows.second.start)+"-"+precision2(attackWindows.second.end)
    } else {
        line += "none"
    }

    console.log(line)
}

function precision2(x) {
    return Math.floor(10*x)/10
}
function percent(num,denom) {
    return precision2(100*num/denom)+'%'
}