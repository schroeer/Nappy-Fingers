// pscp -l schroeer -i ..\Gipfelkreuz\private_key.ppk -r basic_training.js images index.html test1.js trainer.html trainer.js daimlerstr.de:stella/www/trainer/

var counter_div = document.getElementById("counter");
var hold_pbar = document.getElementById("hold_pbar");
var break_pbar = document.getElementById("break_pbar");

var set_title_div = document.getElementById("set_title");
var set_description_div = document.getElementById("set_description");

var pause_button = document.getElementsByName("pause")[0];

var board = boards[0]; // muss gesucht werden

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
        
        document.querySelectorAll("img.overlay_img").forEach(function(element) {
            element.src = "";
        });

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
                    
                    document.querySelector("img.overlay_left").src = "images/" + board.holds[set.left].image;
                    document.querySelector("img.overlay_right").src = "images/" + board.holds[set.right].image;
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

function getBoard(board_id) {
    for (var board of boards) {
        if (board.id == board_id) {
            return board;
        }
    }
}    

function showTrainingDetails(board_id, training_num) {
    var training_details = document.getElementById('training_details');
    while (training_details.firstChild) {
        training_details.removeChild(training_details.firstChild);
    }
    var training = trainings[training_num];

    var h2 = document.createElement('h2');
    h2.setAttribute('class', 'training_title');
    var content = document.createTextNode(training.title);
    h2.appendChild(content);
    training_details.appendChild(h2);

    var p = document.createElement('p');
    p.setAttribute('class', 'training_description');
    content = document.createTextNode(training.description);
    p.appendChild(content);
    training_details.appendChild(p);
    
    var board = getBoard(board_id);
    
    for (var set of training.sets) {
        var div = document.createElement('div');
        div.setAttribute('class', 'training_set');
        training_details.appendChild(div);
        
        var h3 = document.createElement('h3');
        h3.setAttribute('class', 'set_title');
        var content = document.createTextNode(set.title);
        h3.appendChild(content);
        div.appendChild(h3);

        var outer = document.createElement('div');
        outer.setAttribute('class', 'board_small_container');
        var img1 = document.createElement('img');
        img1.setAttribute('class', 'board_img');
        img1.setAttribute('src', "images/" + board.image);
        img1.setAttribute('alt', "");
        outer.appendChild(img1);
        var img2 = document.createElement('img');
        img2.setAttribute('class', 'overlay_img overlay_left');
        img2.setAttribute('src', "images/" + board.holds[set.left].image);
        img2.setAttribute('alt', "");
        outer.appendChild(img2);
        var img3 = document.createElement('img');
        img3.setAttribute('class', 'overlay_img overlay_right');
        img3.setAttribute('src', "images/" + board.holds[set.right].image);
        img3.setAttribute('alt', "");
        outer.appendChild(img3);
        div.appendChild(outer);

        var p = document.createElement('p');
        p.setAttribute('class', 'set_description');
        content = document.createTextNode(set.description);
        p.appendChild(content);
        div.appendChild(p);
        
        p = document.createElement('p');
        p.setAttribute('class', 'set_details');
        content = document.createTextNode('Hold for ' + set.hold + " seconds. Interrupt for " + set.break + " seconds. Repeat " + set.reps + " times.");
        p.appendChild(content);
        div.appendChild(p);
    }
}

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
    console.log("selected: " + selected_board);
    fillTrainingSelect(selected_board);
}
training_select.onchange = function(event) {
    var selected_board = board_select.options[board_select.selectedIndex].value;
    var selected_training = training_select.options[training_select.selectedIndex].value;
    console.log("selected: " + selected_training);
    showTrainingDetails(selected_board, selected_training);
}
fillTrainingSelect(board_select.options[board_select.selectedIndex].value);


//runTraining(trainings[1]);