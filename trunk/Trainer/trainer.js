var counter_div = document.getElementById("counter");
var hold_pbar = document.getElementById("hold_pbar");
var break_pbar = document.getElementById("break_pbar");

var set_title_div = document.getElementById("set_title");
var set_description_div = document.getElementById("set_description");

var overlay_left_img = document.getElementById("overlay_left");
var overlay_right_img = document.getElementById("overlay_right");

var pause_button = document.getElementsByName("pause")[0];

var board = board1; // muss gesucht werden

var synth = window.speechSynthesis;
var voice;

var utter_go = new SpeechSynthesisUtterance("Go!");
//        utter_go.voice = voice;
utter_go.lang = 'en-US';

function selectVoice() {
    var voices = synth.getVoices();
    for (var i = 0; i < voices.length ; i++) {
        if (voices[i].lang.startsWith('en')) {
            voice = voices[i];
            break;
        }
    }
    if (voice) {
        console.log('selected voice: ' + voice.name);
    }
}

var counter = (function () {
    var count, timer, paused, resolve, reject, steps, interval, cb;
    
    function step() {
        cb(++count);
        if (count == steps) {
            window.clearInterval(timer);
            resolve();
        }
    }
    
    return {
        start: function(_steps, _interval, _cb) {
            steps = _steps;
            interval = _interval;
            cb = _cb;
            count = 0;
            paused = false;
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
            if (paused) {
                timer = window.setInterval(step, interval);
                paused = false;
            }
            else {
                window.clearInterval(timer);
                paused = true;
            }
        }
    }
})();

pause_button.addEventListener("click", counter.pause);

async function runSet(set) {
    
    var utter_desc = new SpeechSynthesisUtterance(set.description + " for " + set.hold + " seconds. " + "Left hand " + board.holds[set.left].name + ". Right hand " + board.holds[set.right].name + ". Repeat " + set.reps + " times.");
    //        utter_desc.voice = voice;
    utter_desc.lang = 'en-US';
    synth.speak(utter_desc);

    set_title_div.textContent = set.title;
    set_description_div.textContent = set.description;
    
    overlay_left_img.src = "images/" + board.holds[set.left].image;
    overlay_right_img.src = "images/" + board.holds[set.right].image;
    
    pause_pbar.style.display = "none";
    hold_pbar.style.display = "inline-block";
    break_pbar.style.display = "inline-block";
    
    hold_pbar.max = set.hold;
    hold_pbar.style.width = 100 * set.hold / (set.hold + set.break) + "%";

    break_pbar.max = set.break;
    break_pbar.style.width = 100 * set.break / (set.hold + set.break) + "%";
    
    for (var rep = 0; rep < set.reps; rep++) {
        hold_pbar.value = 0;
        break_pbar.value = 0;
        
        console.log(`rep ${rep+1}: hold`);
        synth.speak(utter_go);
        await counter.start(
            set.hold,
            1000,
            function(step) {
                counter_div.textContent = set.hold - step;
                hold_pbar.value = step;
            }
        );

        console.log(`rep ${rep+1}: break`);
        await counter.start(
            set.break,
            1000,
            function(step) {
                counter_div.textContent = set.break - step;
                break_pbar.value = step;
            }
        );
    }
    
    console.log("done");
}

async function runTraining(training) {
    for (var i in training.sets) {

        await runSet(training.sets[i]);
        
        if (training.sets[i].pause > 0) {
            pause_pbar.max = training.sets[i].pause;
            pause_pbar.style.display = "inline-block";
            hold_pbar.style.display = "none";
            break_pbar.style.display = "none";

            console.log(`pause ${training.sets[i].pause} seconds`);
            await counter.start(
                training.sets[i].pause,
                1000,
                function(step) {
                    counter_div.textContent = training.sets[i].pause - step;
                    pause_pbar.value = step;
                }
            );
        }
    }
}

selectVoice();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = selectVoice;
}

runTraining(training1);