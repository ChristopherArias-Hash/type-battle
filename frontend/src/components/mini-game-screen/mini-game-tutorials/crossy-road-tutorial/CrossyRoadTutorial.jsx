import "./CrossyRoadTutorial.css";
import stackerGif from "../../../../images/stacker-tutorial.gif";
import { useEffect, useRef } from "react";

function CrossyRoadTutorial() {
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
        (c) => event.code === `Key${c.key}` || event.key.toLowerCase() === c.key.toLowerCase()
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
    <div className="crossyroad-tutorial-container">
      <div className="crossyroad-left-bar">
        <h2 className="crossyroad-play-heading">How to play</h2>

        <h3 className="crossyroad-setting-heading">Controls</h3>
        {controls.map((control) => (
          <div key={control.id} className="crossyroad-controls">
            <p className="crossyroad-control-description">{control.description}</p>
            <button
              ref={(el) => (buttonRefs.current[control.id] = el)}
              onClick={() => console.log(`${control.description} pressed`)}
              className="crossyroad-control-button"
            >
              <span className="letter-enter">{control.key}</span>
            </button>
          </div>
        ))}

        <h3 className="crossyroad-setting-heading">Instructions</h3>
        <p>1 point per cross</p>
        <p>-1 point per car hit</p>
      </div>
      <div className="crossyroad-right-bar">
        <h2 className="crossyroad-play-heading" >Gameplay</h2>
        <img
          src={stackerGif}
          alt="Crossy Road Tutorial"
          className="tutorial-image"
        />
      </div>
    </div>
  );
}

export default CrossyRoadTutorial;