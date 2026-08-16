interface Flashcard {
  question: string;
  answer: string;
}

interface QuizQuestion {
  question: string;
  difficulty: string;
  correct: string;
  options: string[];
}

interface HistoryEntry {
  topic: string;
  score: number;
  total: number;
  date: string;
}

async function generateFlashcards(notes: string): Promise<Flashcard[]> {
  const prompt = `Convert the following study notes into 5 flashcards.
Return ONLY valid JSON in this exact format, nothing else:
[{"question": "...", "answer": "..."}]
Notes: ${notes}`;

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  const flashcards = JSON.parse(rawText) as Flashcard[];
  return flashcards;
}

const notesInput = document.getElementById("notesInput") as HTMLTextAreaElement;
const generateBtn = document.getElementById("generateBtn") as HTMLButtonElement;
const loadingMsg = document.getElementById("loadingMsg") as HTMLParagraphElement;
const errorMsg = document.getElementById("errorMsg") as HTMLParagraphElement;
const cardContainer = document.getElementById("cardContainer") as HTMLElement;
const quizSection = document.getElementById("quizSection") as HTMLElement;
const generateQuizBtn = document.getElementById("generateQuizBtn") as HTMLButtonElement;
const modeBtn = document.querySelector("#theme") as HTMLButtonElement;
const historyContainer = document.getElementById("historyContainer") as HTMLElement;
const historyPanel = document.getElementById("history") as HTMLElement;
const historyCloseBtn = document.getElementById("historyCloseBtn") as HTMLButtonElement;

const historyToggleBtn = document.createElement("button");
historyToggleBtn.id = "historyToggleBtn";
historyToggleBtn.textContent = "📚 History";
modeBtn.insertAdjacentElement("beforebegin", historyToggleBtn);

historyToggleBtn.addEventListener("click", () => {
  historyPanel.classList.toggle("open");
});

historyCloseBtn.addEventListener("click", () => {
  historyPanel.classList.remove("open");
});

let currentQuestionIndex = 0;
let score = 0;
let currentQuestions: QuizQuestion[] = [];

function renderFlashcards(cards: Flashcard[]) {
  cardContainer.innerHTML = "";

  for (const card of cards) {
    const welcomeMsg = document.getElementById("welcomeMsg");
    welcomeMsg?.remove();
    const cardDiv = document.createElement("div");
    cardDiv.className = "flashcard";
    cardDiv.innerHTML = `
      <div class="flashcard-inner">
        <div class="flashcard-front"><p>${card.question}</p></div>
        <div class="flashcard-back"><p>${card.answer}</p></div>
      </div>
    `;
    cardDiv.addEventListener("click", () => {
      cardDiv.classList.toggle("flipped");
    });
    cardContainer.appendChild(cardDiv);
  }

  quizSection.style.display = "block";
}

generateBtn.addEventListener("click", async function () {
  if (notesInput.value.trim() === "") {
    errorMsg.textContent = "Please enter some text first!";
    errorMsg.style.display = "block";
    return;
  }

  errorMsg.style.display = "none";
  loadingMsg.style.display = "block";
  generateBtn.disabled = true;

  try {
    const flashcards = await generateFlashcards(notesInput.value);
    renderFlashcards(flashcards);
    localStorage.setItem("flashcards", JSON.stringify(flashcards));
  } catch (err) {
    console.error("Flashcard generation failed:", err);
    errorMsg.textContent = "Something went wrong generating flashcards. Please try again.";
    errorMsg.style.display = "block";
  } finally {
    loadingMsg.style.display = "none";
    generateBtn.disabled = false;
  }
});

modeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  const isLight = document.body.classList.contains("light-mode");
  modeBtn.textContent = isLight ? "☀️ Light Mode" : "🌙 Dark Mode";
});

function resetQuizSection() {
  quizSection.innerHTML = `
    <div id="progressBar"><div id="progressFill"></div></div>
    <p id="questionCounter"></p>
    <div id="quizContainer"></div>
    <p id="quizError" style="display:none; color:#ff5050;">Please select an answer first.</p>
  `;
}

async function generateQuiz(notes: string): Promise<QuizQuestion[]> {
  const prompt = `Generate 5 multiple choice questions from the following notes.
Return ONLY valid JSON in this exact format, nothing else:
[
{
 "question" :"...",
 "options":["option A", "option B", "option C", "option D"],
    "correct": "option A",
    "difficulty": "Easy"
  }
    ]
Difficulty must be exactly "Easy", "Medium", or "Hard".
The correct answer must be one of the 4 options exactly as written.
Notes:${notes}`;

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  console.log("Raw quiz response:", rawText);
  const questions = JSON.parse(rawText) as QuizQuestion[];
  return questions;
}

function renderQuiz(questions: QuizQuestion[]) {
  currentQuestions = questions;
  currentQuestionIndex = 0;
  score = 0;
  resetQuizSection();
  quizSection.style.display = "block";
  showQuestion();
}

generateQuizBtn.addEventListener("click", async function () {
  if (notesInput.value.trim() === "") {
    errorMsg.textContent = "Please enter some text first!";
    errorMsg.style.display = "block";
    return;
  }

  errorMsg.style.display = "none";
  loadingMsg.style.display = "block";
  generateQuizBtn.disabled = true;
  generateBtn.disabled = true;

  try {
    const questions = await generateQuiz(notesInput.value);
    console.log("Quiz questions:", questions);
    localStorage.setItem("quizQuestions", JSON.stringify(questions));
    renderQuiz(questions);
  } catch (err) {
    console.error("Quiz generation failed:", err);
    errorMsg.textContent = "Something went wrong generating the quiz. Please try again.";
    errorMsg.style.display = "block";
  } finally {
    loadingMsg.style.display = "none";
    generateQuizBtn.disabled = false;
    generateBtn.disabled = false;
  }
});

