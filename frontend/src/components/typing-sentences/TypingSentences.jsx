import "./TypingSentences.css";
import { useState, useEffect } from "react";
function TypingSentences({paragraphText}) {

  const [strokes, setStrokes] = useState("");  //Your keystrokes
  const [correctStrokes, setCorrectStrokes] = useState(0); //Compares your key strokes with the letter list, keeps count on bottom
  const [inputStatus, setInputStatus] = useState([]); //Sets letter status to incorrect or correct. 
  const [letters, setLetters] = useState(0); //Used to track letter array
  
  //Bans non typing letters to be used on website 
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

    // Track keystroke
    setStrokes((prev) => prev + key);
    checkIfStrokesCorrect(key);
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}, [letters, inputStatus, correctStrokes]); // Add all dependencies used inside the effect


const approvedLetters = [
  "a","b","c","d","e","f","g","h","i","j","k","l",
  "m","n","o","p","q","r","s","t","u","v","w","x","y","z",
  ","," ","." // include space and any punctuation you use
];


  const currentSentence = paragraphText ? paragraphText.split(" ") : ["Loading..."];; //Entire paragraph as a word array
  const flatLetters = paragraphText ? paragraphText.split("") : ["Loading..."]; // entire paragraph as letter array

  //Checks if your strokes match the sentence letters, also sets Status for letters.
  const checkIfStrokesCorrect = (newStroke) => {
    let newStatus = [...inputStatus];
    if (flatLetters[letters] === newStroke) {
      newStatus[letters] = "correct";
      if (newStroke !== " ") {
        setCorrectStrokes(correctStrokes + 1);
      }
    } else {
      newStatus[letters] = "incorrect";
    }
    setInputStatus(newStatus);
    setLetters(letters + 1);
  };
  
  //Uses double forloop to create sentences, then inside create span tags with each letter. 
  const listOfSentence = currentSentence.map((word, i) => {
    const wordLetters = word.split("");
    
    return (
      <div key={`word-${i}`} className="word">
        {wordLetters.map((letter, j) => {
          // Get the flat index of this letter in the full sentence
          const flatIndex = getFlatIndex(i, j);
          const status = inputStatus[flatIndex]; // "correct" or "incorrect"
          const isCurrent = flatIndex === letters;
            
          return (
            <span
                key={`letter-${i}-${j}`}
                className={`letter ${status ?? ""} ${isCurrent ? "current" : ""} ${letter === " " ? "space" : ""}`} // apply class if status exists
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
      count += currentSentence[w].length + 1; // +1 for the space
    }
    return count + letterIndex;
  }

  return (
    <>
      <div className="typing-area">
        <div className="ghost-text">{listOfSentence}</div>
       
      </div>
      <h3>{correctStrokes}</h3>
    </>
  );
}

export default TypingSentences;
