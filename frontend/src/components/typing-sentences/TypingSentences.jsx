import "./TypingSentences.css";
import { sendCorrectStroke } from "../../websocket";
import { useState, useEffect } from "react";

function TypingSentences({ paragraphText, sessionId, timer }) {
  const [strokes, setStrokes] = useState("");
  const [correctStrokes, setCorrectStrokes] = useState(0);
  const [inputStatus, setInputStatus] = useState([]);
  const [letters, setLetters] = useState(0);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!paragraphText) return;

    const saved = sessionStorage.getItem(`typing-progress-${sessionId}`);
    if (saved) {
      const data = JSON.parse(saved);
      setStrokes(data.strokes || "");
      setCorrectStrokes(data.correctStrokes || 0);
      setLetters(data.letters || 0);
      setInputStatus(data.inputStatus || []);
      console.log("✅ Restored progress from sessionStorage:", data);
    }

    setRestored(true);
  }, [paragraphText, sessionId]);

  useEffect(() => {
    if (!restored) return;

    const dataToStore = {
      strokes,
      correctStrokes,
      letters,
      inputStatus,
    };

    sessionStorage.setItem(
      `typing-progress-${sessionId}`,
      JSON.stringify(dataToStore)
    );
  }, [strokes, correctStrokes, letters, inputStatus, sessionId, restored]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();

      const isDisruptiveCombo =
        ((event.ctrlKey || event.metaKey) &&
          (key === "a" ||
            key === "s" ||
            key === "p" ||
            key === "r" ||
            key === "w" ||
            key === "+" ||
            key === "-" ||
            key === "0" ||
            key === "i" ||
            key === "v" ||
            key === "z")) ||
        (event.altKey && (key === "arrowleft" || key === "arrowright"));

      if (!approvedLetters.includes(key) || isDisruptiveCombo) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      setStrokes((prev) => prev + key);
      checkIfStrokesCorrect(key);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [letters, inputStatus, correctStrokes]);

  const approvedLetters = [
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    ",", " ", ".",
  ];

  const currentSentence = paragraphText
    ? paragraphText.split(" ")
    : ["Loading..."];
  const flatLetters = paragraphText ? paragraphText.split("") : ["Loading..."];

  const checkIfStrokesCorrect = (newStroke) => {
    let newStatus = [...inputStatus];
    if (flatLetters[letters] === newStroke) {
      newStatus[letters] = "correct";
      if (newStroke !== " ") {
        setCorrectStrokes(correctStrokes + 1);
        sendCorrectStroke(sessionId);
      }
    } else {
      newStatus[letters] = "incorrect";
    }
    setInputStatus(newStatus);
    setLetters(letters + 1);
  };

  const listOfSentence = currentSentence.map((word, i) => {
    const wordLetters = word.split("");

    return (
      <div key={`word-${i}`} className="word">
        {wordLetters.map((letter, j) => {
          const flatIndex = getFlatIndex(i, j);
          const status = inputStatus[flatIndex];
          const isCurrent = flatIndex === letters;

          return (
            <span
              key={`letter-${i}-${j}`}
              className={`letter ${status ?? ""} ${
                isCurrent ? "current" : ""
              } ${letter === " " ? "space" : ""}`}
            >
              {letter === "" ? "_" : letter}
            </span>
          );
        })}
      </div>
    );
  });

  function getFlatIndex(wordIndex, letterIndex) {
    let count = 0;
    for (let w = 0; w < wordIndex; w++) {
      count += currentSentence[w].length + 1;
    }
    return count + letterIndex;
  }

  return (
    <>
      <div className="typing-area">
        <div className="timer-display">
          <h2>Time Remaining: {timer}s</h2>
        </div>
        <div className="ghost-text">{listOfSentence}</div>
      </div>
      <h3>Score: {correctStrokes}</h3>
    </>
  );
}

export default TypingSentences;