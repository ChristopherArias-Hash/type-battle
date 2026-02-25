import "./CreateMatch.css";
import { createGame } from "../../../utils/authHelpers";
import { useNavigate } from "react-router-dom";

function CreateMatch({ playClickSound }) {
  const navigate = useNavigate();

  const handleCreate = async () => {
    playClickSound();
    try {
      const lobbyCode = await createGame();
      navigate(`/game/${lobbyCode}`);
    } catch (_err) {
      alert("Must be logged in");
    }
  };
  return (
    <>
      <div className="input-container-2">
        <h2>Create match</h2>
        <button className="keycap-enter" onClick={() => handleCreate()}>
          <span className="letter-enter">Confirm</span>
        </button>
      </div>
    </>
  );
}

export default CreateMatch;
