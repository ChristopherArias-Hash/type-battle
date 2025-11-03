import "./MiniGameScreen.css";
import Stacker from "../mini-games/stacker/Stacker";
import CrossyRoad from "../mini-games/crossy-road/CrossyRoad";
import IslandGame from "../mini-games/island-game/IslandGame";

//Mini Games
const GAME_COMPONENTS = {
  1: Stacker,
  2: Stacker,
  3: Stacker,
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
        {miniGameStartSignal && (
          <>
            <div className="mini-game-screen-timer-container">
              <div className="mini-game-screen-timer">
                <svg className="timer-circle" viewBox="0 0 70 70">
                  <circle cx="35" cy="35" r="32"></circle>
                </svg>
                <span>{miniGameTimer}</span>
              </div>
            </div>
            <ul>
              {miniGamePlayers.map((p, index) => (
                <li key={index} className="mini-game-screen-player-section">
                  <p className="mini-game-screen-player-name">
                    {p.user.displayName}
                  </p>
                  <p className="mini-game-screen-player-score">{p.score}</p>
                </li>
              ))}
            </ul>
          </>
        )}

        {/*If current game, go to mini game, else game loading*/}
        {CurrentGame ? (
          <CurrentGame
            miniGamePlayers={miniGamePlayers}
            lastMiniGameMessage={lastMiniGameMessage}
            miniGameId={miniGameId}
            miniGameStartSignal={miniGameStartSignal}
            miniGameTimer={miniGameTimer}
          />
        ) : (
          <div>Loading yo</div>
        )}
      </div>
    </div>
  );
}

export default MiniGameScreen;
