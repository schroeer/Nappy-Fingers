function Set(parms) {
    this.title = parms.title;
    this.left  = parms.left;
    this.right = parms.right;
    this.hold  = parms.hold;
    this.break = parms.break;
    this.reps  = parms.reps;

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

var test_set = {
    "title": "Hang on straight arms",
    "left":  1,
    "right": 1,
    "hold":  7,
    "break": 3,
    "reps":  5,
};

var ss = new Set(test_set);

