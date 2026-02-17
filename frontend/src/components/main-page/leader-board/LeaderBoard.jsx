import "./LeaderBoard.css";

import { useState, useEffect } from "react";

function LeaderBoard({ loadLeaderboardInfo, isUserLoggedIn }) {
  const [listItems, setListItems] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await loadLeaderboardInfo(); // now works
        const data = response.data;
        const items = data.map((user, index) => (
          <li key={index}>
            {user.displayName}{" "}
            <b className="player-wins">
              WINS: <span className="player-wins-number">{user.gamesWon}</span>
            </b>
          </li>
        ));
        setListItems(items);
      } catch (error) {
        console.log(error, "not logged in leaderboard no avaible");
      }
    };

    fetchLeaderboard();
  }, [loadLeaderboardInfo, isUserLoggedIn]);

  return (
    <div className="leader-board">
      <h2>Leaderboard</h2>
      {isUserLoggedIn ? (
        <ol className="leader-board-list">{listItems}</ol>
      ) : (
        <p>Please login to see leaderboard</p>
      )}
    </div>
  );
}

export default LeaderBoard;
