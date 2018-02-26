
// targetTime - note: same target time for both PoS and PoW (so a block would happen twice in this amount of time)
// noPotoBase - the base used for upping the real (but not counted) difficulty the longer there is between PoS blocks
// honestSpend
    // hashPower - The amount of coins required to buy an amount of hashpower equal to the honest hashpower
    // activeStake - The amount of coins of honest active stake
// attackerSpend - Same as honestSpend except is the amount the attacker is spending on the attack for each
// minutesToCalc
var attackCost = module.exports = function(targetTime, noPotoBase, honestSpend, attackerSpend) {
    var resultObj = {}

    var lastCommonPosBlock = {
        type: 'pos',
        time: 0, height: 1,
        difficulty:1
    }
    var lastCommonPowBlock = {
        type: 'pow',
        time: targetTime/2, height: 0,
        difficulty:1, countedDifficulty: 1
    }
    resultObj.honest = [lastCommonPosBlock, lastCommonPowBlock]
    resultObj.attacker = [lastCommonPosBlock, lastCommonPowBlock]


    resultObj.calcAccumulatedDifficulty = function(blocks, upto) {
        if(upto === undefined) upto = blocks.length-1

        var powDifficulty=0, posDifficulty=0
        for(var n=0; n<=upto; n++) {
//        console.dir(blocks[n])
            if(blocks[n].type === 'pow') {
                powDifficulty += blocks[n].countedDifficulty
            } else {
                posDifficulty += blocks[n].difficulty
            }
        }

        return powDifficulty*posDifficulty
    }

    resultObj.createBlocks = function(minutesToCalc) {
        do {
            calcNextBlock(resultObj.honest, 1, 1)
        } while(resultObj.honest[resultObj.honest.length-1].time < minutesToCalc)
        do {
            calcNextBlock(resultObj.attacker, attackerSpend.hashPower/honestSpend.hashPower, attackerSpend.activeStake/honestSpend.activeStake)
        } while(resultObj.attacker[resultObj.attacker.length-1].time < minutesToCalc)
    }

    // type - 'honest' or 'attacker
    resultObj.calcNextBlock = function(type) {
        if(type === 'honest') {
            calcNextBlock(resultObj.honest, 1, 1)
        } else {
            calcNextBlock(resultObj.attacker, attackerSpend.hashPower/honestSpend.hashPower, attackerSpend.activeStake/honestSpend.activeStake)
        }
    }

    // returns an object that has the properties:
        // first - returns
            // {start:_, end:_} or
            // undefined (if there is no first window, in which case the attacker's chain is always longer)
        // second - returns
            // {start:_, end:_} or
            // undefined (if there is no second window, in which case the attacker's chain is always longer after the first window ends) or
            // {start:Infinity, end: Infinity} (if the point which the attacker starts winning is beyond the sight of this simulation)
    resultObj.calcAttackWindows = function() {
        var result = {first:{start:0}}

        var hn=0, an= 0, attackerWasLonger = 0, lastChangeTime = 0, changesFound=0, firstChangeTimeDiff, lastChangeTimeDiff
        var firstWindowFound = false, secondWindowStart
        while(true) {
            var attackerBlock = resultObj.attacker[an], honestBlock = resultObj.honest[hn]
            if(honestBlock.time < attackerBlock.time || lastTime == attackerBlock.time) {
                var time = honestBlock.time
            } else {
                var time = attackerBlock.time
            }

            var lastTime = time
            var timeInMinutes = time
            var honestAD = resultObj.calcAccumulatedDifficulty(resultObj.honest,hn)
            var attackerAD = resultObj.calcAccumulatedDifficulty(resultObj.attacker,an)

            if(attackerAD>honestAD) {
                var attackerIsLonger = 1
            } else if(attackerAD === honestAD) {
                var attackerIsLonger = 0
            } else {
                var attackerIsLonger = -1
            }

//            var line = timeInMinutes+'\t'+(hn+1)+'\t'+(an+1)+'\t\t'+honestAD+'\t'+attackerAD+'\t\t'+attackerIsLonger
            if(attackerWasLonger === 1 && attackerAD<honestAD
               || attackerWasLonger === -1 && attackerAD>honestAD
               || attackerWasLonger === 0 && attackerAD !== honestAD
            ) {
                changesFound++

                attackerWasLonger = attackerIsLonger
                lastChangeTimeDiff = timeInMinutes - lastChangeTime
                lastChangeTime = timeInMinutes

                if(changesFound === 1) {
                    firstChangeTimeDiff = timeInMinutes
                }
                if(firstWindowFound && secondWindowStart === undefined) {
                    secondWindowStart = timeInMinutes
//                    console.log("Second window start: "+secondWindowStart)
                }
            }

            if(!firstWindowFound && timeInMinutes - lastChangeTime  > firstChangeTimeDiff*10) {
                result.first.end = lastChangeTime
//                console.log("First Attack Window: 0-"+lastChangeTime)
                firstWindowFound = true
            }

//            if(secondWindowStart !== undefined) {
//                console.log(lastChangeTime-secondWindowStart)
//                console.log(timeInMinutes-secondWindowStart)
//            }

            if(changesFound <= 1 && timeInMinutes > 100) {
                return {}
            }

            if(secondWindowStart === undefined) {
                if(firstWindowFound) {
                    if(attackerWasLonger === 1 && timeInMinutes-result.first.end > result.first.end - result.first.start) {     // warning: these are just heuristics
                        result.first.end = Infinity
                        return result
                    } else if(attackerWasLonger !== 1 && timeInMinutes-result.first.end > (result.first.end - result.first.start)*1000) { // warning: these are just heuristics
                        result.second = {start:Infinity, end:Infinity}
                        return result
                    }
                }
            } else if(lastChangeTime-secondWindowStart > 0                                            // warning: this..
                        && timeInMinutes-secondWindowStart > (lastChangeTime-secondWindowStart)*10    // .. and this ..
                      || timeInMinutes-secondWindowStart > (result.first.end - result.first.start)*2  // .. and this are kind of shoot-from-the hip assumptions that seem to work
            ) {
                result.second = {start:secondWindowStart, end:lastChangeTime}
//                console.log("Second Attack Window: "+secondWindowStart+"-"+lastChangeTime)
                return result
            }

            if(resultObj.honest[hn+1] === undefined) {
                resultObj.calcNextBlock('honest')
            }
            if(resultObj.attacker[an+1] === undefined) {
                resultObj.calcNextBlock('attacker')
            }


            var nextHonestBlock = resultObj.honest[hn+1], nextAttackerBlock = resultObj.attacker[an+1]
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
            }
        }
    }

    return resultObj

    function calcNextBlock(curBlocks, powMultiplier, posMultiplier) {
        var nextPosBlock = findNextBlock(curBlocks, 'pos', posMultiplier)
        var nextPowBlock = findNextBlock(curBlocks, 'pow', powMultiplier)

        if(nextPosBlock.time < nextPowBlock.time) {
            curBlocks.push(nextPosBlock)
        } else {
            curBlocks.push(nextPowBlock)
        }
    }

    function findNextBlock(curBlocks, type, multiplier) {
        var lastBlock = curBlocks[curBlocks.length-1]
        var difficulty = findDifficulty(curBlocks, type)
        if(type === 'pow') {
            var countedDifficulty = difficulty
            var lastPosBlock = findLastBlockOfType(curBlocks,'pos')
            var blocksSincePos = lastBlock.height-lastPosBlock.height

            if(blocksSincePos >= 2) {
                difficulty *= Math.pow(noPotoBase, blocksSincePos-1)
            }
        }

        var lastTypedBlock = findLastBlockOfType(curBlocks,type)
        var minutesPerBlock = difficulty*targetTime/multiplier

        var result = {
            type: type,
            time: lastTypedBlock.time+minutesPerBlock, height: lastBlock.height+1,
            difficulty: difficulty
        }

//    console.log("minutesPerBlock: "+minutesPerBlock)
//    console.log("lastTypedBlock.time: "+lastTypedBlock.time)
//    console.dir(result)

        if(type === 'pow') {
            result.countedDifficulty = countedDifficulty
        }

        return result
    }

