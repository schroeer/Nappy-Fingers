// phonegap prepare browser & pscp -l schroeer -i ..\Gipfelkreuz\private_key.ppk -r platforms\browser\www\* daimlerstr.de:stella/www/trainer/

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

// https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
function downloadTrainings() {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(TRAININGS, null, "  "));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "trainings.json");
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

async function runTraining(board, training) {
    var set_title_div = document.getElementById("set_title");
    var set_description_div = document.getElementById("set_description");
    var time_counter = document.getElementById("time_counter");
    var hold_pbar = document.getElementById("hold_pbar");
    var break_pbar = document.getElementById("break_pbar");
    var pause_pbar = document.getElementById("pause_pbar");
    
    for (var i in training.sets) {
        var set = training.sets[i];
        if (set.pause < 15) {
            set.pause = 15;
        }

        if (i > 0) { // Vor dem ersten Satz keine Ansage der Pause
            speak(makePauseString(set.pause, false));
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
                
                if (set.pause - step == 15) { // 15s vor Ende der Pause: Ankündigung des nächsten Satzes
                    speak(`Next exercise: ${set.description} for ${set.hold} seconds. Left hand ${board.left_holds[set.left].name}. Right hand ${board.right_holds[set.right].name}. Repeat ${set.reps} ${((set.reps > 1) ? "times" : "time")}.`);

                    set_title_div.textContent = set.title;
                    set_description_div.textContent = set.description;
                    
                    document.querySelector("#run_content .overlay_left").src = board.left_holds[set.left].image ? "images/" + board.left_holds[set.left].image : "";
                    document.querySelector("#run_content .overlay_right").src = board.right_holds[set.right].image ? "images/" + board.right_holds[set.right].image : "";
                }
                if (step > 0 && ((set.pause - step) % 30 == 0)) { // alle 30s Zeit ansagen
                    speak(makePauseString(set.pause - step, true));
                }
                if (set.pause - step <= 5) { // letzte fünf Sekunden der Pause ticken
                    await ticSound();
                }
            }
        );

        await runSet(set);
    }
    speak("Congratulations!");
    console.log("Training completed");
   
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
            if (rep == set.reps - 1) { // bei letzter Wiederholung Break-Balken weg
                break_pbar.style.display = "none";
            }

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
            
            if (rep < set.reps - 1) { // bei letzter Wiederholung keine Break-Pause
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
        }
        console.log("set complete");
    }
    
    function speak(message) {
        var utterance = new SpeechSynthesisUtterance();
        utterance.text = message;
        utterance.lang = 'en-US';
        console.log(`Speaking "${message}"`);
        speechSynthesis.speak(utterance);
    }

    function makePauseString(pause, short = false) {
        var minutes = Math.floor(pause / 60);
        var seconds = pause % 60;
        var pause_str = short ? "" : "Pause for ";
        if (minutes != 0) {
            pause_str += minutes + ((minutes > 1) ? " minutes" : " minute");
            if (seconds != 0) {
                pause_str += short ? " " : " and ";
            }
        }
        if (seconds != 0) {
            pause_str += seconds;
            if (!short || minutes == 0) {
                pause_str += (seconds > 1) ? " seconds" : " second";
            }
        }
        return pause_str + ".";
    }
}

