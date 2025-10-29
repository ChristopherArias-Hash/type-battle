import "./StackerTutorial.css";
function StackerTutorial() {
  return (
    <div className="stacker-tutorial-container">
      <div className="left-bar">
        <h2 className="play-heading">How to play</h2>

        <h3>Controls:</h3>
        <button className="control-button">Spacebar</button>
        <p className="control-description">Press to drop the block</p>
       <h3>Instructions:</h3>
        <p>1 point per correct cube placement</p>
        <p>2 points per perfect cube placement</p>
        <p>Miss the stack and you localStorage!</p>
      </div>
      <div className="right-bar">
        <img
          src="https://placehold.co/350x600/png"
          alt="Stacker Tutorial Image"
          className="tutorial-image"
        />
        
      </div>
    </div>
  );
}

export default StackerTutorial;
