const words = [
  "apple","river","cloud","stone","forest","light","shadow","energy","motion","signal",
  "memory","system","network","vector","matrix","cell","genome","protein","enzyme","pathway",
  "signal","noise","pattern","model","feature","cluster","distance","gradient","tensor","kernel",
  "learning","training","prediction","inference","probability","random","sample","dataset","variable","parameter",
  "function","mapping","distribution","normalization","scaling","threshold","classification","regression","accuracy","precision",
  "recall","validation","testing","pipeline","workflow","analysis","statistics","correlation","causality","variance",
  "bias","error","loss","optimization","iteration","convergence","stability","robustness","performance","benchmark",
  "hardware","software","memory","storage","compute","processor","thread","parallel","serial","latency",
  "bandwidth","cache","disk","network","server","client","request","response","protocol","interface",
  "browser","window","document","element","attribute","property","style","layout","render","animation",
  "interaction","event","listener","handler","callback","promise","async","await","thread","process",
  "command","script","function","variable","constant","array","object","string","number","boolean",
  "condition","loop","branch","scope","context","closure","module","package","library","framework",
  "dependency","version","commit","branch","merge","rebase","conflict","repository","clone","push",
  "pull","fetch","origin","remote","local","build","deploy","release","container","image",
  "volume","service","endpoint","route","controller","model","view","template","static","dynamic",
  "request","response","session","cookie","token","authentication","authorization","encryption","security","privacy",
  "attack","defense","firewall","certificate","signature","hash","checksum","integrity","availability","confidentiality",
  "backup","recovery","failure","monitoring","logging","alert","dashboard","metric","threshold","incident",
  "diagnosis","treatment","therapy","patient","disease","cancer","leukemia","tumor","mutation","variant",
  "allele","chromosome","expression","regulation","transcription","translation","replication","division","differentiation","development",
  "immunity","inflammation","infection","virus","bacteria","parasite","antibody","antigen","vaccine","response",
  "signal","receptor","ligand","pathogen","host","tissue","organ","system","homeostasis","metabolism",
  "nutrition","energy","oxygen","carbon","nitrogen","water","ion","channel","membrane","transport",
  "diffusion","osmosis","gradient","potential","charge","field","force","mass","velocity","acceleration",
  "momentum","energy","power","pressure","temperature","entropy","equilibrium","reaction","catalyst","substrate",
  "compound","element","molecule","atom","bond","structure","crystal","solution","mixture","concentration"
];

// =====================================================
// DOM ELEMENTS (match current HTML ids)
// =====================================================
const textContainer   = document.getElementById("text-container");

const topicSelect     = document.getElementById("topics");
const levelSelect     = document.getElementById("levels");
const countdownInput  = document.getElementById("countdown");

const timeLeftEl      = document.getElementById("time-left");
const tryAgainBtn     = document.getElementById("try-again");

const finalStatsBox   = document.getElementById("final-stats");

// Final stats fields
const statCorrectChars  = document.getElementById("stat-correct-chars");
const statTotalChars    = document.getElementById("stat-total-chars");
const statCorrectWords  = document.getElementById("stat-correct-words");
const statFinalErrors   = document.getElementById("stat-final-errors");
const statTotalErrors   = document.getElementById("stat-total-errors");
const statAccuracy      = document.getElementById("stat-accuracy");
const statFinalScore    = document.getElementById("stat-final-score");

// =====================================================
// STATE (game variables)
// =====================================================
let longText = "";              // generated text (string)
let typedText = "";             // what user typed so far (string)

let errorsAtEnd = 0;            // errors visible at the end (after corrections)
let totalErrorsCommitted = 0;   // cumulative errors (never decreases)
let typingStarted = false;

let timeLeft = countdownInput.value; 
let timerInterval = null;


// =====================================================
// FUNCTIONS
// =====================================================

// shiffle the words
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// combining words into a long string
function generateLongText() {
    const shuffled = shuffleArray([...words]);
    return shuffled.join(" ");
}

// initialize the test
function initTest() {
    longText = generateLongText();
    typedText = "";

    errorsAtEnd = 0;
    totalErrorsCommitted = 0;
    typingStarted = false;

    timeLeft = Number(countdownInput.value);
    timeLeftEl.textContent = timeLeft;

    textContainer.style.display = "flex";
    textContainer.textContent = longText;
    textContainer.scrollLeft = 0;

    finalStatsBox.style.display = "none";
    tryAgainBtn.style.display = "none";

    clearInterval(timerInterval);
}

