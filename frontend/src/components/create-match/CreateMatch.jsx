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
      <div className="input-form2">
        <h2>Create match</h2>
        <button className ="keycap-enter" onClick={() => handleCreate()}>
        <span className="letter-enter">Enter</span>
        </button>
       
      </div>
    </>
  );
}

export default CreateMatch;
