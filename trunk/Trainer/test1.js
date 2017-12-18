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
