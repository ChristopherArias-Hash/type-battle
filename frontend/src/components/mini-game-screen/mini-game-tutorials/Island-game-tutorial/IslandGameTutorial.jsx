import "./IslandGameTutorial.css";
import islandGameGif from "../../../../images/tutorial-gameplay/islandgame-tutorial.gif";
import { useEffect, useRef } from "react";

function IslandGameTutorial() {
  const buttonRefs = useRef({});

  const controls = [
    { id: "up", description: "MOVE UP", key: "W" },
    { id: "down", description: "MOVE DOWN", key: "S" },
    { id: "left", description: "MOVE LEFT", key: "A" },
    { id: "right", description: "MOVE RIGHT", key: "D" },
  ];

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Find matching control
      const control = controls.find(
        (c) =>
          event.code === `Key${c.key}` ||
          event.key.toLowerCase() === c.key.toLowerCase(),
      );

      if (control && buttonRefs.current[control.id]) {
        const button = buttonRefs.current[control.id];
        button.classList.add("active");
        button.click();
        event.preventDefault();

        setTimeout(() => {
          if (button) {
            button.classList.remove("active");
          }
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="island-tutorial-container">
      <div className="island-game-left-bar">
        <h2 className="island-game-play-heading">How to play</h2>

        <h3 className="island-game-setting-heading">Controls</h3>
        {controls.map((control) => (
          <div key={control.id} className="island-game-controls">
            <p className="island-game-control-description">
              {control.description}
            </p>
            <button
              ref={(el) => (buttonRefs.current[control.id] = el)}
              onClick={() => {}}
              className="island-game-control-button"
            >
              <span className="island-game-letter-enter">{control.key}</span>
            </button>
          </div>
        ))}

        <h3 className="island-game-setting-heading">Instructions</h3>
        <p>1 point per second alive</p>
        <p>no points gained if dead</p>
      </div>
      <div className="island-game-right-bar">
        <h2 className="island-game-play-heading">Gameplay</h2>

        <img
          src={islandGameGif}
          alt="Crossy Road Tutorial"
          className="island-game-tutorial-image"
        />
      </div>
    </div>
  );
}

export default IslandGameTutorial;
