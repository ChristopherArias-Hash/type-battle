import "./JoinMatch.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { joinGameUsingCode } from "../../../utils/authHelpers";
function JoinMatch({ playClickSound }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  return (
    <>
      <div className="input-container">
        <h2>Enter code to join a match</h2>
        <input
          type="text"
          name="text"
          className="input"
          value={code}
          placeholder="ENTER CODE"
          onChange={(e) => setCode(e.target.value)}
        ></input>

        <button
          className="keycap-submit"
          onClick={() => {
            {
              (playClickSound(), joinGameUsingCode(code, navigate));
            }
          }}
        >
          <span className="letter-submit">Enter</span>
        </button>
      </div>
    </>
  );
}
export default JoinMatch;
