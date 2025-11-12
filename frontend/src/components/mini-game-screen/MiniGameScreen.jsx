import "./MiniGameScreen.css";
import Stacker from "../mini-games/stacker/Stacker";
import CrossyRoad from "../mini-games/crossy-road/CrossyRoad";
import IslandGame from "../mini-games/island-game/IslandGame";

//Mini Games
const GAME_COMPONENTS = {
  1: CrossyRoad,
  2: CrossyRoad,
  3: CrossyRoad,
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
        {miniGameStartSignal && (
          <div className="mini-game-screen-header">
            {/* Left sidebar with player scores */}
            <div className="mini-game-screen-player-section">
              <h2>Players</h2>
              <ul className="mini-game-screen-player-list">
                {miniGamePlayers.map((p, index) => (
                  <li key={index} className="mini-game-screen-player-list-item">
                    <p className="mini-game-screen-player-name">
                      {p.user.displayName}
                    </p>
                    <p className="mini-game-screen-player-score">{p.score}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Game area with timer */}
            <div className="mini-game-screen-game-area">
              <div className="mini-game-screen-timer-container">
                <div className="mini-game-screen-timer">
                  <svg className="timer-circle" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36"></circle>
                  </svg>
                  <span>{miniGameTimer}</span>
                </div>
              </div>

              {/* Game component */}
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
        )}

        {/* Show game when not started */}
        {!miniGameStartSignal && CurrentGame && (
          <CurrentGame
            miniGamePlayers={miniGamePlayers}
            lastMiniGameMessage={lastMiniGameMessage}
            miniGameId={miniGameId}
            miniGameStartSignal={miniGameStartSignal}
            miniGameTimer={miniGameTimer}
          />
        )}
      </div>
    </div>
  );
}

export default MiniGameScreen;