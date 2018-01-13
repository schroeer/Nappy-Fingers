// pscp -l schroeer -i ..\Gipfelkreuz\private_key.ppk -r *.js *.html *.css images daimlerstr.de:stella/www/trainer/

"use strict";

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

async function runTraining(board, training) {
    var set_title_div = document.getElementById("set_title");
    var set_description_div = document.getElementById("set_description");
    var time_counter = document.getElementById("time_counter");
    var hold_pbar = document.getElementById("hold_pbar");
    var break_pbar = document.getElementById("break_pbar");

    for (var i in training.sets) {
        var set = training.sets[i];
        if (set.pause < 15) {
            set.pause = 15;
        }

        var utter_set_desc = new SpeechSynthesisUtterance();
        utter_set_desc.text = `Next exercise: ${set.description} for ${set.hold} seconds. Left hand ${board.left_holds[set.left].name}. Right hand ${board.right_holds[set.right].name}. Repeat ${set.reps} ${((set.reps > 1) ? "times" : "time")}.`;
        utter_set_desc.lang = 'en-US';

        if (i > 0) { // Vor dem ersten Satz keine Ansage der Pause
            var utter_pause = new SpeechSynthesisUtterance();
            utter_pause.text = makePauseString(set.pause);
            utter_pause.lang = 'en-US';
            console.log(`Speaking "${utter_pause.text}"`);
            speechSynthesis.speak(utter_pause);

            set_title_div.textContent = "Pause";
            set_description_div.textContent = `Pause for ${Math.floor(set.pause / 60)}:${(set.pause % 60).toString().padStart(2, "0")} min.`;
        }
        else {
            set_title_div.textContent = "Get ready";
            set_description_div.textContent = "";
        }
        
        document.querySelectorAll("#run_content .overlay_img").forEach(function(element) {
            element.src = "";
        });

        pause_pbar.max = set.pause;
        pause_pbar.style.display = "inline-block";
        hold_pbar.style.display = "none";
        break_pbar.style.display = "none";
        document.getElementById("set_counter").textContent = Number(i) + 1 + "/" + training.sets.length;
        document.getElementById("repeat_counter").textContent = "   ";

        console.log(`pause ${set.pause} seconds`);
        await COUNTER.start(
            set.pause,
            1000,
            async function pauseCountdownStep(step) {
                time_counter.textContent = set.pause - step;
                pause_pbar.value = step + 1;
                
                if (set.pause - step == 15) {
                    console.log(`Speaking "${utter_set_desc.text}"`);
                    speechSynthesis.speak(utter_set_desc);

                    set_title_div.textContent = set.title;
                    set_description_div.textContent = set.description;
                    
                    document.querySelector("#run_content .overlay_left").src = "images/" + board.left_holds[set.left].image;
                    document.querySelector("#run_content .overlay_right").src = "images/" + board.right_holds[set.right].image;
                }
                if (step > 0 && ((set.pause - step) % 30 == 0)) {
                    var utter_pause = new SpeechSynthesisUtterance();
                    utter_pause.text = makePauseStringShort(set.pause - step);
                    utter_pause.lang = 'en-US';
                    console.log(`Speaking "${utter_pause.text}"`);
                    speechSynthesis.speak(utter_pause);
                }
                if (set.pause - step <= 5) {
                    await ticSound();
                }
            }
        );

        await runSet(set);
    }
    console.log("training complete");
   
    async function runSet(set) {
        
        var utter_go = new SpeechSynthesisUtterance();
        utter_go.text = "Go!";
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
            document.getElementById("repeat_counter").textContent = Number(rep) + 1 + "/" + set.reps;
            
            console.log(`rep ${rep+1}: hold`);
            speechSynthesis.speak(utter_go);
            await COUNTER.start(
                set.hold,
                1000,
                function hangCountdownStep(step) {
                    time_counter.textContent = set.hold - step;
                    hold_pbar.value = step + 1;
                }
            );
            await completedSound();

            console.log(`rep ${rep+1}: break`);
            await COUNTER.start(
                set.break,
                1000,
                async function breakCountdownStep(step) {
                    time_counter.textContent = set.break - step;
                    break_pbar.value = step + 1;

                    if (set.break - step <= 3) {
                        await ticSound();
                    }
                }
            );
        }
        console.log("set complete");
    }
    
    function makePauseString(pause) {
        var minutes = Math.floor(pause / 60);
        var seconds = pause % 60;
        var pause_str = "Pause for ";
        if (minutes != 0) {
            pause_str += minutes + ((minutes > 1) ? " minutes" : " minute");
            if (seconds != 0) {
                pause_str += " and ";
            }
        }
        if (seconds != 0) {
            pause_str += seconds + ((seconds > 1) ? " seconds" : " second");
        }
        return pause_str + ".";
    }

    function makePauseStringShort(pause) {
        var minutes = Math.floor(pause / 60);
        var seconds = pause % 60;
        var pause_str = "";
        if (minutes != 0) {
            pause_str += minutes + ((minutes > 1) ? " minutes" : " minute");
            if (seconds != 0) {
                pause_str += " ";
            }
        }
        if (seconds != 0) {
            pause_str += seconds;
            if (minutes == 0) {
                pause_str += (seconds > 1) ? " seconds" : " second";
            }
        }
        return pause_str + ".";
    }
}

