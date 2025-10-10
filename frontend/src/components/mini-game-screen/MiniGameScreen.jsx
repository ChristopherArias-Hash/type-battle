import "./MiniGameScreen.css";
import Stacker from "../mini-games/stacker/Stacker";
import CrossyRoad from "../mini-games/crossy-road/CrossyRoad";
import IslandGame from "../mini-games/island-game/islandGame";

//Mini Games
const GAME_COMPONENTS = {
  1: IslandGame,
  2: IslandGame,
};

function MiniGameScreen({
  miniGamePlayers,
  lastMiniGameMessage,
  miniGameId,
  miniGameTimer,
  miniGame,
  miniGameStartSignal,
}) {
  const CurrentGame = GAME_COMPONENTS[miniGame];
  return (
    <div className="mini-game-overlay">
      <div className="mini-game-container">
        {/*List of players in lobby*/}
        <p>timer: {miniGameTimer}</p>
        <ul>
          {miniGamePlayers.map((p, index) => (
            <li key={index}>
              {p.user.displayName} score: {p.score}
            </li>
          ))}
        </ul>
        {/*If current game, go to mini game, else game loading*/}
        {CurrentGame ? (
          <CurrentGame
            miniGamePlayers={miniGamePlayers}
            lastMiniGameMessage={lastMiniGameMessage}
            miniGameId={miniGameId}
            miniGameStartSignal={miniGameStartSignal}
          />
        ) : (
          <div>Loading yo</div>
        )}
      </div>
    </div>
  );
}

export default MiniGameScreen;
