import "./CreateMatch.css";
import { createGame } from "../../utils/authHelpers";
import { useNavigate } from "react-router-dom";

function CreateMatch() {
  const navigate = useNavigate();

  const handleCreate = async () => {
    try {
      const lobbyCode = await createGame();
      navigate(`/game/${lobbyCode}`);
    } catch (err) {
      console.error("Could not create game:", err);
      alert("Must be logged in")
    }
  };
  return (
    <>
      <div className="createForm">
        <h2>Create match</h2>
        <button onClick={() => handleCreate()}>Enter</button>
      </div>
    </>
  );
}

export default CreateMatch;
