import "./JoinMatch.css"
import { useNavigate} from "react-router-dom"
import { useState } from "react";
import { joinGameUsingCode } from "../../utils/authHelpers";
function JoinMatch(){
const navigate = useNavigate();    
const [code, setCode] = useState("")
    

  return(
        <>
        <div className = "input-container">
        <h2>Enter code to join a match</h2>
        <input type ="text"  name ="text" className ="input" value={code} placeholder="Enter code" onChange={(e)=> setCode(e.target.value)}></input>

        <button className = "keycap-submit" onClick={()=> joinGameUsingCode(code, navigate)}>
        <span className="letter-submit">Submit</span>
        </button>
        </div>
        </>
    )

}
export default JoinMatch
