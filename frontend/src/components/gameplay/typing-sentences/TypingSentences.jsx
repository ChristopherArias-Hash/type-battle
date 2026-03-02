import "./TypingSentences.css";
import { sendCorrectStrokesOptimized } from "../../../websocket";
import { useState, useEffect, useRef } from "react";

function TypingSentences({ paragraphText, sessionId, timer, isPaused }) {
  const pendingStrokesRef = useRef(0);
  const [strokes, setStrokes] = useState("");
  const [correctStrokes, setCorrectStrokes] = useState(0);
  const [inputStatus, setInputStatus] = useState([]);
  const [letters, setLetters] = useState(0);
  const [restored, setRestored] = useState(false);

  //RESTORE once the paragraph is available (or session changes)
  useEffect(() => {
    if (!paragraphText) return;

    const saved = sessionStorage.getItem(`typing-progress-${sessionId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setStrokes(data.strokes ?? "");
        setCorrectStrokes(data.correctStrokes ?? 0);
        setLetters(data.letters ?? 0);
        setInputStatus(data.inputStatus ?? []);
      } catch (_e) {}
    }
    setRestored(true);
  }, [paragraphText, sessionId]);

  //SAVE after we’ve attempted restore
  useEffect(() => {
    if (!restored) return;
    const dataToStore = { strokes, correctStrokes, letters, inputStatus };
    sessionStorage.setItem(
      `typing-progress-${sessionId}`,
      JSON.stringify(dataToStore),
    );
  }, [strokes, correctStrokes, letters, inputStatus, sessionId, restored]);

  //Batch-send correct strokes (comment said 100ms; code was 800ms — pick one and keep it consistent)
  useEffect(() => {
    const interval = setInterval(() => {
      const strokesToSend = pendingStrokesRef.current;
      if (strokesToSend > 0) {
        sendCorrectStrokesOptimized(sessionId, strokesToSend);
        pendingStrokesRef.current = 0;
      }
    }, 800);
    return () => clearInterval(interval);
  }, [sessionId]);

  //handling keystrokes
  useEffect(() => {
    if (isPaused) return; // When game paused disable main game
    const handleKeyDown = (event) => {
      const key = event.key;

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
        // Note: event.key uses "ArrowLeft/ArrowRight" casing
        (event.altKey && (key === "ArrowLeft" || key === "ArrowRight"));

      if (!approvedLetters.includes(key) || isDisruptiveCombo) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      setStrokes((prev) => prev + key);
      checkIfStrokesCorrect(key);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [letters, inputStatus, correctStrokes, isPaused]);

  const approvedLetters = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    ",",
    " ",
    ".",
    "-",
  ];

  // Render helpers
  const currentSentence = paragraphText
    ? paragraphText.split(" ")
    : ["Loading..."];
  const flatLetters = paragraphText ? paragraphText.split("") : ["Loading..."];

  const checkIfStrokesCorrect = (newStroke) => {
    const newStatus = [...inputStatus];

    if (flatLetters[letters] === newStroke) {
      newStatus[letters] = "correct";
      if (newStroke !== " ") {
        setCorrectStrokes((prev) => prev + 1);
        pendingStrokesRef.current += 1;
      }
    } else {
      newStatus[letters] = "incorrect";
    }

    setInputStatus(newStatus);
    setLetters((prev) => prev + 1);
  };

  //Creates <word> <letters> per word and letters to easily control css
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
              className={`letter ${status ?? ""} ${isCurrent ? "current" : ""}`}
            >
              {letter}
            </span>
          );
        })}

        {/* explicit space between words */}
        {i < currentSentence.length - 1 &&
          (() => {
            const spaceIndex = getFlatIndex(i, wordLetters.length);
            const spaceStatus = inputStatus[spaceIndex];
            const spaceIsCurrent = spaceIndex === letters;

            return (
              <span
                key={`space-${i}`}
                className={`letter space ${spaceStatus ?? ""} ${
                  spaceIsCurrent ? "current" : ""
                }`}
              >
                {" "}
              </span>
            );
          })()}
      </div>
    );
  });

  function getFlatIndex(wordIndex, letterIndex) {
    let count = 0;
    for (let w = 0; w < wordIndex; w++) {
      count += currentSentence[w].length + 1; // +1 for space between words
    }
    return count + letterIndex;
  }

  return (
    <>
      <div className="typing-area">
        <div className="timer-display">
          <h2>
            Time Remaining: <b className="time-display-digits">{timer}</b>
          </h2>
        </div>
        <div className="ghost-text">{listOfSentence}</div>
      </div>
      <h3>Score: {correctStrokes}</h3>
    </>
  );
}

export default TypingSentences;