function updateTraining(event) {
    trainings[this.dataset.training][this.dataset.field] = this.value;
    console.log(`Setting training[${this.dataset.training}].${this.dataset.field} = "${this.value}".`);
}

function showTrainingEdit(training_num) {
    var board_num = 0;
    var training = trainings[training_num];

    var edit_content = document.getElementById('edit_content');
    var form = document.getElementById('training_edit');
    if (form) {
        edit_content.removeChild(form);
    }

    const template_edit = document.getElementById('template_edit');
    
    let fragment = template_edit.content.cloneNode(true);
    let title = fragment.getElementById('edit_training_title');
    title.value = training.title;
    title.addEventListener('change', function() {
        trainings[training_num].title = this.value;
        console.log(`Setting trainings[${training_num}].title = "${this.value}".`);
    });

    let description = fragment.getElementById('edit_training_description');
    description.value = training.description;
    description.addEventListener('change', function() {
        trainings[training_num].description = this.value;
        console.log(`Setting trainings[${training_num}].description = "${this.value}".`);
    });

    edit_content.appendChild(fragment);
    
    form = document.getElementById('training_edit');
    
    const template_edit_set = document.getElementById('template_edit_set');
        
    for (let set_num in training.sets) {
        let set = training.sets[set_num];
        
        let fragment = template_edit_set.content.cloneNode(true);
        fragment.querySelectorAll('label').forEach(function(label) {
            label.htmlFor += "_" + set_num;
        });
        
        let number = fragment.querySelector('.edit_set_number');
        number.innerHTML = 1 + Number(set_num);
        
        let pause = fragment.getElementById('edit_set_pause');
        pause.value = set.pause;
        pause.id += "_" + set_num;
        pause.addEventListener('change', function() {
            if (this.value < 15) {
                this.value = 15;
            }
            trainings[training_num].sets[set_num].pause = Number(this.value);
            console.log(`Setting trainings[${training_num}].sets[${set_num}].pause = ${this.value}.`);
        });
        
        let title = fragment.getElementById('edit_set_title');
        title.value = set.title;
        title.id += "_" + set_num;
        title.addEventListener('change', function() {
            trainings[training_num].sets[set_num].title = this.value;
            console.log(`Setting trainings[${training_num}].sets[${set_num}].title = "${this.value}".`);
        });

        let description = fragment.getElementById('edit_set_description');
        description.value = set.description;
        description.id += "_" + set_num;
        description.addEventListener('change', function() {
            trainings[training_num].sets[set_num].description = this.value;
            console.log(`Setting trainings[${training_num}].sets[${set_num}].description = "${this.value}".`);
        });

        let img_board = fragment.querySelector('img.board_img');
        let img_left = fragment.querySelector('img.overlay_left');
        let img_right = fragment.querySelector('img.overlay_right');
        
        img_board.src = "images/" + boards[board_num].image;

        let left = fragment.getElementById('edit_set_left');
        left.id += "_" + set_num;
        for (let hold_id in boards[board_num].left_holds) {
            let opt = document.createElement('option');
            opt.setAttribute('value', hold_id);
            let content = document.createTextNode(boards[board_num].left_holds[hold_id].name);
            opt.appendChild(content);
            left.appendChild(opt);
        }
        left.value = set.left;
        img_left.src = "images/" + boards[board_num].left_holds[set.left].image;
        left.addEventListener('change', function() {
            trainings[training_num].sets[set_num].left = this.value;
            img_left.src = "images/" + boards[board_num].left_holds[this.value].image;
            console.log(`Setting trainings[${training_num}].sets[${set_num}].left = ${this.value} (${this.item(this.selectedIndex).text}).`);
        });

        let right = fragment.getElementById('edit_set_right');
        right.id += "_" + set_num;
        for (let hold_id in boards[board_num].right_holds) {
            let opt = document.createElement('option');
            opt.setAttribute('value', hold_id);
            let content = document.createTextNode(boards[board_num].right_holds[hold_id].name);
            opt.appendChild(content);
            right.appendChild(opt);
        }
        right.value = set.right;
        img_right.src = "images/" + boards[board_num].right_holds[set.right].image;
        right.addEventListener('change', function() {
            trainings[training_num].sets[set_num].right = this.value;
            img_right.src = "images/" + boards[board_num].right_holds[this.value].image;
            console.log(`Setting trainings[${training_num}].sets[${set_num}].right = ${this.value} (${this.item(this.selectedIndex).text}).`);
        });

        let hold = fragment.getElementById('edit_set_hold');
        hold.value = set.hold;
        hold.id += "_" + set_num;
        hold.addEventListener('change', function() {
            if (this.value < 1) {
                this.value = 1;
            }
            trainings[training_num].sets[set_num].hold = Number(this.value);
            console.log(`Setting trainings[${training_num}].sets[${set_num}].hold = ${this.value}.`);
        });
        
        let interr = fragment.getElementById('edit_set_break');
        interr.value = set.break;
        interr.id += "_" + set_num;
        interr.addEventListener('change', function() {
            if (this.value < 1) {
                this.value = 1;
            }
            trainings[training_num].sets[set_num].break = Number(this.value);
            console.log(`Setting trainings[${training_num}].sets[${set_num}].break = ${this.value}.`);
        });
        
        let reps = fragment.getElementById('edit_set_reps');
        reps.value = set.reps;
        reps.id += "_" + set_num;
        reps.addEventListener('change', function() {
            if (this.value < 1) {
                this.value = 1;
            }
            trainings[training_num].sets[set_num].reps = Number(this.value);
            console.log(`Setting trainings[${training_num}].sets[${set_num}].reps = ${this.value}.`);
        });
        
        form.appendChild(fragment);
    }
}

