// phonegap prepare browser & pscp -l schroeer -i "C:\Users\Daniel Schröer\svncode\Gipfelkreuz\private_key.ppk" -r platforms\browser\www\* daimlerstr.de:stella/www/trainer/

"use strict";

var DEFAULT_SETTINGS = {
    'version': 3,
    'selectedBoardID': "bm1000",
    'showDefaultPrograms': true
};

var SETTINGS, CUSTOM_PROGRAMS = {};

const COUNTER = (function () {
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
        400,        //frequency
        0.02,       //attack
        0.02,       //decay
        "sine",     //waveform
        10,         //volume
        0,          //pan
        0,          //wait before playing
        1,          //pitch bend amount
        false,      //reverse
        0,          //random pitch range
        0,          //dissonance
        undefined,  //echo: [delay, feedback, filter]
        undefined   //reverb: [duration, decay, reverse?]
    );
}

function completedSound() {
    soundEffect( 587.33, 0, 0.2, "square", 1, 0, 0);    //D
    soundEffect( 880   , 0, 0.2, "square", 1, 0, 0.1);  //A
    soundEffect(1174.66, 0, 0.3, "square", 1, 0, 0.2);  //High D
}

function downloadPrograms() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(CUSTOM_PROGRAMS, null, "  "));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const date = new Date();
    const filename = `programs_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${(date.getDate() + 1).toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}.json`;
    downloadAnchorNode.setAttribute("download", filename);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function uploadPrograms(files) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const ct = JSON.parse(event.target.result);
            if (ct.version == DEFAULT_PROGRAMS.version) {
                CUSTOM_PROGRAMS = ct;
                console.log(`Imported custom programs from file "${file.name}"`);
                storeProgramsAndSettings();
                updateMainPage();
            }
        }
        catch(error) {}
    };
    reader.readAsText(file);
}

function storeProgramsAndSettings() {
    window.localStorage.setItem('settings', JSON.stringify(SETTINGS));
    window.localStorage.setItem('programs', JSON.stringify(CUSTOM_PROGRAMS));
    console.log('Stored programs and settings in local storage');
}

function loadProgramsAndSettings() {
    if (window.localStorage.getItem('settings')) {
        SETTINGS = JSON.parse(window.localStorage.getItem('settings'));
        if (SETTINGS.version == DEFAULT_SETTINGS.version) {
            console.log('Restored settings from storage.');
        }
        else {
            SETTINGS = DEFAULT_SETTINGS;
            console.log('Stored settings outdated. Using defaults.');
        }
    }
    else {
        SETTINGS = DEFAULT_SETTINGS;
        console.log('Using default settings.');
    }

    if (window.localStorage.getItem('programs')) {
        CUSTOM_PROGRAMS = JSON.parse(window.localStorage.getItem('programs'));
        if (CUSTOM_PROGRAMS.version == DEFAULT_PROGRAMS.version) {
            console.log('Restored custom programs from storage.');
        }
        else {
            CUSTOM_PROGRAMS = { "version": DEFAULT_PROGRAMS.version };
            console.log('Stored custom programs outdated. Discarding. Sorry for that.');
        }
    }
    else {
        CUSTOM_PROGRAMS = { "version": DEFAULT_PROGRAMS.version };
        console.log('No stored custom programs found.');
    }
}

