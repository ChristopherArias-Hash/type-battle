import "./TypingSentences.css";
import { useState, useEffect } from "react";
function TypingSentences() {

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
  const typingSentences = [
    "Despite the stormy weather and the power flickering on and off, she remained focused on the task at hand, typing furiously as if her life depended on it, determined to finish the manuscript before midnight struck and the deadline passed, believing in her heart that this story, born from years of dreams and drafts, would finally be the one to change her life forever and make her name unforgettable.",

    "The scientist adjusted her goggles, carefully poured the glowing liquid into the flask, and watched with fascination as the mixture bubbled and hissed, knowing that this moment — this very experiment — could unlock a new understanding of the universe, change the trajectory of human knowledge, and potentially rewrite every physics book written in the last century, assuming it didn’t blow up in her face like the last one did.",

    "In the heart of the dense forest, surrounded by ancient trees and echoing bird calls, the explorer opened his leather-bound journal to jot down yet another discovery: a plant species unknown to science, thriving silently in the shade, its petals shimmering with colors he had never seen before, realizing that nature still held secrets waiting to be uncovered by those brave enough to leave the comforts of civilization behind.",

    "As the sun dipped below the horizon, casting brilliant streaks of orange and purple across the sky, the town's rooftops seemed to glow with a quiet kind of magic, and the smell of fresh bread from the old bakery filled the air, reminding her of childhood evenings spent chasing fireflies, laughing with friends, and wondering what life would be like beyond the hills they had never dared to climb together.",

    "He stared at the dusty piano in the attic, untouched for years, and slowly opened the lid with reverence, the keys yellowed with time but still holding stories, melodies once played during quiet nights and family gatherings, echoes of laughter and love trapped inside their chords, waiting for someone brave enough to play them again, to remember what was lost, and maybe — just maybe — bring it all back to life.",

    "The ship creaked beneath their feet as waves crashed against its hull, salt spray stinging their cheeks, the crew working in unison, ropes tightening and sails snapping in the wind, navigating through the treacherous waters toward the rumored island of gold, each of them driven by dreams of wealth, redemption, and freedom — unaware that something ancient and watchful waited beneath the surface for those who dared to disturb its rest.",

    "With a deep breath and trembling hands, she stepped onto the stage, blinded by the lights and deafened by her heartbeat, remembering every note, every lyric she had rehearsed a thousand times in her bedroom mirror, hoping her voice wouldn’t betray her now, that the audience would see not just a girl with a microphone, but a storyteller, a fighter, someone with something to say — someone finally ready to be heard.",

    "The streets bustled with life, vendors calling out their prices, children weaving through the crowds, and the scent of spices and roasted meats hanging in the air like a promise, as he wandered through the market square, overwhelmed by color and sound, reminded that every place held a different kind of rhythm, a new song to learn, and that the best parts of travel were the unexpected moments that left stories behind.",

    "Every morning, without fail, the old man sat on the same bench by the lake, feeding breadcrumbs to ducks and telling whoever would listen about the war, about lost friends and found love, his voice soft but full of conviction, as if the act of remembering kept them alive, as if every story passed down was a thread connecting the present to the past, reminding us not to forget where we come from.",

    "The robot blinked, its eyes flickering to life for the first time, scanning the room with a childlike curiosity, its programming incomplete but its potential limitless, as the engineers watched in awe, marveling at the birth of something that could change everything, usher in a new era of intelligence and empathy, or destroy it all if they weren’t careful — a reminder that progress always walks hand in hand with risk and responsibility.",
  ];
  const [sentencePicked] = useState(randomSentencePicker(typingSentences)); //Picks random paragraph to display
  const currentSentence = typingSentences[sentencePicked].split(" "); //Entire paragraph as a word array
    console.log(currentSentence)
  const flatLetters = typingSentences[sentencePicked].split(""); // entire paragraph as letter array

  //Uses math random function to pick random sentence from array
  function randomSentencePicker(sentences) {
    return Math.floor(Math.random() * sentences.length);
  }

  
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
