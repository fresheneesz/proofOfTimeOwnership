
exports.findMinimum = function (range, step, diffPercentThreshold, cb) {
    var troughs = findTroughs(range, step, cb)

    var min = Infinity, minInput
    troughs.forEach(function(trough) {
        var localMin = findLocalMinimum(trough,diffPercentThreshold, cb)
        if(localMin.output < min) {
            min = localMin.output
            minInput = localMin.input
        }
    })

    return minInput
}

function findLocalMinimum(range, diffThreshold, cb) {
    var bounds = {
        lower:{input:range.start, output: cb(range.start)},
        upper: {input:range.end, output: cb(range.end)}
    }

    var dif = (range.end-range.start)
    var firstCandidateInput = range.start+dif/3, secondCandidateInput = range.start+dif*2/3
    var candidates = {
        lower: {input: firstCandidateInput, output:cb(firstCandidateInput)},
        upper: {input: secondCandidateInput, output:cb(secondCandidateInput)}
    }

    var lastVal = Infinity
    while(true) {
        if(candidates.lower.output < candidates.upper.output) {
            if(bounds.lower.output < candidates.lower.output) {
                bounds.upper = candidates.upper
                candidates.upper = candidates.lower
                candidates.lower = newCandidate(bounds.lower.input, candidates.lower.input)
            } else {
                bounds.upper = candidates.upper
                candidates.upper = newCandidate(candidates.lower.input, bounds.upper.input)
            }

            var curValue = candidates.upper.output
        } else {
            if(candidates.upper.output > bounds.upper.output) {
                bounds.lower = candidates.lower
                candidates.lower = candidates.upper
                candidates.upper = newCandidate(candidates.upper.input, bounds.upper.input)
            } else {
                bounds.lower = candidates.lower
                candidates.lower = newCandidate(bounds.lower.input, candidates.upper.input)
            }

            var curValue = candidates.lower.output
        }

        // if the changes its finding are low enough for our purposes
        if(Math.abs(candidates.lower.output - candidates.upper.output) < diffThreshold || candidates.lower.output === candidates.upper.output) {
            var result = candidates.lower
            if(result.output > candidates.upper.output)
                result = candidates.upper
            if(result.output > bounds.upper.output)
                result = bounds.upper
            if(result.output > bounds.lower.output)
                result = bounds.lower

            return result
        }

        lastVal = curValue
    }

    // lowerInput - the input that's lesser
    function newCandidate(lowerInput, higherInput) {
        var dif = higherInput-lowerInput
        var nextCandidateInput = lowerInput + dif/2
        return {input: nextCandidateInput, output:cb(nextCandidateInput)}
    }
}

// finds troughs to be used in finding local mininums
function findTroughs(range, step, fn) {
    var troughRanges = [], lastValue, decreasing = true
    for(var x=range[0]; x<=range[1]; x+=step) {
        var curValue = fn(x)
        if(lastValue !== undefined) {
            if(decreasing && curValue > lastValue)
                troughRanges.push({start:Math.max(range[0],x-step),end:Math.min(range[1],x+step)})

            decreasing = lastValue > curValue
        }

        lastValue = curValue
    }

    if(decreasing) {
        troughRanges.push({start:range[1]-step,end:range[1]})
    }

    if(troughRanges.length === 0) {
        var firstValue = fn(range[0])
        if(lastValue < firstValue) {
            troughRanges.push({start:range[0],end:Math.min(range[0]+step,range[1])})
        } else if(lastValue === firstValue) {
            troughRanges.push({start:range[0],end:range[1]})
        } else {
            troughRanges.push({start:Math.max(range[0],range[1]-step),end:range[1]})
        }

    }

    return troughRanges
}

