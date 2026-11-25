// =====================================================
// DOM ELEMENTS (match current HTML ids)
// =====================================================
const textContainer   = document.getElementById("text-container");

const topicSelect     = document.getElementById("topics");
const levelSelect     = document.getElementById("levels");
const countdownInput  = document.getElementById("countdown");

const timeLeftEl      = document.getElementById("time-left");
const tryAgainBtn     = document.getElementById("try-again");

const resultsBox      = document.getElementById("results");

// Best scores (end-of-test box + pop-up with every topic)
const bestTopicEl     = document.getElementById("best-topic");
const bestListEl      = document.getElementById("best-list");
const statsBtn        = document.getElementById("stats-btn");
const statsDialog     = document.getElementById("stats-dialog");
const statsCloseBtn   = document.getElementById("stats-close");
const statsGrid       = document.getElementById("stats-grid");

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
// Each file holds one list per level, keyed by the level <option> values:
// { "easy": [...], "medium": [...], "hard": [...] }
// To add a topic: add the JSON file + an <option> with the same value.
const WORDS_DIR = "words";
const MIX_TOPIC = "mix";            // <option> value of "Mixture of all"
const MIX_WORDS_PER_TOPIC = 10;     // words taken from each topic for the mix
const MIN_TEXT_LENGTH = 2400;       // chars: enough for 120s at ~200 WPM

let topicWords = null;              // { topicId: { levelId: [words] } }, null until loaded

// Best scores are kept in this browser's localStorage:
// { topicId: { levelId: { score, accuracy, duration, date } } }
const BEST_SCORES_KEY = "typing-test-best-scores";


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
    const levels = [...levelSelect.options].map(option => option.value);

    const entries = await Promise.all(ids.map(async id => {
        const file = `${WORDS_DIR}/${id}.json`;
        const response = await fetch(file);
        if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);

        const data = await response.json();

        const lists = levels.map(level => {
            if (!Array.isArray(data[level])) throw new Error(`${file} has no "${level}" list`);

            // tolerate hand-edited files: trim, drop empties and duplicates
            const words = [...new Set(data[level].map(w => String(w).trim()).filter(Boolean))];
            if (words.length === 0) throw new Error(`${file}: "${level}" list is empty`);

            return [level, words];
        });

        return [id, Object.fromEntries(lists)];
    }));

    return Object.fromEntries(entries);
}

// one shuffled batch of words for the selected topic and level
function pickWords() {
    const level = levelSelect.value;

    if (topicSelect.value === MIX_TOPIC) {
        return Object.values(topicWords).flatMap(levels =>
            shuffleArray([...levels[level]]).slice(0, MIX_WORDS_PER_TOPIC));
    }
    return shuffleArray([...topicWords[topicSelect.value][level]]);
}

// combining words into a long string: topic lists are short (~50-60 words),
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
    levelSelect.disabled = false;

    timeLeft = testDuration;
    timeLeftEl.textContent = timeLeft;

    textContainer.style.display = "flex";
    textContainer.scrollLeft = 0;
    updateTextDisplay(); // draws the text with the cursor on the first character

    resultsBox.style.display = "none";
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

    // lock the timer, topic and level for the rest of the test
    countdownInput.disabled = true;
    topicSelect.disabled = true;
    levelSelect.disabled = true;

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
    const fragment = document.createDocumentFragment();
    let currentErrors = 0;
    let cursor = null;

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
        } else if (i === typedText.length) {
            // next character to type: the pulsing cursor sits under it,
            // so it's clear whether you're on a space or a word's first letter
            span.classList.add("current");
            cursor = span;
        }

        span.textContent = expectedChar;
        fragment.appendChild(span);
    }

    textContainer.replaceChildren(fragment);

    // errors visible at this moment
    errorsAtEnd = currentErrors;

    handleScroll(cursor);
}

// keep the cursor about 40% into the box (no scrolling at the start)
function handleScroll(cursor) {
    if (!cursor) return;

    textContainer.scrollLeft = Math.max(0, cursor.offsetLeft - textContainer.clientWidth * 0.4);
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

// get correct words typed: words of the text fully typed with every
// character right, checked position by position like the green/red colors
function getCorrectWords() {
    let correctWords = 0;
    let start = 0;

    for (const word of longText.split(" ")) {
        const end = start + word.length;
        if (end > typedText.length) break;

        if (typedText.slice(start, end) === word) {
            correctWords++;
        }
        start = end + 1; // skip the space
    }

    return correctWords;
}

// get accuracy: share of keystrokes that weren't mistakes.
// A mistake you corrected costs 1, a mistake still there at the end costs 2
// (it's in the total errors committed AND in the errors at the end).
function getAccuracy() {
    if (totalKeystrokes === 0) return 0;

    const penalty = totalErrorsCommitted + errorsAtEnd;
    return Math.max(0, Math.round((totalKeystrokes - penalty) / totalKeystrokes * 100));
}

// get the final score
function getFinalScore() {
    const correctChars = getCorrectCharacters();
    const accuracy = getAccuracy() / 100;

    return Math.round(correctChars * accuracy / testDuration * 60);
}




// =====================================================
// BEST SCORES (saved in this browser)
// =====================================================

// storage can be blocked (private mode, disabled site data): the game
// still works, it just can't remember scores
function loadBestScores() {
    try {
        const saved = JSON.parse(localStorage.getItem(BEST_SCORES_KEY));
        return saved && typeof saved === "object" ? saved : {};
    } catch {
        return {};
    }
}

// keep the result if it beats the saved one; returns true for a new best
function saveBestScore(topic, level, result) {
    if (result.score <= 0) return false;

    const best = loadBestScores();
    const previous = best[topic]?.[level];
    if (previous && previous.score >= result.score) return false;

    best[topic] = { ...best[topic], [level]: result };
    try {
        localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(best));
    } catch {
        // not saved, but still a new best for this visit
    }
    return true;
}

