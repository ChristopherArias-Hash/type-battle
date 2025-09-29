import "./MiniGameScreen.css";
import Stacker from "../mini-games/stacker/Stacker"
import CrossyRoad from "../mini-games/crossy-road/CrossyRoad"

const GAME_COMPONENTS = {
  1: CrossyRoad,
  2: CrossyRoad
}

function MiniGameScreen ({miniGamePlayers, miniGameId, miniGameTimer, miniGame, miniGameStartSignal }){
  const CurrentGame = GAME_COMPONENTS[miniGame]
  return(
    <div className="mini-game-overlay">
        <div className="mini-game-container">
          <p>test: {miniGameTimer}</p>
          <ul>{miniGamePlayers.map((p, index) => (
            <li key={index}>
              {p.user.displayName} score: {p.score}
            </li>
          ))}</ul>
          {CurrentGame ? <CurrentGame miniGamePlayers={miniGamePlayers}
           miniGameId={miniGameId} miniGameStartSignal={miniGameStartSignal}/> : <div>Loading yo</div> }
       
        </div>
      </div>
  );
}

export default MiniGameScreen