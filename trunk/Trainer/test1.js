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

var test_set = {
    "title": "Hang on straight arms",
    "left":  1,
    "right": 1,
    "hold":  7,
    "break": 3,
    "reps":  5,
};

var ss = new Set(test_set);

var inputForm = document.querySelector('form');
var inputTxt = document.querySelector('.txt');

var synth = window.speechSynthesis;
var voice;

function selectVoice() {
    var voices = synth.getVoices();
    for (var i = 0; i < voices.length ; i++) {
        if (voices[i].lang.startsWith("en")) {
            voice = voices[i];
            break;
        }
    }
}
selectVoice();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = selectVoice;
}

function speak(){
  if(inputTxt.value !== ''){
    var utterThis = new SpeechSynthesisUtterance(inputTxt.value);
    utterThis.voice = voice;
    synth.speak(utterThis);
  }
}

inputForm.onsubmit = function(event) {
  event.preventDefault();

  speak();

  inputTxt.blur();
}