// display name of an <option> ("biology" -> "Biology")
function optionLabel(select, value) {
    return [...select.options].find(option => option.value === value)?.textContent.trim() ?? value;
}

// one "Easy ...... 245" row; detail = accuracy and timer of that run
function bestScoreRow(levelName, record, { current = false, isNew = false } = {}) {
    const row = document.createElement("div");
    row.className = "best-row" + (current ? " is-current" : "");

    const name = document.createElement("span");
    name.className = "best-level";
    name.textContent = levelName;

    const value = document.createElement("span");
    value.className = "best-value";

    const score = document.createElement("span");
    score.className = "best-score" + (record ? "" : " empty");
    score.textContent = record ? record.score : "—";
    value.append(score);

    if (record) {
        const detail = document.createElement("span");
        detail.className = "best-detail";
        detail.textContent = `${record.accuracy}% · ${record.duration}s`;
        value.append(detail);
    }

    if (isNew) {
        const badge = document.createElement("span");
        badge.className = "new-best";
        badge.textContent = "New best!";
        name.append(badge);
    }

    row.append(name, value);
    return row;
}

// end-of-test box: the 3 levels of the topic just played
function renderBestBox(topic, level, isNewBest) {
    const best = loadBestScores()[topic] ?? {};

    bestTopicEl.textContent = optionLabel(topicSelect, topic);
    bestListEl.replaceChildren(...[...levelSelect.options].map(option =>
        bestScoreRow(option.textContent.trim(), best[option.value], {
            current: option.value === level,
            isNew: isNewBest && option.value === level,
        })));
}

// pop-up: one card per topic, each with its 3 levels
function renderStatsDialog() {
    const best = loadBestScores();

    statsGrid.replaceChildren(...[...topicSelect.options].map(topicOption => {
        const card = document.createElement("section");
        card.className = "topic-card";

        const title = document.createElement("h3");
        title.textContent = topicOption.textContent.trim();
        card.append(title);

        for (const levelOption of levelSelect.options) {
            card.append(bestScoreRow(levelOption.textContent.trim(),
                best[topicOption.value]?.[levelOption.value]));
        }
        return card;
    }));
}


// ending the test
function endTest() {
    textContainer.style.display = "none";
    resultsBox.style.display = "flex";
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

    const topic = topicSelect.value;
    const level = levelSelect.value;
    const isNewBest = saveBestScore(topic, level, {
        score: finalScore,
        accuracy,
        duration: testDuration,
        date: new Date().toISOString(),
    });
    renderBestBox(topic, level, isNewBest);

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
    if (!topicWords || timeLeft <= 0 || statsDialog.open) return;

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

// best scores pop-up (Esc, the × button or a click outside closes it)
statsBtn.addEventListener("click", () => {
    renderStatsDialog();
    statsDialog.showModal();
});

statsCloseBtn.addEventListener("click", () => statsDialog.close());

// focus returns to the button on close: drop it, otherwise the next Space
// typed in the test would also "click" the button and reopen the pop-up
statsDialog.addEventListener("close", () => statsBtn.blur());

// light dismiss for browsers without <dialog closedby="any"> (Safari)
if (!("closedBy" in HTMLDialogElement.prototype)) {
    statsDialog.addEventListener("click", (event) => {
        if (event.target !== statsDialog) return;

        const rect = statsDialog.getBoundingClientRect();
        const inside = rect.top <= event.clientY && event.clientY <= rect.bottom &&
                       rect.left <= event.clientX && event.clientX <= rect.right;
        if (!inside) statsDialog.close();
    });
}

// new topic / level -> new text. Leave the dropdown afterwards so typing starts
// the test right away (keys are ignored while a select / input has focus).
for (const select of [topicSelect, levelSelect]) {
    select.addEventListener("change", () => {
        if (typingStarted || !topicWords) return;

        initTest();
        select.blur();
    });
}


