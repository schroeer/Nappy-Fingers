var makeCounter = function (steps, interval, cb) {
    var count, timer, resolve, reject;
    
    function step() {
        cb(++count);
        if (count == steps) {
            window.clearInterval(timer);
            resolve();
        }
    }
    
    return {
        start: function() {
            count = 0;
            return new Promise(function(_resolve, _reject) {
                resolve = _resolve;
                reject = _reject;
                timer = window.setInterval(step, interval);
            });
        },
        stop: function() {
            window.clearInterval(timer);
            reject("counter aborted");
        },
        pause: function() {
            window.clearInterval(timer);
        },
        resume: function() {
            timer = window.setInterval(step, interval);
        }
    }
}

var counter_div = document.getElementById("counter");
var hold_pbar = document.getElementById("hold_pbar");
var break_pbar = document.getElementById("break_pbar");

function doSet(set) {
    var hold_counter = makeCounter(
        set.hold,
        1000,
        function(step) {
            counter_div.textContent = set.hold - step;
            hold_pbar.value = step;
        }
    );
    var break_counter = makeCounter(
        set.break,
        1000,
        function(step) {
            counter_div.textContent = set.break - step;
            break_pbar.value = step;
        }
    );
    
    var sequence = Promise.resolve();
    
    for (var i = 0; i < set.reps; i++) {
        let rep = i;
        sequence = sequence.then(function() {
            console.log(`rep ${rep}: hold`);
            return hold_counter.start();
        });
        sequence = sequence.then(function() {
            console.log(`rep ${rep}: break`);
            return break_counter.start();
        });
    }
    
    return sequence
    .then(function() {
        console.log("done");
    })
    .catch(function(err) {
        console.error(err);
    });
}