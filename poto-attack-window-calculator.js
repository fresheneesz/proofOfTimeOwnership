var attackCost = require('./attackCost')

var targetTime = 4 // note: same target time for both PoS and PoW (so a block would happen twice in this amount of time)
var noPotoBase = 2 // the base used for upping the real (but not counted) difficulty the longer there is between PoS blocks
var printOnlySuccessfulAttacks = true

console.log("Target Time: "+targetTime+"min")
console.log("No-PoTO base: "+noPotoBase)
console.log()

console.log("   Honest\t   Attacker\t\t1st Contention Window\t2nd Contention Window")
console.log("Hashpwr\tStake\tHashpwr\tStake\tCost\t  (in minutes)\t\t  (in minutes)")

calcAndPrintAttackWindow({hashPower: 1000, activeStake: 100*1000}, {hashPower: 100000, activeStake: 30*1000}) // example in PoS-Abscence Multiplier example

//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 20})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 25})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 28})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 29})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 30})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 31})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 32})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 33})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 100, activeStake: 34})
//
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 22})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 25})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 28})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 29})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 30})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 31})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 32})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 33})
//calcAndPrintAttackWindow({hashPower: 1, activeStake: 100}, {hashPower: 10, activeStake: 34})


// the numbers here are only for ratios, but they could represent thousands of bitcoins or billions of dollars
//for(var honestStake=10; honestStake<=128; honestStake*=1.5) {
    var honestStake = 10
    var honestSpend = {hashPower: 1, activeStake: honestStake}

//    for(var attackerHashpower=1; attackerHashpower<=100; attackerHashpower*=1.5) {
//        for(var attackerStake=attackerHashpower; attackerStake<=honestStake; attackerStake*=1.5) {
//            var honestSpend = {hashPower: 1, activeStake: honestStake}
//            var attackerSpend = {hashPower: attackerHashpower, activeStake: attackerStake}
//
//            calcAndPrintAttackWindow(honestSpend, attackerSpend)
//        }
//    }

    for(var attackerStake=.4*honestStake; attackerStake > .1*honestStake; attackerStake -= .01*honestStake){///=1.5) {
        var attackerHashpower= 1, multiplier = 1.5, direction = 1
        while(true) {
            var attackerSpend = {hashPower: attackerHashpower, activeStake: attackerStake}

            var calculator = attackCost(targetTime, noPotoBase, honestSpend, attackerSpend)
            var attackWindows = calculator.calcAttackWindows()

            if(printOnlySuccessfulAttacks) {
                if(attackWindows.first !== undefined && attackWindows.first.end > 60) {
                    printAttackWindow(honestSpend, attackerSpend, attackWindows)
                }
            } else {
                printAttackWindow(honestSpend, attackerSpend, attackWindows)
            }


            if(attackWindows.first !== undefined && (attackWindows.first.end > 60 && attackWindows.first.end < 100 || attackWindows.first.end === Infinity)) {
                break
            }

            if(attackWindows.first === undefined || attackWindows.first.end < 60) {
                if(direction === -1) {
                    multiplier = 1+(multiplier-1)/1.5
                    direction = 1
                }

//                console.log("up: "+multiplier)
                attackerHashpower*=multiplier
            } else if(attackWindows.first.end > 100) {
                if(direction === 1) {
                    multiplier = 1+(multiplier-1)/1.5
                    direction = -1
                }
//                console.log("down: "+multiplier)
                attackerHashpower/=multiplier
            } else {
                throw new Error("Shouldn't happen")
            }
        }
    }

//}

function calcAndPrintAttackWindow(honestSpend, attackerSpend) {
    var calculator = attackCost(targetTime, noPotoBase, honestSpend, attackerSpend)
    var attackWindows = calculator.calcAttackWindows()

    printAttackWindow(honestSpend, attackerSpend, attackWindows)
}

function printAttackWindow(honestSpend, attackerSpend, attackWindows) {
    var line =
        honestSpend.hashPower+"\t"+precision2(honestSpend.activeStake)+'\t'
        +percent(attackerSpend.hashPower,honestSpend.hashPower)+"\t"+percent(attackerSpend.activeStake,honestSpend.activeStake)+'\t'
        +precision2(attackerSpend.hashPower+attackerSpend.activeStake)+'\t\t'

    if(attackWindows.first) {
        line += display(attackWindows.first.start)+"-"+display(attackWindows.first.end)
    } else {
        line += "none"
    }

    line += '\t\t'

    if(attackWindows.second) {
        line += display(attackWindows.second.start)+"-"+display(attackWindows.second.end)
    } else {
        line += "none"
    }

    console.log(line)
}

function precision2(x) {
    return Math.floor(10*x)/10
}
function display(x) {
    if(x === Infinity) return "Inf"
    else return precision2(x)
}
function percent(num,denom) {
    return precision2(100*num/denom)+'%'
}