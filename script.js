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

const textContainer = document.getElementById('text-container');
const timeContainer = document.querySelector('#timer-container');
const tryAgainButton = document.querySelector('#try-again');
const finalScore = document.querySelector('#final-score');

let totalTyped = '';
let currentCharIndex = 0;
let errors = 0;
let longText = generateLongText();
let timeLeft = 60;
let timerInterval;
let typingStarted = false;


// ----------------------------------------------------- functions

// shuffle the words
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i+1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// combine shuffled words into a long string with spaces
function generateLongText() {
    const shuffledWords = shuffleArray([...words]);
    return shuffledWords.join(' ');
}

// starting a countdown timer
function startTimer() {
    if (!typingStarted) {
        typingStarted = true;
        timerInterval = setInterval(() => {
            timeLeft--;
            timeContainer.textContent = `Time left : ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endTest();
            }
        }, 1000) // every 1000ms (1s) execute what's inside
    }
}

// calculate the words-per-minute scores with error adjustment
function calculateWPM() {
    const wordsTyped = totalTyped.trim().split(/\s+/).length;
    const baseWPM = Math.round((wordsTyped / 60) * 60);
    const adjustedWPM = Math.max(baseWPM - errors, 0);
    return adjustedWPM;
}

// end the test and display final score
function endTest() {
    timeContainer.textContent = `Time's up!`;
    finalScore.textContent = `Final WPM: ${calculateWPM()}`;
    textContainer.style.display = 'none';
    tryAgainButton.style.display = 'block';
}

// Reset the test
function resetTest() {
    clearInterval(timerInterval);
    timeLeft = 60;
    timeContainer.textContent = `Time left : ${timeLeft}s`;
    finalScore.textContent = '';
    textContainer.style.display = 'block';
    tryAgainButton.style.display = 'none';
    totalTyped = '';
    typingStarted = false;
    currentCharIndex = 0;
    errors = 0;
    textContainer.scrollLeft = 0;
    longText = generateLongText();
    init();
}

// initialize the test 
function init() {
    if (isMobileDevise()) {
        showMobileMessage();
    } else {
        textContainer.innerText = longText;
        timeContainer.textContent = `Time left : ${timeLeft}s`;
    }
}

// start up
init();

// detect mobile users!
function isMobileDevise() {
    return /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 800;
}

// show message for mobile users
function showMobileMessage() {
    textContainer.textContent = 'This typing test is designed for desktop users only!';
}

// Event listeners 

// handle typing over a displayed text and scrolling
document.addEventListener("keydown", (e) => {
    
    startTimer(); // start the timer
    
    if (e.key === 'Backspace') {
        if (totalTyped.length > 0) {
            currentCharIndex = Math.max(currentCharIndex - 1, 0);
            totalTyped = totalTyped.slice(0, -1);
        }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        // just tracking letters without any other character
        totalTyped += e.key; 
        currentCharIndex ++;
    }

    const textArray = longText.split(''); // split into an array of 1 char
    textContainer.innerText = '';
    errors = 0;

    // looping through my new array of characters
    for (let i = 0; i < textArray.length; i++) {
        // create a span element (for coloring the strings)
        const span = document.createElement('span');

        if (i < totalTyped.length) {
            if (totalTyped[i] === textArray[i]) {
                span.classList.add('correct');
            } else {
                span.classList.add('error');
                errors++;
            }
        }

        span.textContent = textArray[i];
        textContainer.appendChild(span);
    }

    // adding a horizontal scroll when reaching a certain distance (30 character)
    if (totalTyped.length >= 30) {
        const scrollAmount = (totalTyped.length - 30) * 13;
        textContainer.scrollLeft = scrollAmount;
    }

    

});

// Try again button event listener
tryAgainButton.addEventListener('click', resetTest);