function showQuestion() {
  const question = currentQuestions[currentQuestionIndex];
  const total = currentQuestions.length;
  const progressFill = document.getElementById("progressFill") as HTMLElement;
  progressFill.style.width = `${(currentQuestionIndex / total) * 100}%`;
  const questionCounter = document.getElementById("questionCounter") as HTMLElement;
  questionCounter.textContent = `Question ${currentQuestionIndex + 1}/${total}`;

  const difficultyEmoji =
    question.difficulty === "Easy" ? "⭐ Easy" :
    question.difficulty === "Medium" ? "⚡ Medium" : "🔥 Hard";

  const difficultyClass =
    question.difficulty === "Easy" ? "difficulty-easy" :
    question.difficulty === "Medium" ? "difficulty-medium" : "difficulty-hard";

  const quizContainer = document.getElementById("quizContainer") as HTMLElement;
  quizContainer.innerHTML = `
  <div class="quiz-card">
  <span class="difficulty-badge ${difficultyClass}">${difficultyEmoji}</span>
      <p class="quiz-question-text">${question.question}</p>
      <ul class="options-list">
        ${question.options.map((option) => `
          <li>
            <label class="option-label">
              <input type="radio" name="quizOption" value="${option}" />
              ${option}
            </label>
          </li>
        `).join("")}
      </ul>
      <button id="submitBtn">Submit Answer</button>
    </div>
  `;
  const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
  submitBtn.addEventListener("click", () => {
    const selected = document.querySelector('input[name="quizOption"]:checked') as HTMLInputElement;
    const quizError = document.getElementById("quizError") as HTMLElement;

    if (!selected) {
      quizError.style.display = "block";
      return;
    }
    quizError.style.display = "none";

    const isCorrect = selected.value === question.correct;
    if (isCorrect) score++;
    submitBtn.disabled = true;
    const labels = document.querySelectorAll(".option-label");
    labels.forEach((label) => {
      const input = label.querySelector("input") as HTMLInputElement;
      if (input.value === question.correct) {
        (label as HTMLElement).style.background = "rgba(57,255,20,0.2)";
        (label as HTMLElement).style.color = "#39ff14";
      } else if (input.value === selected.value && !isCorrect) {
        (label as HTMLElement).style.background = "rgba(255,80,80,0.2)";
        (label as HTMLElement).style.color = "#ff5050";
      }
    });

    const nextBtn = document.createElement("button");
    nextBtn.textContent = currentQuestionIndex + 1 === total ? "See Results 🏆" : "Next Question →";
    nextBtn.style.marginTop = "12px";
    nextBtn.addEventListener("click", () => {
      currentQuestionIndex++;
      if (currentQuestionIndex < total) {
        showQuestion();
      } else {
        showResult();
      }
    });
    quizContainer.appendChild(nextBtn);
  });
}

function saveHistoryEntry() {
  const entry: HistoryEntry = {
    topic: notesInput.value.slice(0, 50),
    score: score,
    total: currentQuestions.length,
    date: new Date().toLocaleDateString()
  };

  const existing = JSON.parse(localStorage.getItem("quizHistory") || "[]") as HistoryEntry[];
  existing.push(entry);
  localStorage.setItem("quizHistory", JSON.stringify(existing));
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("quizHistory") || "[]") as HistoryEntry[];

  if (history.length === 0) {
    historyContainer.innerHTML = `<p>No quiz history yet.</p>`;
    return;
  }
  historyContainer.innerHTML = history
    .slice()
    .reverse()
    .map((entry, reversedIndex) => {
      const realIndex = history.length - 1 - reversedIndex;
      return `
        <div class="history-entry" data-index="${realIndex}">
          <div class="history-topic">${entry.topic}</div>
          <div class="history-meta">
            <span class="history-score">${entry.score}/${entry.total}</span>
            <span class="history-date">${entry.date}</span>
            <button class="history-delete-btn" data-index="${realIndex}">✕</button>
          </div>
        </div>
      `;
    })
    .join("");

  const deleteButtons = historyContainer.querySelectorAll(".history-delete-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number((btn as HTMLElement).dataset.index);
      deleteHistoryEntry(index);
    });
  });
}

function deleteHistoryEntry(index: number) {
  const history = JSON.parse(localStorage.getItem("quizHistory") || "[]") as HistoryEntry[];
  history.splice(index, 1);
  localStorage.setItem("quizHistory", JSON.stringify(history));
  renderHistory();
}

function showResult() {
  const total = currentQuestions.length;
  const message =
    score === 5 ? "Perfect Score! 🌟" :
    score === 4 ? "Excellent! 🎉" :
    score === 3 ? "Good job! 👍" :
    score === 2 ? "Keep practicing! 💪" :
    score === 1 ? "Better than none! 😅" : "Don't give up! 📚";

  saveHistoryEntry();
  renderHistory();

  quizSection.innerHTML = `
    <div style="text-align:center; padding: 40px 20px;">
      <div style="font-size: 60px;">🏆</div>
      <h2>Quiz Complete!</h2>
      <p style="font-size: 24px; color: #aa3bff;">${score} out of ${total} Correct</p>
      <p style="font-size: 20px; margin-top: 8px;">${message}</p>
      <button id="tryAgainBtn" style="margin-top: 24px;">Try Again 🔄</button>
    </div>
  `;
  document.getElementById("tryAgainBtn")?.addEventListener("click", () => {
    resetQuizSection();
    quizSection.style.display = "block";
  });
}

resetQuizSection();
renderHistory();