function updateMainPage() {
    var board_select = document.getElementsByName('board_select')[0];
    var training_select = document.getElementsByName('training_select')[0];
    var selected_training = training_select.selectedIndex;
    if (selected_training == -1)
        selected_training = 0;
    console.log(selected_training);
    
    for (var board_num in BOARDS) {
        var opt = document.createElement('option');
        opt.setAttribute('value', board_num);
        var content = document.createTextNode(BOARDS[board_num].name);
        opt.appendChild(content);
        board_select.appendChild(opt);
    }
    board_select.selectedIndex = 0;
    fillTrainingSelect(selected_training);
    
    board_select.onchange = fillTrainingSelect;    training_select.onchange = showTrainingDetails;

    function fillTrainingSelect(selected = 0) {
        var board_num = board_select.options[board_select.selectedIndex].value;
        while (training_select.firstChild) {
            training_select.removeChild(training_select.firstChild);
        }
        for (var training_num in TRAININGS) {
            var training = TRAININGS[training_num];
            if (training.board == BOARDS[board_num].id) {
                var opt = document.createElement('option');
                opt.setAttribute('value', training_num);
                var content = document.createTextNode(training.title);
                opt.appendChild(content);
                training_select.appendChild(opt);
            }
        }
        training_select.selectedIndex = selected;
        showTrainingDetails();
    }

    function showTrainingDetails() {
        var selected_board_num = board_select.options[board_select.selectedIndex].value;
        var selected_training_num = training_select.options[training_select.selectedIndex].value;
        var board = BOARDS[selected_board_num];
        var training = TRAININGS[selected_training_num];

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
            addElement(outer, 'img', null, {'class': 'overlay_img overlay_left', 'src': (board.left_holds[set.left].image ? "images/" + board.left_holds[set.left].image : ""), 'alt': ""});
            addElement(outer, 'img', null, {'class': 'overlay_img overlay_right', 'src': (board.right_holds[set.right].image ? "images/" + board.right_holds[set.right].image : ""), 'alt': ""});

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
                inter += (set.reps - 1) * set.break;
                hold += set.reps * set.hold;
            }
            return [hold, inter, pause, hold + inter + pause];
        }
    }
}