// finds the PoS difficulty (normalized to the initial honest spend being a difficulty of 1) for the last 2016 blocks (of any type)
    function findDifficulty(blocks, type) {
        if(blocks.length > 2016) {
            var first = blocks[blocks.length-2016]
            var extraTime = 0, extraBlocks = 0
        } else {
            var first = blocks[0]
            var extraBlocks = 2016-blocks.length
            var extraTime = targetTime*extraBlocks
        }

        var latest = blocks[blocks.length-1]
        var timeDif = latest.time-first.time + extraTime
        var numberOfTypedBlocks = blocks.reduce(function(acc,x) {
            if(x.type === type)
                return acc+1
            else
                return acc
        },extraBlocks)

        // difficulty = newTargetTime/targetTime
        // newTargetTime = targetTime*targetTime/actualTimePerBlock
        // actualTimePerBlock = timeDif/numberOfPosBlocks
        // newTargetTime = numberOfTypedBlocks*targetTime^2/timeDif
        // difficulty = targetTime*numberOfTypedBlocks/timeDif
        return targetTime*numberOfTypedBlocks/timeDif
    }
    function findLastBlockOfType(blocks, type) {
        for(var n=blocks.length-1; n>=0; n--) {
            if(blocks[n].type === type)
                return blocks[n]
        }
    }
}

