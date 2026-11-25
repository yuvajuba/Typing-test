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
let totalKeystrokes = 0;        // cumulative characters entered, incl. later deleted ones (never decreases)
let typingStarted = false;

// Timer limits (s). The HTML min/max only constrain the spinner arrows,
// so the script enforces them itself.
const MIN_DURATION = 15;
const MAX_DURATION = 120;
const DEFAULT_DURATION = 60;

let testDuration = DEFAULT_DURATION; // duration of the current test (s), fixed once typing starts
let timeLeft = DEFAULT_DURATION;
let timerInterval = null;

// Word lists: one JSON file per topic in words/, named after the <option>
// value in index.html (e.g. value="biology" -> words/biology.json).
// To add a topic: add the JSON file + an <option> with the same value.
const WORDS_DIR = "words";
const MIX_TOPIC = "mix";            // <option> value of "Mixture of all"
const MIX_WORDS_PER_TOPIC = 10;     // words taken from each topic for the mix
const MIN_TEXT_LENGTH = 2400;       // chars: enough for 120s at ~200 WPM

let topicWords = null;              // { topicId: [words] }, null until loaded


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

// load every topic's JSON word list (the topic <option>s act as the list of files)
async function loadTopics() {
    const ids = [...topicSelect.options]
        .map(option => option.value)
        .filter(id => id !== MIX_TOPIC);

    const entries = await Promise.all(ids.map(async id => {
        const response = await fetch(`${WORDS_DIR}/${id}.json`);
        if (!response.ok) throw new Error(`${WORDS_DIR}/${id}.json: HTTP ${response.status}`);

        const list = await response.json();
        // tolerate hand-edited files: trim, drop empties and duplicates
        const words = [...new Set(list.map(w => String(w).trim()).filter(Boolean))];
        if (words.length === 0) throw new Error(`${WORDS_DIR}/${id}.json has no words`);

        return [id, words];
    }));

    return Object.fromEntries(entries);
}

// one shuffled batch of words for the selected topic
function pickWords() {
    if (topicSelect.value === MIX_TOPIC) {
        return Object.values(topicWords).flatMap(list =>
            shuffleArray([...list]).slice(0, MIX_WORDS_PER_TOPIC));
    }
    return shuffleArray([...topicWords[topicSelect.value]]);
}

// combining words into a long string: topic lists are short (30-50 words),
// so keep adding freshly shuffled batches until the text is long enough
function generateLongText() {
    const text = [];
    let length = 0;

    while (length < MIN_TEXT_LENGTH) {
        const batch = shuffleArray(pickWords());

        // avoid the same word twice in a row where two batches meet
        if (batch.length > 1 && batch[0] === text[text.length - 1]) {
            batch.push(batch.shift());
        }

        for (const word of batch) {
            text.push(word);
            length += word.length + 1;
        }
    }

    return text.join(" ");
}

// read the timer input and bring it into the allowed range
// (empty / invalid -> default, out of range -> nearest limit)
function getValidDuration() {
    const value = Number(countdownInput.value);

    if (countdownInput.value.trim() === "" || !Number.isFinite(value)) {
        return DEFAULT_DURATION;
    }

    return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(value)));
}

// initialize the test
function initTest() {
    longText = generateLongText();
    typedText = "";

    errorsAtEnd = 0;
    totalErrorsCommitted = 0;
    totalKeystrokes = 0;
    typingStarted = false;

    testDuration = getValidDuration();
    countdownInput.value = testDuration;
    countdownInput.disabled = false;
    topicSelect.disabled = false;

    timeLeft = testDuration;
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

    // bring the new text back into view (we may be scrolled down to the results)
    textContainer.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
}

// starting the timer
function startTimer() {
    if (typingStarted) return;

    typingStarted = true;

    // lock the timer and topic for the rest of the test
    countdownInput.disabled = true;
    topicSelect.disabled = true;

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

// get accuracy score: share of all keystrokes that were right when typed.
// Each mistake counts exactly once, even if it was later corrected.
function getAccuracy() {
    if (totalKeystrokes === 0) return 0;

    const correctKeystrokes = totalKeystrokes - totalErrorsCommitted;
    return Math.round((correctKeystrokes / totalKeystrokes) * 100);
}

// get the final score
function getFinalScore() {
    const correctChars = getCorrectCharacters();
    const accuracy = getAccuracy() / 100;

    return Math.round(correctChars * accuracy / testDuration * 60);
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

    // make sure the results and the Try Again button are on screen,
    // and let Enter / Space restart right away
    tryAgainBtn.scrollIntoView({ behavior: scrollBehavior(), block: "end" });
    tryAgainBtn.focus({ preventScroll: true });
}

function scrollBehavior() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}





// =============================
// THE APP -- Event listeners
// =============================

textContainer.textContent = "Loading words…";

loadTopics()
    .then(loaded => {
        topicWords = loaded;
        initTest();
    })
    .catch(error => {
        console.error("Could not load the word lists:", error);
        textContainer.style.whiteSpace = "normal";
        textContainer.textContent = location.protocol === "file:"
            ? "Couldn't load the word lists: browsers block this when index.html is opened straight from the disk. Run it through a local server instead (e.g. VS Code \"Live Server\", or `npx serve` in the project folder)."
            : "Couldn't load the word lists. Please refresh the page.";
    });

document.addEventListener("keydown", (e) => {
    if (!topicWords || timeLeft <= 0) return;

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
        totalKeystrokes++;

        const index = typedText.length - 1;
        if (e.key !== longText[index]) {
            totalErrorsCommitted++;   
        }
    }

    updateTextDisplay();
});


// event listener on the inputs
// while typing in the box: preview the valid duration, but don't rewrite
// the box yet (typing "100" passes through "1", which would get clamped)
countdownInput.addEventListener("input", () => {
    if (typingStarted) return;

    testDuration = getValidDuration();
    timeLeft = testDuration;
    timeLeftEl.textContent = timeLeft;
});

// when the box loses focus / Enter is pressed: show the corrected value
countdownInput.addEventListener("change", () => {
    if (typingStarted) return;

    countdownInput.value = testDuration;
});



tryAgainBtn.addEventListener("click", resetTest);

// new topic -> new text. Leave the dropdown afterwards so typing starts the
// test right away (keys are ignored while a select / input has focus).
topicSelect.addEventListener("change", () => {
    if (typingStarted || !topicWords) return;

    initTest();
    topicSelect.blur();
});

// Levels other than "Easy" are disabled <option>s tagged "soon" in
// index.html until they're implemented.


