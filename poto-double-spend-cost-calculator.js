// This simulates the progression of an attacker chain and an honest chain for PoTO with the PoS-Absence Multiplier extension

var attackCost = require('./attackCost')

var honestSpend = {hashPower: 1000, activeStake: 100*1000}//{hashPower: 1000, activeStake: 100*1000}  // the numbers here are only for ratios, but they could represent billions of dollars or thousands of bitcoins
var attackerSpend = {hashPower:10000, activeStake: 30*1000}
var targetTime = 4 // note: same target time for both PoS and PoW (so a block would happen twice in this amount of time)
var noPotoBase = 2 // the base used for upping the real (but not counted) difficulty the longer there is between PoS blocks
var minutesToCalc = 5*60//3*24*60
var onlyShowLongestChainChanges = false  // if true, the output only shows lines where the chain that is the longest has changed

console.log("\t\tHonest\tAttacker")
console.log("Hashpower Cost\t"+honestSpend.hashPower+"\t"+attackerSpend.hashPower)
console.log("Active Stake\t"+honestSpend.activeStake+"\t"+attackerSpend.activeStake)
console.log("")
console.log("Target Time: "+targetTime+"min")
console.log("No-PoTO base: "+noPotoBase)

var calculator = attackCost(targetTime, noPotoBase, honestSpend, attackerSpend)
calculator.createBlocks(minutesToCalc)

console.log("\t   Blocks\t\tAccumulated Difficulty")
console.log("minute\tHonest\tAttacker\tHonest\tAttacker\tAttacker is Longer")

var hn=0, an= 0, attackerWasLonger = false, lastTime=-Infinity, lastChangeTime
while(true) {
    var attackerBlock = calculator.attacker[an], honestBlock = calculator.honest[hn]
    if(honestBlock.time < attackerBlock.time || lastTime == attackerBlock.time) {
        var time = honestBlock.time
    } else {
        var time = attackerBlock.time
    }

    var lastTime = time
    var timeInMinutes = precision2(time)
    var honestAD = calculator.calcAccumulatedDifficulty(calculator.honest,hn)
    var attackerAD = calculator.calcAccumulatedDifficulty(calculator.attacker,an)

    if(attackerAD>honestAD) {
        var attackerLength = 'longer'
    } else if(attackerAD === honestAD) {
        var attackerLength = 'same'
    } else {
        var attackerLength = ''
    }

    var line = timeInMinutes+'\t'+(hn+1)+'\t'+(an+1)+'\t\t'+precision2(honestAD)+'\t'+precision2(attackerAD)+'\t\t'+attackerLength
    if(onlyShowLongestChainChanges) {
        if(attackerWasLonger && attackerAD<honestAD || !attackerWasLonger && attackerAD>honestAD) {
            console.log(line)
            attackerWasLonger = !attackerWasLonger
            lastChangeTime = timeInMinutes
        }
    } else {
        console.log(line)
    }

    var nextHonestBlock = calculator.honest[hn+1], nextAttackerBlock = calculator.attacker[an+1]
    if(nextHonestBlock !== undefined && nextAttackerBlock !== undefined) {
        if(nextHonestBlock.time < nextAttackerBlock.time) {
            hn++
        } else if(nextHonestBlock.time > nextAttackerBlock.time) {
            an++
        } else {
            hn++; an++
        }
    } else if(nextHonestBlock !== undefined && nextAttackerBlock === undefined) {
        hn++
    } else if(nextHonestBlock === undefined && nextAttackerBlock !== undefined) {
        an++
    } else {
        break; // done
    }
}

function precision2(x) {
    return Math.floor(10*x)/10
}