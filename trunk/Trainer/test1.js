var inputForm = document.querySelector('form');
var inputTxt = document.querySelector('.txt');

var synth = window.speechSynthesis;
var voice;


function Set(parms) {
    this.title = parms.title;
    this.left  = parms.left;
    this.right = parms.right;
    this.hold  = parms.hold;
    this.break = parms.break;
    this.reps  = parms.reps;
    
    this.duration = function() {
        return this.hold * this.reps + this.break * (this.reps - 1);
    };

    this.hang_time = function() {
        return this.hold * this.reps;
    };
}

function selectVoice() {
    var voices = synth.getVoices();
    var list = document.getElementById('voicelist');
    for (var i = 0; i < voices.length ; i++) {
        var el = document.createElement("li");
        el.append(voices[i].name + ' (default: ' + voices[i].default + '; local: ' + voices[i].localService + ')');
        list.append(el);
    }
    for (var i = 0; i < voices.length ; i++) {
        if (voices[i].lang.startsWith('en')) {
            voice = voices[i];
            break;
        }
    }
    if (voice) {
        document.getElementById('info').append('selected voice: ' + voice.name);
    }
}

function speak(){
    if(inputTxt.value !== ''){
        var utterThis = new SpeechSynthesisUtterance(inputTxt.value);
        utterThis.voice = voice;
        utterThis.lang = 'en-US';
        synth.speak(utterThis);
    }
}

(function() {
    var test_set = {
        "title": "Hang on straight arms",
        "left":  1,
        "right": 1,
        "hold":  7,
        "break": 3,
        "reps":  5,
    };

    var ss = new Set(test_set);

    selectVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = selectVoice;
    }

    inputForm.onsubmit = function(event) {
      event.preventDefault();

      speak();

      inputTxt.blur();
    }
})();