exports.testFindTroughs = function () {
    var tests = [
        {name: "y= 1", range: [0,1], step:.1, expect: [{start: 0, end:1}], fn: function(x) {
            return 1
        }},
        {name: "y= x", range: [0,1], step:.1, expect: [{start:0, end:.2}], fn: function(x) {
            return x
        }},
        {name: "y= x^2", range: [-1,1], step:.1, expect: [{start: -.5, end:.5}], fn: function(x) {
            return Math.pow(x,2)
        }},
        {name: "y= -x^2", range: [-1,1], step:.1, expect: [{start:-1, end:-.5},{start:.5, end:1}], fn: function(x) {
            return -Math.pow(x,2)
        }},
        {name: "y= (x)^3-2x", range: [-2,2], step:.1, expect: [{start:-2, end:-1.5},{start:.5, end:1.1}], fn: function(x) {
            return Math.pow(x,3)-2*x
        }},
        {name: "y= sin(x)", range: [0,18], step:.1, expect: [
            {start:0, end:1},
            {start:4, end:5},
            {start:10.5, end:11.5},
            {start:17, end:18}
        ], fn: function(x) {
            return Math.sin(x)
        }}
    ]

    tests.forEach(function(test, testN) {
        var troughs = findTroughs(test.range, test.step, test.fn)
        console.log(test.name)
        console.log('\t'+(troughs.length === test.expect.length)+" - expected "+test.expect.length+" got "+troughs.length)
        troughs.forEach(function(trough, n) {
            console.log('\t'+(test.expect[n].start <= trough.start && trough.end <= test.expect[n].end)
                        +" - expected "+test.expect[n].start+':'+test.expect[n].end
                          +" got "     +precision2(trough.start)+':'+precision2(trough.end)
            )
        })
    })
}


exports.testFindMinimum = function () {
    var tests = [
        {name: "y= 1", range: [0,1], step:.1, threshold:.001, expect: {start: 0, end:1} , fn: function(x) {
            return 1
        }},
        {name: "y= x", range: [0,1], step:.1, threshold:.001, expect: {start:0, end:.1}, fn: function(x) {
            return x
        }},
        {name: "y= x^2", range: [-1,1], step:.1, threshold:.001, expect: {start: -.1, end:.1}, fn: function(x) {
            return Math.pow(x,2)
        }},
        {name: "y= -x^2", range: [-1,2], step:.1, threshold:.001, expect: {start:1.9, end:2}, fn: function(x) {
            return -Math.pow(x,2)
        }},
        {name: "y= (x)^3-2x", range: [-2,1], step:.1, threshold:.001, expect: {start:-2, end:-1.9}, fn: function(x) {
            return Math.pow(x,3)-2*x
        }},
        {name: "y= sin(x)", range: [0,18], step:.1, threshold:.001, expect: {start:4, end:5}, fn: function(x) {
            return Math.sin(x)
        }}
    ]

    tests.forEach(function(test, testN) {
        var min = findMinimum(test.range, test.step, test.threshold, test.fn)
        console.log(test.name+': \t'+(test.expect.start <= min && min <= test.expect.end)
                    +" - expected "+test.expect.start+':'+test.expect.end
                      +" got "     +precision(min, 4)
        )
    })
}

exports.testFindLocalMinimum = function() {
    var tests = [
        {name: "y= 1", range: {start:0,end:1}, threshold:.001, expect: {start: 0, end:1}, fn: function(x) {
            return 1
        }},
        {name: "y= x", range: {start:0,end:1}, threshold:.001, expect: {start:0, end:.01}, fn: function(x) {
            return x
        }},
        {name: "y= x^2", range: {start:-1,end:1}, threshold:.001, expect: {start: -.01, end:.01}, fn: function(x) {
            return Math.pow(x,2)
        }},
        {name: "y= -x^2", range: {start:-1,end:.5}, threshold:.001, expect: {start:-1, end:-.1}, fn: function(x) {
            return -Math.pow(x,2)
        }},
        {name: "y= -x^2", range: {start: -.5,end:1}, threshold:.001, expect: {start:.9, end:1}, fn: function(x) {
            return -Math.pow(x,2)
        }}
    ]

    tests.forEach(function(test, testN) {
        var min = findLocalMinimum(test.range,test.threshold, test.fn)
        console.log(test.name+': \t'+(test.expect.start <= min.input && min.input <= test.expect.end)
                    +" - expected "+test.expect.start+':'+test.expect.end
                      +" got "     +precision(min.input, 4)
        )
    })
}



