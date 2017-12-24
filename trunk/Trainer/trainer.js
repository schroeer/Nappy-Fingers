// pscp -l schroeer -i ..\Gipfelkreuz\private_key.ppk -r basic_training.js images index.html test1.js trainer.html trainer.js daimlerstr.de:stella/www/trainer/

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

function Sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
}

Sound.prototype.play = function(){
    this.sound.play();
}
Sound.prototype.stop = function(){
    this.sound.pause();
}

var counter = (function () {
    var count, timer, paused, resolve, reject, steps, interval, cb;
    
    function step() {
        if (++count == steps) {
            window.clearInterval(timer);
            resolve();
        }
        else {
            cb(count);
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
    
    var utter_go = new SpeechSynthesisUtterance("Go!");
    utter_go.voice = voice;
    utter_go.lang = 'en-US';

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
                hold_pbar.value = step + 1;
            }
        );
        finish_sound.play();

        console.log(`rep ${rep+1}: break`);
        await counter.start(
            set.break,
            1000,
            function(step) {
                counter_div.textContent = set.break - step;
                break_pbar.value = step + 1;
            }
        );
    }
    
    console.log("done");
}

async function runTraining(training) {
    for (var i in training.sets) {
        var set = training.sets[i];
        if (set.pause < 15) {
            set.pause = 15;
        }
        var utter_set_desc = new SpeechSynthesisUtterance("Next exercise: " + set.description + " for " + set.hold + " seconds. " + "Left hand " + board.holds[set.left].name + ". Right hand " + board.holds[set.right].name + ". Repeat " + set.reps + " times.");
        utter_set_desc.voice = voice;
        utter_set_desc.lang = 'en-US';

        if (i > 0) {
            var utter_pause = new SpeechSynthesisUtterance("Pause for " + set.pause + " seconds.");
            utter_pause.voice = voice;
            utter_pause.lang = 'en-US';
            console.log(`Speaking "${utter_pause.text}"`);
            synth.speak(utter_pause);
        }

        set_title_div.textContent = "Pause";
        set_description_div.textContent = "Pause for " + set.pause + " seconds";
        
        overlay_left_img.src = "";
        overlay_right_img.src = "";

        pause_pbar.max = set.pause;
        pause_pbar.style.display = "inline-block";
        hold_pbar.style.display = "none";
        break_pbar.style.display = "none";

        console.log(`pause ${set.pause} seconds`);
        await counter.start(
            set.pause,
            1000,
            function(step) {
                counter_div.textContent = set.pause - step;
                pause_pbar.value = step + 1;
                
                if (set.pause - 15 == step) {
                    console.log(`Speaking "${utter_set_desc.text}"`);
                    synth.speak(utter_set_desc);

                    set_title_div.textContent = set.title;
                    set_description_div.textContent = set.description;
                    
                    overlay_left_img.src = "images/" + board.holds[set.left].image;
                    overlay_right_img.src = "images/" + board.holds[set.right].image;
                }
                if (set.pause - 5 <= step) {
                    tick_sound.play();
                }
            }
        );

        await runSet(set);
    }
}

var finish_sound = new Sound("images/bell.mp3");
var tick_sound = new Sound("images/countdown.mp3");

selectVoice();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = selectVoice;
}

runTraining(training1);