function updateEditPage(training_num) {
    var board_num = 0;
    var training = TRAININGS[training_num];

    var edit_content = document.getElementById('edit_content');

    // TODO: wrong. button done muss auch gelöscht werden.
    // Alle children löschen löscht aber auch Templates.
    if (document.getElementById('training_edit')) {
        edit_content.removeChild(document.getElementById('training_edit'));
    }

    const template_edit = document.getElementById('template_edit');
    
    let fragment = template_edit.content.cloneNode(true);

    let title = fragment.getElementById('edit_training_title');
    title.value = training.title;
    title.addEventListener('change', function changedTrainingTitle() {
        TRAININGS[training_num].title = this.value;
        console.log(`Setting trainings[${training_num}].title = "${this.value}".`);
    });

    let description = fragment.getElementById('edit_training_description');
    description.value = training.description;
    description.addEventListener('change', function changedTrainingDescription() {
        TRAININGS[training_num].description = this.value;
        console.log(`Setting trainings[${training_num}].description = "${this.value}".`);
    });

    let button_add = fragment.querySelector('button[name=add_set]');
    button_add.addEventListener("click", async function addSet() {
        TRAININGS[training_num].sets.splice(0, 0, {
            "title":        "",
            "description":  "",
            "left":         1,
            "right":        1,
            "hold":         5,
            "break":        5,
            "reps":         5,
            "pause":        60,
        });
        updateEditPage(training_num);
    });

    let button_done = fragment.querySelector('button[name=edit_complete]');
    button_done.addEventListener("click", async function editDone() {
        // save
        navigateTo("");
    });

    edit_content.appendChild(fragment);
    
    var form = document.getElementById('training_edit');
    
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
        pause.addEventListener('change', function changeSetPause() {
            if (this.value < 15) {
                this.value = 15;
            }
            TRAININGS[training_num].sets[set_num].pause = Number(this.value);
            console.log(`Setting trainings[${training_num}].sets[${set_num}].pause = ${this.value}.`);
        });
        
        let title = fragment.getElementById('edit_set_title');
        title.value = set.title;
        title.id += "_" + set_num;
        title.addEventListener('change', function changeSetTitle() {
            TRAININGS[training_num].sets[set_num].title = this.value;
            console.log(`Setting trainings[${training_num}].sets[${set_num}].title = "${this.value}".`);
        });

        let description = fragment.getElementById('edit_set_description');
        description.value = set.description;
        description.id += "_" + set_num;
        description.addEventListener('change', function changeSetDescription() {
            TRAININGS[training_num].sets[set_num].description = this.value;
            console.log(`Setting trainings[${training_num}].sets[${set_num}].description = "${this.value}".`);
        });

        let img_board = fragment.querySelector('img.board_img');
        let img_left = fragment.querySelector('img.overlay_left');
        let img_right = fragment.querySelector('img.overlay_right');
        
        img_board.src = "images/" + BOARDS[board_num].image;

        let left = fragment.getElementById('edit_set_left');
        left.id += "_" + set_num;
        for (let hold_id in BOARDS[board_num].left_holds) {
            let opt = document.createElement('option');
            opt.setAttribute('value', hold_id);
            let content = document.createTextNode(BOARDS[board_num].left_holds[hold_id].name);
            opt.appendChild(content);
            left.appendChild(opt);
        }
        left.value = set.left;
        img_left.src = BOARDS[board_num].left_holds[set.left].image ? "images/" + BOARDS[board_num].left_holds[set.left].image : "";
        left.addEventListener('change', function changeSetLeft() {
            TRAININGS[training_num].sets[set_num].left = this.value;
            img_left.src = "images/" + BOARDS[board_num].left_holds[this.value].image;
            console.log(`Setting trainings[${training_num}].sets[${set_num}].left = ${this.value} (${this.item(this.selectedIndex).text}).`);
        });

        let right = fragment.getElementById('edit_set_right');
        right.id += "_" + set_num;
        for (let hold_id in BOARDS[board_num].right_holds) {
            let opt = document.createElement('option');
            opt.setAttribute('value', hold_id);
            let content = document.createTextNode(BOARDS[board_num].right_holds[hold_id].name);
            opt.appendChild(content);
            right.appendChild(opt);
        }
        right.value = set.right;
        img_right.src = BOARDS[board_num].right_holds[set.right].image ? "images/" + BOARDS[board_num].right_holds[set.right].image : "";
        right.addEventListener('change', function changeSetRight() {
            TRAININGS[training_num].sets[set_num].right = this.value;
            img_right.src = "images/" + BOARDS[board_num].right_holds[this.value].image;
            console.log(`Setting trainings[${training_num}].sets[${set_num}].right = ${this.value} (${this.item(this.selectedIndex).text}).`);
        });

        let hold = fragment.getElementById('edit_set_hold');
        hold.value = set.hold;
        hold.id += "_" + set_num;
        hold.addEventListener('change', function changeSetHold() {
            if (this.value < 1) {
                this.value = 1;
            }
            TRAININGS[training_num].sets[set_num].hold = Number(this.value);
            console.log(`Setting trainings[${training_num}].sets[${set_num}].hold = ${this.value}.`);
        });
        
        let interr = fragment.getElementById('edit_set_break');
        interr.value = set.break;
        interr.id += "_" + set_num;
        interr.addEventListener('change', function changeSetBreak() {
            if (this.value < 1) {
                this.value = 1;
            }
            TRAININGS[training_num].sets[set_num].break = Number(this.value);
            console.log(`Setting trainings[${training_num}].sets[${set_num}].break = ${this.value}.`);
        });
        
        let reps = fragment.getElementById('edit_set_reps');
        reps.value = set.reps;
        reps.id += "_" + set_num;
        reps.addEventListener('change', function changeSetReps() {
            if (this.value < 1) {
                this.value = 1;
            }
            TRAININGS[training_num].sets[set_num].reps = Number(this.value);
            console.log(`Setting trainings[${training_num}].sets[${set_num}].reps = ${this.value}.`);
        });
        
        let button_add = fragment.querySelector('button[name=add_set]');
        button_add.addEventListener("click", async function addSet() {
            TRAININGS[training_num].sets.splice(Number(set_num) + 1, 0, {
                "title":        "",
                "description":  "",
                "left":         1,
                "right":        1,
                "hold":         5,
                "break":        5,
                "reps":         5,
                "pause":        60,
            });
            updateEditPage(training_num);
        });
        
        let button_delete = fragment.querySelector('button[name=delete_set]');
        button_delete.addEventListener("click", async function deleteSet() {
            TRAININGS[training_num].sets.splice(set_num, 1);
            updateEditPage(training_num);
        });
        
        form.appendChild(fragment);
    }
}

function navigateTo(page) {
    window.location.hash = page;
}

