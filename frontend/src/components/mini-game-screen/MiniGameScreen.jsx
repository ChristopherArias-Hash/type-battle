import "./MiniGameScreen.css";
import Stacker from "../mini-games/stacker/Stacker"
function miniGameScreen ({miniGamePlayers, miniGameId}){
  return(
    <div className="mini-game-overlay">
        <div className="mini-game-container">
          <Stacker miniGamePlayers={miniGamePlayers}
           miniGameId={miniGameId}/>
       
        </div>
      </div>
  );
}

export default miniGameScreen