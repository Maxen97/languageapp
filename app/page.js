"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";

// List of CSV files and their public paths
const CSV_FILES = [
  { name: "nouns", file: "/data/nouns.csv" },
  { name: "verbs", file: "/data/verbs.csv" },
  { name: "pronouns", file: "/data/pronouns.csv" },
];

// A simple CSV parser that assumes each line contains two comma‐separated values.
function parseCSV(text) {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  return lines.map((line) => {
    const [spanish, english] = line.split(",").map((item) => item.trim());
    return { spanish, english, key: `${spanish}|${english}` };
  });
}

export default function Home() {
  // Pre-select both files by default.
  const [selectedFiles, setSelectedFiles] = useState({ nouns: true, verbs: true, pronouns: true });
  // Store parsed CSV data per file.
  const [wordData, setWordData] = useState({});
  // Mode: "spanishToEnglish" (default) or "englishToSpanish"
  const [mode, setMode] = useState("spanishToEnglish");
  // The current word object { spanish, english, key }
  const [currentWord, setCurrentWord] = useState(null);
  // User’s answer
  const [userAnswer, setUserAnswer] = useState("");
  // Feedback message
  const [feedback, setFeedback] = useState("");

  // New states for hint behavior:
  const [wrongGuessCount, setWrongGuessCount] = useState(0);
  const [hintActive, setHintActive] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);

  // Load CSV data when a file is toggled on and its data isn’t loaded.
  useEffect(() => {
    CSV_FILES.forEach(({ name, file }) => {
      if (selectedFiles[name] && !wordData[name]) {
        fetch(file)
          .then((res) => res.text())
          .then((text) => {
            const words = parseCSV(text);
            setWordData((prev) => ({ ...prev, [name]: words }));
          })
          .catch((err) => console.error("Error loading", file, err));
      }
    });
  }, [selectedFiles, wordData]);

  // Helper: Get all words from files that are currently toggled on.
  const getAllWords = () => {
    return Object.keys(wordData).reduce((acc, key) => {
      if (selectedFiles[key]) {
        return acc.concat(wordData[key]);
      }
      return acc;
    }, []);
  };

  // Pick a random word from the valid (selected) words.
  const pickRandomWord = () => {
    const allWords = getAllWords();
    if (allWords.length === 0) {
      setCurrentWord(null);
      return;
    }
    const randomIndex = Math.floor(Math.random() * allWords.length);
    setCurrentWord(allWords[randomIndex]);
    // Reset input and hint states when moving to a new word.
    setUserAnswer("");
    setFeedback("");
    setWrongGuessCount(0);
    setHintActive(false);
  };

  // When the selected files or word data change, update the current word.
  useEffect(() => {
    const allWords = getAllWords();
    if (allWords.length === 0) {
      setCurrentWord(null);
      return;
    }
    if (!currentWord || !allWords.find((word) => word.key === currentWord.key)) {
      pickRandomWord();
    }
  }, [selectedFiles, wordData]);

  // Toggle a CSV file on or off.
  const handleFileToggle = (name) => {
    setSelectedFiles((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Toggle the mode between Spanish→English and English→Spanish.
  const handleModeToggle = () => {
    setMode((prev) =>
      prev === "spanishToEnglish" ? "englishToSpanish" : "spanishToEnglish"
    );
  };

  // Check the user's answer.
  const checkAnswer = () => {
    if (!currentWord) return;

    const answerString =
      mode === "spanishToEnglish"
        ? currentWord.english.toLowerCase()
        : currentWord.spanish.toLowerCase();

    // Split the answer on "/" to allow for multiple alternative answers.
    const acceptableAnswers = answerString.split("/").map((ans) => ans.trim());
    const userInput = userAnswer.trim().toLowerCase();

    if (acceptableAnswers.includes(userInput)) {
      setFeedback("Correct!");
      setWrongGuessCount(0);
      setHintActive(false);
      setIsShiftHeld(false);
      pickRandomWord();
    } else {
      if (!hintActive) {
        if (wrongGuessCount + 1 >= 3) {
          setHintActive(true);
          setWrongGuessCount(3);
        } else {
          setWrongGuessCount(wrongGuessCount + 1);
        }
      } else {
        setHintActive(false);
        setWrongGuessCount(0);
      }
      setFeedback("");
      setIsShiftHeld(false);
    }
  };

  // Compute the placeholder text.
  const computedPlaceholder =
    (isShiftHeld || hintActive) && currentWord
      ? mode === "spanishToEnglish"
        ? currentWord.english
        : currentWord.spanish
      : "Type your answer...";

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Language Learning App</h1>

      <div className={styles.settings}>
        <h2>Word types</h2>
        <div className={styles.tokenContainer}>
          {CSV_FILES.map(({ name }) => (
            <button
              key={name}
              onClick={() => handleFileToggle(name)}
              className={`${styles.token} ${selectedFiles[name] ? styles.activeToken : ""}`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* <div className={styles.toggle}>
          <label>
            <input
              type="checkbox"
              checked={mode === "englishToSpanish"}
              onChange={handleModeToggle}
            />
            {mode === "spanishToEnglish"
              ? "Show Spanish, answer in English"
              : "Show English, answer in Spanish"}
          </label>
        </div> */}
      </div>

      {currentWord && (
        <div className={styles.quiz}>
          <p className={styles.prompt}>
            {mode === "spanishToEnglish" ? currentWord.spanish : currentWord.english}
          </p>

          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                checkAnswer();
              }
              // Detect left shift key down.
              if (e.code === "ShiftLeft") {
                setIsShiftHeld(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.code === "ShiftLeft") {
                setIsShiftHeld(false);
              }
            }}
            className={styles.answerInput}
            placeholder={computedPlaceholder}
          />

          <button onClick={checkAnswer} className={styles.guessButton}>
            Guess
          </button>

          {feedback && <p className={styles.feedback}>{feedback}</p>}
        </div>
      )}
    </div>
  );
}