function handleRouting(event) {
    var match = location.hash.match(/#?([^_]+)_?(\d*)/);
    var new_page = match ? match[1] : "";
    var new_num = match ? match[2] : null;
    var old_page = "", old_num = null;
    if (event) {
        match = event.oldURL.match(/[^#]*#?([^_]+)_?(\d*)/);
        old_page = match ? match[1] : "";
        old_num = match ? match[2] : null;
    }
    console.log("Navigating to " + new_page);
    if (old_page == "run") {
        // TODO: are you sure?
        COUNTER.stop();
    }
    window.scrollTo(0,0);
    switch (new_page) {
        case "":
            updateMainPage();
            document.getElementById("toolbar_title").innerText = "nappy fingers";
            document.getElementById("toolbar_icon_back").style.display = "none";
            document.getElementById("toolbar_icon_menu").style.display = "inline";
            document.getElementById("main_content").style.display = "block";
            document.getElementById("run_content").style.display = "none";
            document.getElementById("edit_content").style.display = "none";
            break;
        case "edit":
            updateEditPage(new_num);
            document.getElementById("toolbar_title").innerText = "Editor";
            document.getElementById("toolbar_icon_back").style.display = "inline";
            document.getElementById("toolbar_icon_menu").style.display = "none";
            document.getElementById("main_content").style.display = "none";
            document.getElementById("run_content").style.display = "none";
            document.getElementById("edit_content").style.display = "block";
            break;
        case "run":
            document.getElementById("toolbar_title").innerText = "Trainer";
            document.getElementById("toolbar_icon_back").style.display = "inline";
            document.getElementById("toolbar_icon_menu").style.display = "none";
            document.getElementById("main_content").style.display = "none";
            document.getElementById("run_content").style.display = "block";
            document.getElementById("edit_content").style.display = "none";
            break;
    }
}

function init() {
    var board_select = document.getElementsByName('board_select')[0];
    var training_select = document.getElementsByName('training_select')[0];
    
    window.addEventListener('hashchange', handleRouting);

    window.addEventListener("backbutton", function popstate(event) {
        console.log("backbutton event " + event);
    }, false);

    StatusBar.hide();

    var start_button = document.getElementsByName('start')[0];
    start_button.addEventListener("click", async function startTraining() {
        var selected_board_num = board_select.options[board_select.selectedIndex].value;
        var selected_training_num = training_select.options[training_select.selectedIndex].value;
        navigateTo("run_" + selected_training_num);
        try {
            window.plugins.insomnia.keepAwake();
            await runTraining(BOARDS[selected_board_num], TRAININGS[selected_training_num]);
            navigateTo("");
        }
        catch (err) {
            console.log(`Training aborted (${err})`);
        }
        finally {
            window.plugins.insomnia.allowSleepAgain();
        }
    });

    var edit_button = document.getElementsByName('edit')[0];
    edit_button.addEventListener("click", async function editTraining() {
        var selected_training_num = training_select.options[training_select.selectedIndex].value;
        navigateTo(`edit_${selected_training_num}`);
    });

    var clone_button = document.getElementsByName('clone')[0];
    clone_button.addEventListener("click", async function cloneTraining() {
        var selected_training_num = Number(training_select.options[training_select.selectedIndex].value);
        TRAININGS.splice(selected_training_num, 0, JSON.parse(JSON.stringify(TRAININGS[selected_training_num])));
        TRAININGS[selected_training_num + 1].title += " (copy)";
        navigateTo(`edit_${selected_training_num + 1}`);
    });

    var delete_button = document.getElementsByName('delete')[0];
    delete_button.addEventListener("click", async function editTraining() {
        var selected_training_num = training_select.options[training_select.selectedIndex].value;
        // TODO: confirm
        TRAININGS.splice(selected_training_num, 1);
        // TODO: save
        updateMainPage();
    });

    var pause_button = document.getElementsByName("pause")[0];
    pause_button.addEventListener("click", COUNTER.pause);

    var stop_button = document.getElementsByName("stop")[0];
    stop_button.addEventListener("click", function stopRun() {
        navigateTo("");
    });

    handleRouting();
}

