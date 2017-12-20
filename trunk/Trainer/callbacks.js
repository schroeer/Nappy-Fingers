function Set(parms) {
    this.title = parms.title;
    this.left  = parms.left;
    this.right = parms.right;
    this.hold  = parms.hold;
    this.break = parms.break;
    this.reps  = parms.reps;
    
    this.r     = 0;

    this.next  = (function() {
        var round = 0;
        return function() {
            if (round < this.reps) {
                return round++;
            }
            else {
                return undefined;
            }
        }
    })();
}

Set.prototype.duration = function() {
    return this.hold * this.reps + this.break * (this.reps - 1);
};

Set.prototype.hang_time = function() {
    return this.hold * this.reps;
};

Set.prototype.finished = function() {
    return this.r >= this.reps;
};

Set.prototype.next_round = function() {
    this.r++;
    return this;
};

var ss = new Set(test_set);

function doRep(set, next) {
    if (set.finished()) {
        next();
    }
    else {
        console.log(`doing repetition ${set.r}`);
        var timeoutID = window.setTimeout(
            function() {
                console.log(`done with repetition ${set.r}`);
                doRep(set.next_round(), next);
            },
            500
        );
    }
}

function finish() {
    console.log("done");
}

//doRep(ss, finish);


var makeCounter = function (steps, interval, inter_func, after_func) {
    var count, timer;
    
    function step() {
        inter_func(++count);
        if (count == steps) {
            window.clearInterval(timer);
            after_func();
        }
    }
    
    return {
        start: function() {
            count = 0;
            timer = window.setInterval(step, interval);
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
var pbar = document.getElementById("pbar");

pbar.max = 8;
pbar.value = 0;

var cd = makeCounter(
    8,
    500,
    function(step) {
        console.log("step " + step);
        counter_div.textContent = step;
        pbar.value = step;
    },
    finish
);

cd.start();