async function runProgram(board, program) {
    const exercise_title_div = document.getElementById("exercise_title");
    const exercise_description_div = document.getElementById("exercise_description");
    const time_counter = document.getElementById("time_counter");
    const hold_pbar = document.getElementById("hold_pbar");
    const rest_pbar = document.getElementById("rest_pbar");
    const pause_pbar = document.getElementById("pause_pbar");
    
    for (let i in program.exercises) {
        let exercise = program.exercises[i];
        if (exercise.pause < 15) {
            exercise.pause = 15;
        }

        if (i > 0) { // Vor dem ersten Satz keine Ansage der Pause
            speak(makePauseString(exercise.pause, false));
            exercise_title_div.textContent = "Pause";
            exercise_description_div.textContent = `Pause for ${Math.floor(exercise.pause / 60)}:${(exercise.pause % 60).toString().padStart(2, "0")} min.`;
        }
        else {
            exercise_title_div.textContent = "Get ready";
            exercise_description_div.textContent = "";
        }
        
        document.querySelectorAll("#run_content .overlay_img").forEach(function(element) {
            element.src = "";
        });

        pause_pbar.max = exercise.pause;
        pause_pbar.style.display = "inline-block";
        hold_pbar.style.display = "none";
        rest_pbar.style.display = "none";
        document.getElementById("exercise_counter").textContent = Number(i) + 1 + "/" + program.exercises.length;
        document.getElementById("repeat_counter").textContent = "   ";

        console.log(`pause ${exercise.pause} seconds`);
        await COUNTER.start(
            exercise.pause,
            1000,
            async function pauseCountdownStep(step) {
                time_counter.textContent = exercise.pause - step;
                pause_pbar.value = step + 1;
                
                if (exercise.pause - step == 15) { // 15s vor Ende der Pause: Ankündigung des nächsten Satzes
                    speak(`Next exercise: ${exercise.description} for ${exercise.hold} seconds. Left hand ${board.left_holds[exercise.left].name}. Right hand ${board.right_holds[exercise.right].name}. Repeat ${exercise.repeat} ${((exercise.repeat > 1) ? "times" : "time")}.`);

                    exercise_title_div.textContent = exercise.title;
                    exercise_description_div.textContent = exercise.description;
                    
                    document.querySelector("#run_content .overlay_left").src = board.left_holds[exercise.left].image ? "images/" + board.left_holds[exercise.left].image : "";
                    document.querySelector("#run_content .overlay_right").src = board.right_holds[exercise.right].image ? "images/" + board.right_holds[exercise.right].image : "";
                }
                if (step > 0 && ((exercise.pause - step) % 30 == 0)) { // alle 30s Zeit ansagen
                    speak(makePauseString(exercise.pause - step, true));
                }
                if (exercise.pause - step <= 5) { // letzte fünf Sekunden der Pause ticken
                    await ticSound();
                }
            }
        );

        await runExercise(exercise);
    }
    speak("Congratulations!");
    console.log("Program completed");
   
    async function runExercise(exercise) {
        const utter_go = new SpeechSynthesisUtterance();
        utter_go.text = "Go!";
        utter_go.lang = 'en-US';

        pause_pbar.style.display = "none";
        hold_pbar.style.display = "inline-block";
        rest_pbar.style.display = "inline-block";
        
        hold_pbar.max = exercise.hold;
        hold_pbar.style.width = 100 * exercise.hold / (exercise.hold + exercise.rest) + "%";

        rest_pbar.max = exercise.rest;
        rest_pbar.style.width = 100 * exercise.rest / (exercise.hold + exercise.rest) + "%";
        
        for (let rep = 0; rep < exercise.repeat; rep++) {
            hold_pbar.value = 0;
            rest_pbar.value = 0;
            if (rep == exercise.repeat - 1) { // bei letzter Wiederholung rest-Balken weg
                rest_pbar.style.display = "none";
            }

            document.getElementById("repeat_counter").textContent = Number(rep) + 1 + "/" + exercise.repeat;
            
            console.log(`rep ${rep+1}: hold`);
            speechSynthesis.speak(utter_go);
            await COUNTER.start(
                exercise.hold,
                1000,
                function hangCountdownStep(step) {
                    time_counter.textContent = exercise.hold - step;
                    hold_pbar.value = step + 1;
                }
            );
            await completedSound();

            console.log(`rep ${rep+1}: rest`);
            
            if (rep < exercise.repeat - 1) { // bei letzter Wiederholung keine rest-Pause
                await COUNTER.start(
                    exercise.rest,
                    1000,
                    async function restCountdownStep(step) {
                        time_counter.textContent = exercise.rest - step;
                        rest_pbar.value = step + 1;

                        if (exercise.rest - step <= 3) {
                            await ticSound();
                        }
                    }
                );
            }
        }
        console.log("exercise complete");
    }
    
    function speak(message) {
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = message;
        utterance.lang = 'en-US';
        console.log(`Speaking "${message}"`);
        speechSynthesis.speak(utterance);
    }

    function makePauseString(pause, short = false) {
        const minutes = Math.floor(pause / 60);
        const seconds = pause % 60;
        let pause_str = short ? "" : "Pause for ";
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

function getProgram(identifier) {
    // identifier: e.g. c1
    const type = identifier.substr(0, 1);
    const num = identifier.substr(1);
    let program;
    if (type == 'c') {
        program = CUSTOM_PROGRAMS[SETTINGS.selectedBoardID][num];
    }
    else if (type == 'd') {
        program = DEFAULT_PROGRAMS[SETTINGS.selectedBoardID][num];
    }
    return program;
}

function updateMainPage(identifier) {
    const program_select = document.getElementsByName('program_select')[0];

    // Remove select options
    while (program_select.firstChild) {
        program_select.removeChild(program_select.firstChild);
    }
    
    let selected_program_identifier = (typeof identifier !== 'undefined')
        ? identifier
        : program_select.options[program_select.selectedIndex]
            ? program_select.options[program_select.selectedIndex].value
            : (CUSTOM_PROGRAMS[SETTINGS.selectedBoardID] && (CUSTOM_PROGRAMS[SETTINGS.selectedBoardID].length > 0))
                ? "c0"
                : "d0";

    // Populate select options
    if (CUSTOM_PROGRAMS[SETTINGS.selectedBoardID] && (CUSTOM_PROGRAMS[SETTINGS.selectedBoardID].length > 0)) {
        const custom_optgroup = document.createElement('optgroup');
        custom_optgroup.setAttribute('label', 'Your programs'.toUpperCase());
        for (let program_num in CUSTOM_PROGRAMS[SETTINGS.selectedBoardID]) {
            const program = CUSTOM_PROGRAMS[SETTINGS.selectedBoardID][program_num];
            const opt = document.createElement('option');
            const value = 'c' + program_num;
            opt.setAttribute('value', value);
            if (value == selected_program_identifier) {
                opt.defaultSelected = true;
            }
            const content = document.createTextNode(program.title);
            opt.appendChild(content);
            custom_optgroup.appendChild(opt);
        }
        program_select.appendChild(custom_optgroup);
    }
    else if (!SETTINGS.showDefaultPrograms) {
        SETTINGS.showDefaultPrograms = true;
    }
    if (SETTINGS.showDefaultPrograms) {
        const default_optgroup = document.createElement('optgroup');
        default_optgroup.setAttribute('label', 'Built-in programs'.toUpperCase());
        for (let program_num in DEFAULT_PROGRAMS[SETTINGS.selectedBoardID]) {
            const program = DEFAULT_PROGRAMS[SETTINGS.selectedBoardID][program_num];
            const opt = document.createElement('option');
            const value = 'd' + program_num;
            opt.setAttribute('value', value);
            if (value == selected_program_identifier) {
                opt.defaultSelected = true;
            }
            const content = document.createTextNode(program.title);
            opt.appendChild(content);
            default_optgroup.appendChild(opt);
        }
        program_select.appendChild(default_optgroup);
    }

    // Select change handler
    program_select.onchange = function selectProgram() {
        const identifier = program_select.options[program_select.selectedIndex].value;
        const type = identifier.substr(0, 1);
        const edit_button = document.getElementsByName('edit')[0];
        const delete_button = document.getElementsByName('delete')[0];
        if (type == "d") {
            edit_button.disabled = true;
            delete_button.disabled = true;
        }
        else {
            edit_button.disabled = false;
            delete_button.disabled = false;
        }
        showProgramDetails();
    }

    //  Activate/deactivate buttons and call showProgramDetails()
    program_select.onchange();

    function showProgramDetails() {
        const program = getProgram(program_select.options[program_select.selectedIndex].value);
        const board = BOARDS[SETTINGS.selectedBoardID];

        const program_details_header = document.getElementById('program_details_header');
        while (program_details_header.firstChild) {
            program_details_header.removeChild(program_details_header.firstChild);
        }

        addElement(program_details_header, 'h2', program.title, {'class': 'program_title'});
        addElement(program_details_header, 'p', program.description.replace(/([^.])$/, '$1.'), {'class': 'program_description'});
        const times = calculateTimes(program);
        addElement(program_details_header, 'p', `Total time: ${Math.floor(times[3] / 60)}:${(times[3] % 60).toString().padStart(2, "0")} min. Hang time: ${Math.floor(times[0] / 60)}:${(times[0] % 60).toString().padStart(2, "0")} min.`, {'class': 'program_times'});
        
        const program_details_exercises = document.getElementById('program_details_exercises');
        while (program_details_exercises.firstChild) {
            program_details_exercises.removeChild(program_details_exercises.firstChild);
        }

        for (let exercise_num in program.exercises) {
            const exercise = program.exercises[exercise_num];
            const pause_div = addElement(program_details_exercises, 'div', `Pause for ${exercise.pause} seconds.`, {'class': 'program_pause'});
            const div = addElement(program_details_exercises, 'div', null, {'class': 'program_exercise'});
            addElement(div, 'h3', (Number(exercise_num) + 1) + ". " + exercise.title, {'class': 'exercise_title'});
            const outer = addElement(div, 'div', null, {'class': 'board_small_container'});
            addElement(outer, 'img', null, {'class': 'board_img', 'src': "images/" + board.image, 'alt': ""});
            addElement(outer, 'img', null, {'class': 'overlay_img overlay_left', 'src': (board.left_holds[exercise.left].image ? "images/" + board.left_holds[exercise.left].image : ""), 'alt': ""});
            addElement(outer, 'img', null, {'class': 'overlay_img overlay_right', 'src': (board.right_holds[exercise.right].image ? "images/" + board.right_holds[exercise.right].image : ""), 'alt': ""});
            addElement(div, 'p', exercise.description.replace(/([^.])$/, '$1.'), {'class': 'exercise_description'});
            addElement(div, 'p', `Hold for ${exercise.hold} seconds. Rest for ${exercise.rest} seconds. Repeat ${exercise.repeat} times.`, {'class': 'exercise_details'});
        }
        
        function addElement(node, type, text, atts) {
            const el = document.createElement(type);
            if (text) {
                const tn = document.createTextNode(text);
                el.appendChild(tn);
            }
            for (let name in atts) {
                el.setAttribute(name, atts[name]);
            }
            node.appendChild(el);
            return el;
        }
        
        function calculateTimes(program) {
            let pause = 0, inter = 0, hold = 0;
            for (let exercise of program.exercises) {
                pause += exercise.pause;
                inter += (exercise.repeat - 1) * exercise.rest;
                hold += exercise.repeat * exercise.hold;
            }
            return [hold, inter, pause, hold + inter + pause];
        }
    }
}

function updateEditPage(identifier) {
    const program = getProgram(identifier);

    const edit_content = document.getElementById('edit_content');
    if (document.getElementById('program_edit')) {
        edit_content.removeChild(document.getElementById('program_edit'));
    }

    const template_edit = document.getElementById('template_edit');
    const fragment = template_edit.content.cloneNode(true);

    const title = fragment.getElementById('edit_program_title');
    title.value = program.title;
    title.addEventListener('change', function changedProgramTitle() {
        program.title = this.value;
        console.log(`Setting programs[${identifier}].title = "${this.value}".`);
        storeProgramsAndSettings();
    });

    const description = fragment.getElementById('edit_program_description');
    description.value = program.description;
    description.addEventListener('change', function changedProgramDescription() {
        program.description = this.value;
        console.log(`Setting programs[${identifier}].description = "${this.value}".`);
        storeProgramsAndSettings();
    });

    const button_add = fragment.querySelector('button[name=add_exercise]');
    button_add.addEventListener("click", async function addExercise() {
        program.exercises.splice(0, 0, {
            "title":        "",
            "description":  "",
            "left":         1,
            "right":        1,
            "hold":         5,
            "rest":         5,
            "repeat":       5,
            "pause":        60,
        });
        storeProgramsAndSettings();
        updateEditPage(identifier);
    });

    edit_content.appendChild(fragment);
    
    const form = document.getElementById('program_edit');
    const template_edit_exercise = document.getElementById('template_edit_exercise');
        
    for (let exercise_num in program.exercises) {
        const exercise = program.exercises[exercise_num];
        
        const fragment = template_edit_exercise.content.cloneNode(true);
        fragment.querySelectorAll('label').forEach(function(label) {
            label.htmlFor += "_" + exercise_num;
        });
        
        const number = fragment.querySelector('.edit_exercise_number');
        number.innerHTML = 1 + Number(exercise_num);
        
        const pause = fragment.getElementById('edit_exercise_pause');
        pause.value = exercise.pause;
        pause.id += "_" + exercise_num;
        pause.addEventListener('change', function changeExercisePause() {
            if (this.value < 15) {
                this.value = 15;
            }
            program.exercises[exercise_num].pause = Number(this.value);
            console.log(`Setting programs[${identifier}].exercises[${exercise_num}].pause = ${this.value}.`);
            storeProgramsAndSettings();
        });
        
        const title = fragment.getElementById('edit_exercise_title');
        title.value = exercise.title;
        title.id += "_" + exercise_num;
        title.addEventListener('change', function changeExerciseTitle() {
            program.exercises[exercise_num].title = this.value;
            console.log(`Setting programs[${identifier}].exercises[${exercise_num}].title = "${this.value}".`);
            storeProgramsAndSettings();
        });

        const description = fragment.getElementById('edit_exercise_description');
        description.value = exercise.description;
        description.id += "_" + exercise_num;
        description.addEventListener('change', function changeExerciseDescription() {
            program.exercises[exercise_num].description = this.value;
            console.log(`Setting programs[${identifier}].exercises[${exercise_num}].description = "${this.value}".`);
            storeProgramsAndSettings();
        });

        const img_board = fragment.querySelector('img.board_img');
        const img_left = fragment.querySelector('img.overlay_left');
        const img_right = fragment.querySelector('img.overlay_right');
        
        img_board.src = "images/" + BOARDS[SETTINGS.selectedBoardID].image;

        const left = fragment.getElementById('edit_exercise_left');
        left.id += "_" + exercise_num;
        for (let hold_id in BOARDS[SETTINGS.selectedBoardID].left_holds) {
            const opt = document.createElement('option');
            opt.setAttribute('value', hold_id);
            const content = document.createTextNode(BOARDS[SETTINGS.selectedBoardID].left_holds[hold_id].name);
            opt.appendChild(content);
            left.appendChild(opt);
        }
        left.value = exercise.left;
        img_left.src = BOARDS[SETTINGS.selectedBoardID].left_holds[exercise.left].image ? "images/" + BOARDS[SETTINGS.selectedBoardID].left_holds[exercise.left].image : "";
        left.addEventListener('change', function changeExerciseLeft() {
            program.exercises[exercise_num].left = this.value;
            img_left.src = "images/" + BOARDS[SETTINGS.selectedBoardID].left_holds[this.value].image;
            console.log(`Setting programs[${identifier}].exercises[${exercise_num}].left = ${this.value} (${this.item(this.selectedIndex).text}).`);
            storeProgramsAndSettings();
        });

        const right = fragment.getElementById('edit_exercise_right');
        right.id += "_" + exercise_num;
        for (let hold_id in BOARDS[SETTINGS.selectedBoardID].right_holds) {
            const opt = document.createElement('option');
            opt.setAttribute('value', hold_id);
            const content = document.createTextNode(BOARDS[SETTINGS.selectedBoardID].right_holds[hold_id].name);
            opt.appendChild(content);
            right.appendChild(opt);
        }
        right.value = exercise.right;
        img_right.src = BOARDS[SETTINGS.selectedBoardID].right_holds[exercise.right].image ? "images/" + BOARDS[SETTINGS.selectedBoardID].right_holds[exercise.right].image : "";
        right.addEventListener('change', function changeExerciseRight() {
            program.exercises[exercise_num].right = this.value;
            img_right.src = "images/" + BOARDS[SETTINGS.selectedBoardID].right_holds[this.value].image;
            console.log(`Setting programs[${identifier}].exercises[${exercise_num}].right = ${this.value} (${this.item(this.selectedIndex).text}).`);
            storeProgramsAndSettings();
        });

        const hold = fragment.getElementById('edit_exercise_hold');
        hold.value = exercise.hold;
        hold.id += "_" + exercise_num;
        hold.addEventListener('change', function changeExerciseHold() {
            if (this.value < 1) {
                this.value = 1;
            }
            program.exercises[exercise_num].hold = Number(this.value);
            console.log(`Setting programs[${identifier}].exercises[${exercise_num}].hold = ${this.value}.`);
            storeProgramsAndSettings();
        });
        
        const interr = fragment.getElementById('edit_exercise_rest');
        interr.value = exercise.rest;
        interr.id += "_" + exercise_num;
        interr.addEventListener('change', function changeExerciseRest() {
            if (this.value < 1) {
                this.value = 1;
            }
            program.exercises[exercise_num].rest = Number(this.value);
            console.log(`Setting programs[${identifier}].exercises[${exercise_num}].rest = ${this.value}.`);
            storeProgramsAndSettings();
        });
        
        const repeat = fragment.getElementById('edit_exercise_repeat');
        repeat.value = exercise.repeat;
        repeat.id += "_" + exercise_num;
        repeat.addEventListener('change', function changeExerciseRepeat() {
            if (this.value < 1) {
                this.value = 1;
            }
            program.exercises[exercise_num].repeat = Number(this.value);
            console.log(`Setting programs[${identifier}].exercises[${exercise_num}].repeat = ${this.value}.`);
            storeProgramsAndSettings();
        });
        
        const button_add = fragment.querySelector('button[name=add_exercise]');
        button_add.addEventListener("click", async function addExercise() {
            program.exercises.splice(Number(exercise_num) + 1, 0, {
                "title":        "",
                "description":  "",
                "left":         1,
                "right":        1,
                "hold":         5,
                "rest":         5,
                "repeat":       5,
                "pause":        60,
            });
            storeProgramsAndSettings();
            updateEditPage(identifier);
        });
        
        const button_delete = fragment.querySelector('button[name=delete_exercise]');
        button_delete.addEventListener("click", async function deleteExercise() {
            program.exercises.splice(exercise_num, 1);
            storeProgramsAndSettings();
            updateEditPage(identifier);
        });
        
        form.appendChild(fragment);
    }
}

function navigateTo(page) {
    window.location.hash = page;
}

async function handleRouting(event) {
    let match = location.hash.match(/[^#]*#?([^_]+)?(_([cd]\d+)){0,1}/);
    const new_page = match[1] || "";
    const new_identifier = match[3] || null;
    let old_page = "", old_identifier = null;
    if (event) {
    match = event.oldURL.match(/[^#]*#?([^_]+)?(_([cd]\d+)){0,1}/);
        old_page = match[1] || "";
        old_identifier = match[3] || null;
    }
    console.log(`Navigating from ${old_page} to ${new_page}`);
    if (old_page == "run") {
        // TODO: are you sure?
        COUNTER.stop();
    }
    window.scrollTo(0,0);
    document.getElementById("toolbar_icon_back").style.display = "none";
    document.getElementById("toolbar_icon_menu").style.display = "none";
    document.getElementById("main_content").style.display = "none";
    document.getElementById("run_content").style.display = "none";
    document.getElementById("edit_content").style.display = "none";
    document.getElementById("about_content").style.display = "none";
    switch (new_page) {
        case "":
            updateMainPage();
            document.getElementById("toolbar_title").innerText = "Nappy Fingers";
            document.getElementById("toolbar_icon_menu").style.display = "inline";
            document.getElementById("main_content").style.display = "block";
            break;
        case "edit":
            updateEditPage(new_identifier);
            document.getElementById("toolbar_title").innerText = getProgram(new_identifier).title;
            document.getElementById("toolbar_icon_back").style.display = "inline";
            document.getElementById("edit_content").style.display = "block";
            break;
        case "run":
            let program = getProgram(new_identifier);
            document.getElementById("toolbar_title").innerText = program.title;
            document.getElementById("toolbar_icon_back").style.display = "inline";
            document.getElementById("run_content").style.display = "block";
            try {
                window.plugins.insomnia.keepAwake();
                await runProgram(BOARDS[SETTINGS.selectedBoardID], program);
                //navigateTo(""); // TODO: sollte 'back' sein
                history.back();
            }
            catch (err) {
                console.log(`Program aborted (${err})`);
            }
            finally {
                window.plugins.insomnia.allowSleepAgain();
            }
            break;
        case "about":
            document.getElementById("toolbar_title").innerText = "About";
            document.getElementById("toolbar_icon_back").style.display = "inline";
            document.getElementById("about_content").style.display = "block";
            break;
    }
}

function init() {
    const program_select = document.getElementsByName('program_select')[0];
    
    StatusBar.hide();

    loadProgramsAndSettings();

    window.addEventListener('hashchange', handleRouting);

    const start_button = document.getElementsByName('start')[0];
    start_button.addEventListener("click", function startProgram() {
        const selected_program_identifier = program_select.options[program_select.selectedIndex].value;
        navigateTo("run_" + selected_program_identifier);
    });

    const edit_button = document.getElementsByName('edit')[0];
    edit_button.addEventListener("click", function editProgram() {
        const selected_program_identifier = program_select.options[program_select.selectedIndex].value;
        navigateTo(`edit_${selected_program_identifier}`);
    });

    const clone_button = document.getElementsByName('clone')[0];
    clone_button.addEventListener("click", function cloneProgram() {
        const selected_program_identifier = program_select.options[program_select.selectedIndex].value;
        let program = getProgram(selected_program_identifier);
        let clone = JSON.parse(JSON.stringify(program));
        clone.title += " (copy)";
        if (!CUSTOM_PROGRAMS[SETTINGS.selectedBoardID]) {
            CUSTOM_PROGRAMS[SETTINGS.selectedBoardID] = [];
        }
        CUSTOM_PROGRAMS[SETTINGS.selectedBoardID].push(clone);
        console.log(`Cloning program ${clone.title}`)
        storeProgramsAndSettings();
        let new_identifier = "c" + CUSTOM_PROGRAMS[SETTINGS.selectedBoardID].indexOf(clone);
        updateMainPage(new_identifier);
        window.scrollTo(0,0);
    });

    const delete_button = document.getElementsByName('delete')[0];
    delete_button.addEventListener("click", function editProgram() {
        const selected_program_identifier = program_select.options[program_select.selectedIndex].value;
        // TODO: confirm
        const num = selected_program_identifier.substr(1);
        console.log(`Deleting program ${CUSTOM_PROGRAMS[SETTINGS.selectedBoardID][num].title}`)
        CUSTOM_PROGRAMS[SETTINGS.selectedBoardID].splice(num, 1);
        storeProgramsAndSettings();
        updateMainPage('c0');
        window.scrollTo(0,0);
        // TODO: else cannot delete last program
        // TODO: delete button disablen
    });

    const pause_button = document.getElementsByName("pause")[0];
    pause_button.addEventListener("click", COUNTER.pause);

	var TouchMenu = TouchMenuLA({
		target: document.getElementById('drawer'),
        width: Math.min(Math.min(screen.availWidth, screen.availHeight) - 56, 280),
        zIndex: 2 
	});
	document.getElementById('toolbar_icon_menu').addEventListener('click', function(event){
		TouchMenu.toggle();
	}, false);
/*     document.getElementById('a_export_programs').addEventListener('click', function(event){
        event.preventDefault();
        TouchMenu.close();
        downloadPrograms();
	}, false);
    document.getElementById("a_import_programs").addEventListener("click", function(event) {
        event.preventDefault();
        TouchMenu.close();
        document.getElementById("fileElem").click();
    }, false);
 */    document.getElementById('a_about').addEventListener('click', function(event){
        event.preventDefault();
        TouchMenu.close();
        navigateTo('about');
	}, false);
    document.getElementById('drawer').style.display = "block";

    handleRouting();
}

