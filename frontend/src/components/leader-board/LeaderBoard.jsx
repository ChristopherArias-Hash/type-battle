import "./LeaderBoard.css";

import { useState, useEffect } from "react";

function LeaderBoard({ loadLeaderboardInfo, isUserLoggedIn}) {
  const [listItems, setListItems] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try{
      const response = await loadLeaderboardInfo(); // now works
      const data = response.data; 
      const items = data.map((user, index) => (
        <li key={index}>{user.displayName} -- Wins: {user.gamesWon}</li>
      ));
      setListItems(items);
    }catch(error){
      console.log(error, "not logged in leaderboard no avaible")
    }
    };

    fetchLeaderboard();
  }, [loadLeaderboardInfo, isUserLoggedIn]);

  return (
    <div className="leader-board">
      <h2>Leaderboard</h2>
      {isUserLoggedIn ? <ul className="">{listItems}</ul> 
      :
      <ul>Please login to see leadboard</ul> 
      }
    </div>
  );
}

export default LeaderBoard;