// reset the test
function resetTest() {
    initTest();
}

// starting the timer
function startTimer() {
    if (typingStarted) return;

    typingStarted = true;

    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftEl.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endTest();
        }
    }, 1000);
}

// updating text display & handling errors
function updateTextDisplay() {
    textContainer.innerHTML = "";

    let currentErrors = 0;

    for (let i = 0; i < longText.length; i++) {
        const span = document.createElement("span");
        const expectedChar = longText[i];
        const typedChar = typedText[i];

        if (typedChar !== undefined) {
            if (typedChar === expectedChar) {
                span.classList.add("correct");
            } else {
                span.classList.add("error");
                currentErrors++;
            }
        }

        span.textContent = expectedChar;
        textContainer.appendChild(span);
    }

    // errors visible at this moment
    errorsAtEnd = currentErrors;

    handleScroll();
}

// handle the scroll
function handleScroll() {
    const visibleOffset = 30;
    const charWidth = 13;

    if (typedText.length > visibleOffset) {
        textContainer.scrollLeft =
            (typedText.length - visibleOffset) * charWidth;
    }
}

// get the correct character
function getCorrectCharacters() {
    let correct = 0;

    for (let i = 0; i < typedText.length; i++) {
        if (typedText[i] === longText[i]) {
            correct++;
        }
    }

    return correct;
}

// get total character typed
function getTotalCharactersTyped() {
    return typedText.length;
}

// get correct words typed
function getCorrectWords() {
    const typedWords = typedText.trim().split(/\s+/);
    const referenceWords = longText.split(" ");

    let correctWords = 0;

    for (let i = 0; i < typedWords.length; i++) {
        if (typedWords[i] === referenceWords[i]) {
            correctWords++;
        }
    }

    return correctWords;
}

// get accuracy score
function getAccuracy() {
    const total = getTotalCharactersTyped();
    if (total === 0) return 0;

    const correct = getCorrectCharacters();
    const err = totalErrorsCommitted;
    return Math.round(((correct - err) / total) * 100);
}

// get the final score
function getFinalScore() {
    const correctChars = getCorrectCharacters();
    const accuracy = getAccuracy() / 100;

    return Math.round(correctChars * accuracy / countdownInput.value * 60);
}




// ending the test
function endTest() {
    textContainer.style.display = "none";
    finalStatsBox.style.display = "flex";
    tryAgainBtn.style.display = "block";

    const correctChars = getCorrectCharacters();
    const totalChars = getTotalCharactersTyped();
    const correctWords = getCorrectWords();
    const accuracy = getAccuracy();
    const finalScore = getFinalScore();

    statCorrectChars.textContent = correctChars;
    statTotalChars.textContent = totalChars;
    statCorrectWords.textContent = correctWords;
    statFinalErrors.textContent = errorsAtEnd;
    statTotalErrors.textContent = totalErrorsCommitted;
    statAccuracy.textContent = `${accuracy}%`;
    statFinalScore.textContent = finalScore;
}





// =============================
// THE APP -- Event listeners
// =============================

initTest();

document.addEventListener("keydown", (e) => {
    if (timeLeft <= 0) return;

    // Ignore typing when focus is on input/select
    if (["INPUT", "SELECT"].includes(document.activeElement.tagName)) {
        return;
    }
    
    // Ignore digits
    if (/^\d$/.test(e.key)) return;
    
    // Ignore special keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    startTimer();
    
    if (e.key === "Backspace") {
        if (typedText.length > 0) {
            typedText = typedText.slice(0, -1);
        }
    } 
    else if (e.key.length === 1) {
        typedText += e.key;

        const index = typedText.length - 1;
        if (e.key !== longText[index]) {
            totalErrorsCommitted++;   
        }
    }

    updateTextDisplay();
});


// event listener on the inputs
countdownInput.addEventListener("input", () => {
    if (typingStarted) return;

    let value = Number(countdownInput.value);

    if (isNaN(value)) return;

    timeLeft = value;
    timeLeftEl.textContent = timeLeft;
});



tryAgainBtn.addEventListener("click", resetTest);



const comingSoonMessage =
    "This feature is not available yet.\nIt will be added in a future update.";


topicSelect.addEventListener("change", () => {
    alert(comingSoonMessage);
    
    // reset to default (optional but recommended)
    topicSelect.value = "everydays_life";
});

levelSelect.addEventListener("change", () => {
    alert(comingSoonMessage);

    // reset to default
    levelSelect.value = "easy";
});


