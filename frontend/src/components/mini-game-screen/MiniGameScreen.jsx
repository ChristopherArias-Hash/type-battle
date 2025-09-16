import "./MiniGameScreen.css";
import Stacker from "../mini-games/stacker/Stacker"
function miniGameScreen ({players}){
  return(
    <div className="mini-game-overlay">
        <div className="mini-game-container">
          <Stacker players={players}/>
        </div>
      </div>
  );
}

export default miniGameScreen