import "./StackerTutorial.css";
import stackerGif from "../../images/stacker-tutorial.gif";
function StackerTutorial() {
  return (
    <div className="stacker-tutorial-container">
      <div className="left-bar">
        <h2 className="play-heading">How to play</h2>

        <h3 className="setting-heading">Controls:</h3>
        <div className ="controls">
            <p className="control-description">DROP BLOCK</p>
           <button className="control-button">
              <span className="letter-enter">Spacebar</span>
        </button>
        </div>
       <h3 className="setting-heading">Instructions:</h3>
        <p>1 point per correct cube placement</p>
        <p>2 points per perfect cube placement</p>
        <p>Miss the stack and you reset!</p>
      </div>
      <div className="right-bar">
        <img
          src={stackerGif}
          alt="Stacker Tutorial Image"
          className="tutorial-image"
        />
        
      </div>
    </div>
  );
}

export default StackerTutorial;
