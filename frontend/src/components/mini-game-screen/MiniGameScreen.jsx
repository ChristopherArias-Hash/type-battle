import "./MiniGameScreen.css";
import Stacker from "../mini-games/stacker/Stacker"
function miniGameScreen ({miniGamePlayers, miniGameId, miniGameTimer}){
  return(
    <div className="mini-game-overlay">
        <div className="mini-game-container">
          <p>test: {miniGameTimer}</p>
          <Stacker miniGamePlayers={miniGamePlayers}
           miniGameId={miniGameId}/>
       
        </div>
      </div>
  );
}

export default miniGameScreen