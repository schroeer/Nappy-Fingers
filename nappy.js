// pscp -l schroeer -i ..\Gipfelkreuz\private_key.ppk -r basic_training.js sound.js images index.html trainer.js daimlerstr.de:stella/www/trainer/

"use strict";

var VOICE;

var COUNTER = (function () {
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
        start: function start(_steps, _interval, _cb) {
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
        stop: function stop() {
            window.clearInterval(timer);
            reject("counter aborted");
        },
        pause: function pause() {
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

function selectVoice() {
    var voices = speechSynthesis.getVoices();
    for (var i = 0; i < voices.length ; i++) {
        if (voices[i].lang.startsWith('en')) {
            VOICE = voices[i];
            break;
        }
    }
    if (VOICE) {
        console.log('selected VOICE: ' + VOICE.name);
    }
}

function ticSound() {
    soundEffect(
        400,       //frequency
        0.02,         //attack
        0.02,          //decay
        "sine",       //waveform
        10,            //volume
        0,          //pan
        0,            //wait before playing
        1,          //pitch bend amount
        false,         //reverse
        0,          //random pitch range
        0,            //dissonance
        undefined,    //echo: [delay, feedback, filter]
        undefined     //reverb: [duration, decay, reverse?]
    );
}

function completedSound() {
    //D
    soundEffect(587.33, 0, 0.2, "square", 1, 0, 0);
    //A
    soundEffect(880, 0, 0.2, "square", 1, 0, 0.1);
    //High D
    soundEffect(1174.66, 0, 0.3, "square", 1, 0, 0.2);
}

async function runTraining(board_id, training) {
    var board = getBoard(board_id);

    var set_title_div = document.getElementById("set_title");
    var set_description_div = document.getElementById("set_description");
    var counter_div = document.getElementById("counter");
    var hold_pbar = document.getElementById("hold_pbar");
    var break_pbar = document.getElementById("break_pbar");

    for (var i in training.sets) {
        var set = training.sets[i];
        if (set.pause < 15) {
            set.pause = 15;
        }
        var utter_set_desc = new SpeechSynthesisUtterance("Next exercise: " + set.description + " for " + set.hold + " seconds. " + "Left hand " + board.holds[set.left].name + ". Right hand " + board.holds[set.right].name + ". Repeat " + set.reps + " times.");
        utter_set_desc.VOICE = VOICE;
        utter_set_desc.lang = 'en-US';

        if (i > 0) {
            var utter_pause = new SpeechSynthesisUtterance("Pause for " + set.pause + " seconds.");
            utter_pause.VOICE = VOICE;
            utter_pause.lang = 'en-US';
            console.log(`Speaking "${utter_pause.text}"`);
            speechSynthesis.speak(utter_pause);
        }

        set_title_div.textContent = "Pause";
        set_description_div.textContent = "Pause for " + set.pause + " seconds";
        
        document.querySelectorAll("#run_content .overlay_img").forEach(function(element) {
            element.src = "";
        });

        pause_pbar.max = set.pause;
        pause_pbar.style.display = "inline-block";
        hold_pbar.style.display = "none";
        break_pbar.style.display = "none";

        console.log(`pause ${set.pause} seconds`);
        await COUNTER.start(
            set.pause,
            1000,
            async function pauseCountdownStep(step) {
                counter_div.textContent = set.pause - step;
                pause_pbar.value = step + 1;
                
                if (set.pause - 15 == step) {
                    console.log(`Speaking "${utter_set_desc.text}"`);
                    speechSynthesis.speak(utter_set_desc);

                    set_title_div.textContent = set.title;
                    set_description_div.textContent = set.description;
                    
                    document.querySelector("#run_content .overlay_left").src = "images/" + board.holds[set.left].image;
                    document.querySelector("#run_content .overlay_right").src = "images/" + board.holds[set.right].image;
                }
                if (set.pause - 5 <= step) {
                    await ticSound();
                }
            }
        );

        await runSet(set);
    }
    console.log("training complete");
   
    async function runSet(set) {
        
        var utter_go = new SpeechSynthesisUtterance("Go!");
        utter_go.VOICE = VOICE;
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
            speechSynthesis.speak(utter_go);
            await COUNTER.start(
                set.hold,
                1000,
                function hangCountdownStep(step) {
                    counter_div.textContent = set.hold - step;
                    hold_pbar.value = step + 1;
                }
            );
            await completedSound();

            console.log(`rep ${rep+1}: break`);
            await COUNTER.start(
                set.break,
                1000,
                function breakCountdownStep(step) {
                    counter_div.textContent = set.break - step;
                    break_pbar.value = step + 1;
                }
            );
        }
        console.log("set complete");
    }
}

function getBoard(board_id) {
    for (var board of boards) {
        if (board.id == board_id) {
            return board;
        }
    }
}    

function initMenu() {
    document.getElementById("menu_content").style.display = "block";
    document.getElementById("run_content").style.display = "none";
    window.location.hash = "";
}

function initRun() {
    document.getElementById("menu_content").style.display = "none";
    document.getElementById("run_content").style.display = "block";
    window.location.hash = "run";
}

function initOnce() {
    selectVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = selectVoice;
    }

    var pause_button = document.getElementsByName("pause")[0];
    pause_button.addEventListener("click", COUNTER.pause);

    var stop_button = document.getElementsByName("stop")[0];
    stop_button.addEventListener("click", COUNTER.stop);

    var start_button = document.getElementsByName('start')[0];
    start_button.addEventListener("click", async function startTraining() {
        initRun();
        var selected_board = board_select.options[board_select.selectedIndex].value;
        var selected_training = training_select.options[training_select.selectedIndex].value;
        try {
            await runTraining(selected_board, trainings[selected_training]);
        }
        catch (err) {
            console.log("Training aborted");
        }
        finally {
            initMenu();
        }
    });

    var board_select = document.getElementsByName('board_select')[0];
    var training_select = document.getElementsByName('training_select')[0];
    var first = true;
    for (var board of boards) {
        var opt = document.createElement('option');
        opt.setAttribute('value', board.id);
        if (first) {
            opt.setAttribute('selected', 'selected');
            first = false;
        }
        var content = document.createTextNode(board.name);
        opt.appendChild(content);
        board_select.appendChild(opt);
    }
    
    board_select.onchange = function(event) {
        var selected_board = board_select.options[board_select.selectedIndex].value;
        fillTrainingSelect(selected_board);
    }
    
    training_select.onchange = function(event) {
        var selected_board = board_select.options[board_select.selectedIndex].value;
        var selected_training = training_select.options[training_select.selectedIndex].value;
        showTrainingDetails(selected_board, selected_training);
    }
    
    fillTrainingSelect(board_select.options[board_select.selectedIndex].value);

    function fillTrainingSelect(board_id) {
        var training_select = document.getElementsByName('training_select')[0];
        while (training_select.firstChild) {
            training_select.removeChild(training_select.firstChild);
        }
        var first = true;
        for (var training_num in trainings) {
            var training = trainings[training_num];
            if (training.board == board_id) {
                var opt = document.createElement('option');
                opt.setAttribute('value', training_num);
                if (first) {
                    opt.setAttribute('selected', 'selected');
                    showTrainingDetails(board_id, training_num);
                    first = false;
                }
                var content = document.createTextNode(training.title);
                opt.appendChild(content);
                training_select.appendChild(opt);
            }
        }
    }

    function showTrainingDetails(board_id, training_num) {
        var board = getBoard(board_id);
        var training = trainings[training_num];

        var training_details = document.getElementById('training_details');
        while (training_details.firstChild) {
            training_details.removeChild(training_details.firstChild);
        }

        addElement(training_details, 'h2', training.title, {'class': 'training_title'});
        addElement(training_details, 'p', training.description, {'class': 'training_description'});
        var times = calculateTimes(training);
        addElement(training_details, 'p', "Total time: " + Math.floor(times[3] / 60) + ":" + times[3] % 60 + " min. Hang time: " + Math.floor(times[0] / 60) + ":" + times[0] % 60 + " min.", {'class': 'training_description'});
        
        for (var set_num in training.sets) {
            var set = training.sets[set_num];
            
            var div = addElement(training_details, 'div', undefined, {'class': 'training_set'});
            
            addElement(div, 'h3', (Number(set_num) + 1) + ". " + set.title, {'class': 'set_title'});

            var outer = addElement(div, 'div', undefined, {'class': 'board_small_container'});

            addElement(outer, 'img', undefined, {'class': 'board_img', 'src': "images/" + board.image, 'alt': ""});
            addElement(outer, 'img', undefined, {'class': 'overlay_img overlay_left', 'src': "images/" + board.holds[set.left].image, 'alt': ""});
            addElement(outer, 'img', undefined, {'class': 'overlay_img overlay_right', 'src': "images/" + board.holds[set.right].image, 'alt': ""});

            addElement(div, 'p', set.description, {'class': 'set_description'});
            addElement(div, 'p', 'Hold for ' + set.hold + " seconds. Interrupt for " + set.break + " seconds. Repeat " + set.reps + " times.", {'class': 'set_details'});
        }
        
        function addElement(node, type, text, atts) {
            var el = document.createElement(type);
            if (text) {
                var tn = document.createTextNode(text);
                el.appendChild(tn);
            }
            for (var name in atts) {
                el.setAttribute(name, atts[name]);
            }
            node.appendChild(el);
            return el;
        }
        
        function calculateTimes(training) {
            var pause = 0, inter = 0, hold = 0;
            for (var set of training.sets) {
                pause += set.pause;
                inter += set.reps * set.break;
                hold += set.reps * set.hold;
            }
            return [hold, inter, pause, hold + inter + pause];
        }
    }
}

initOnce();
initMenu();