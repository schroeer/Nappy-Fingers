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
                cb(0);
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


async function runSet(set) {
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
    
    hold_pbar.max = set.hold;
    hold_pbar.style.width = 100 * set.hold / (set.hold + set.break) + "%";

    break_pbar.max = set.break;
    break_pbar.style.width = 100 * set.break / (set.hold + set.break) + "%";
    
    for (var rep = 0; rep < set.reps; rep++) {
        hold_pbar.value = 0;
        break_pbar.value = 0;
        
        console.log(`rep ${rep+1}: hold`);
        await hold_counter.start();

        console.log(`rep ${rep+1}: break`);
        await break_counter.start();
    }
    
    console.log("done");

//    console.error(err);
}

async function runTraining(training) {
    for (var i in training.sets) {

        await runSet(training.sets[i]);
        
        if (training.sets[i].pause > 0) {
            pause_pbar.max = training.sets[i].pause;
            var pause_counter = makeCounter(
                training.sets[i].pause,
                1000,
                function(step) {
                    counter_div.textContent = training.sets[i].pause - step;
                    pause_pbar.value = step;
                }
            );
            console.log(`pause ${training.sets[i].pause} seconds`);
            await pause_counter.start();
        }
    }
}

runTraining(training1);