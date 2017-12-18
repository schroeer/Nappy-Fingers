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

function Countdown(steps, interval, start_func, inter_func, after_func) {
    this.steps      = steps;
    this.interval   = interval;
    this.start_func = start_func;
    this.inter_func = inter_func;
    this.after_func = after_func;
}

Countdown.prototype.start = function() {
    var timer = window.setInterval(step, this.interval);
    var step = 0;
    this.start_func();
    
    function step() {
        this.inter_func(++step);
        if (step == this.steps) {
            window.clearInterval(timer);
            after_func();
        }
    }
}

var test_set = {
    "title": "Hang on straight arms",
    "left":  1,
    "right": 1,
    "hold":  7,
    "break": 3,
    "reps":  5,
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

var cd = new Countdown(
    3,
    500,
    function() {
        console.log("starte countdown");
    },
    function(step) {
        console.log("step " + step);
    },
    finish
);

cd.start();