// calculates the lowest attack cost it found (note that this won't find the very lowest cost, and so will be an overestimate)
// options:
    // targetTime
    // noPotoBase
    // honestStake - The cost of the honest active stake
    // increment - By what multiple to increment attacker stake when searching for the lowest cost attack
    // targetWindow - {start:_, end:_}
module.exports.calcMinAttackCost = function(options) {
    var honestSpend = {hashPower: 1, activeStake: options.honestStake}
    var lowestCostInfo = {cost: Infinity}
    for(var attackerStake=.4*options.honestStake; attackerStake > .1*options.honestStake; attackerStake/=options.increment) {
        var attackerHashpower= 1, multiplier = 2, direction = 1
        while(true) {
            var attackerSpend = {hashPower: attackerHashpower, activeStake: attackerStake}

            var calculator = attackCost(options.targetTime,options.noPotoBase, honestSpend, attackerSpend)
            var attackWindows = calculator.calcAttackWindows()

            if(attackWindows.first !== undefined && attackWindows.first.end > options.targetWindow.low && attackWindows.first.end < options.targetWindow.high) {
                var cost = attackerSpend.hashPower+attackerSpend.activeStake
                if(lowestCostInfo.cost > cost) {
                    lowestCostInfo.cost = cost
                    lowestCostInfo.attackerSpend = {activeStake:attackerStake, hashPower: attackerHashpower}
                    lowestCostInfo.windows = attackWindows
                }

                break;
            }

            if(attackerHashpower < .000001)
                break; // no solution found for this amount of attacker stake

            if(attackWindows.first === undefined || attackWindows.first.end < options.targetWindow.low) {
                if(direction === -1) {
                    multiplier = 1+(multiplier-1)/1.5
                    direction = 1
                }

//                console.log("up: "+multiplier)
                attackerHashpower*=multiplier
            } else if(attackWindows.first.end > options.targetWindow.high) {
                if(direction === 1) {
                    multiplier = 1+(multiplier-1)/1.5
                    direction = -1
                }
//                console.log("down: "+multiplier)
                attackerHashpower/=multiplier
            } else {
                console.dir(attackWindows)
                throw new Error("Shouldn't happen")
            }
        }
    }

    return lowestCostInfo
}