function showMenu() {
    document.getElementById("menu_content").style.display = "block";
    document.getElementById("run_content").style.display = "none";
    window.location.hash = "";
}

function showRun() {
    document.getElementById("menu_content").style.display = "none";
    document.getElementById("run_content").style.display = "block";
    window.location.hash = "run";
}

function initOnce() {
    var board_select = document.getElementsByName('board_select')[0];
    var training_select = document.getElementsByName('training_select')[0];

    var start_button = document.getElementsByName('start')[0];
    start_button.addEventListener("click", async function startTraining() {
        showRun();
        var selected_board_num = board_select.options[board_select.selectedIndex].value;
        var selected_training_num = training_select.options[training_select.selectedIndex].value;
        try {
            await runTraining(boards[selected_board_num], trainings[selected_training_num]);
        }
        catch (err) {
            console.log(`Training aborted (${err})`);
        }
        finally {
            showMenu();
        }
    });

    var pause_button = document.getElementsByName("pause")[0];
    pause_button.addEventListener("click", COUNTER.pause);

    var stop_button = document.getElementsByName("stop")[0];
    stop_button.addEventListener("click", COUNTER.stop);

    for (var board_num in boards) {
        var opt = document.createElement('option');
        opt.setAttribute('value', board_num);
        var content = document.createTextNode(boards[board_num].name);
        opt.appendChild(content);
        board_select.appendChild(opt);
    }
    board_select.selectedIndex = 0;
    fillTrainingSelect();
    
    board_select.onchange = fillTrainingSelect;
    training_select.onchange = showTrainingDetails;

    function fillTrainingSelect() {
        var board_num = board_select.options[board_select.selectedIndex].value;
        while (training_select.firstChild) {
            training_select.removeChild(training_select.firstChild);
        }
        for (var training_num in trainings) {
            var training = trainings[training_num];
            if (training.board == boards[board_num].id) {
                var opt = document.createElement('option');
                opt.setAttribute('value', training_num);
                var content = document.createTextNode(training.title);
                opt.appendChild(content);
                training_select.appendChild(opt);
            }
            training_select.selectedIndex = 0;
            showTrainingDetails();
        }
    }

    function showTrainingDetails() {
        var selected_board_num = board_select.options[board_select.selectedIndex].value;
        var selected_training_num = training_select.options[training_select.selectedIndex].value;
        var board = boards[selected_board_num];
        var training = trainings[selected_training_num];

        var training_details = document.getElementById('training_details');
        while (training_details.firstChild) {
            training_details.removeChild(training_details.firstChild);
        }

        addElement(training_details, 'h2', training.title, {'class': 'training_title'});
        addElement(training_details, 'p', training.description.replace(/([^.])$/, '$1.'), {'class': 'training_description'});
        var times = calculateTimes(training);
        addElement(training_details, 'p', `Total time: ${Math.floor(times[3] / 60)}:${(times[3] % 60).toString().padStart(2, "0")} min. Hang time: ${Math.floor(times[0] / 60)}:${(times[0] % 60).toString().padStart(2, "0")} min.`, {'class': 'training_description'});
        
        for (var set_num in training.sets) {
            var set = training.sets[set_num];
            
            var pause_div = addElement(training_details, 'div', `Pause for ${set.pause} seconds.`, {'class': 'training_pause'});
            
            var div = addElement(training_details, 'div', null, {'class': 'training_set'});
            
            addElement(div, 'h3', (Number(set_num) + 1) + ". " + set.title, {'class': 'set_title'});

            var outer = addElement(div, 'div', null, {'class': 'board_small_container'});

            addElement(outer, 'img', null, {'class': 'board_img', 'src': "images/" + board.image, 'alt': ""});
            addElement(outer, 'img', null, {'class': 'overlay_img overlay_left', 'src': "images/" + board.left_holds[set.left].image, 'alt': ""});
            addElement(outer, 'img', null, {'class': 'overlay_img overlay_right', 'src': "images/" + board.right_holds[set.right].image, 'alt': ""});

            addElement(div, 'p', set.description.replace(/([^.])$/, '$1.'), {'class': 'set_description'});
            addElement(div, 'p', `Hold for ${set.hold} seconds. Interrupt for ${set.break} seconds. Repeat ${set.reps} times.`, {'class': 'set_details'});
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
//showMenu();
showTrainingEdit(0);
