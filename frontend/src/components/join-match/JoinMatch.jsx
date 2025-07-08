import "./JoinMatch.css"
import { useNavigate} from "react-router-dom"
import { useState } from "react";
import { joinGameUsingCode } from "../../utils/authHelpers";
function JoinMatch(){
const navigate = useNavigate();    
const [code, setCode] = useState("")
    

  return(
        <>
        <div className = "matchForm">
        <h2>Enter code to join a match</h2>
        <input value={code} placeholder="Enter code" onChange={(e)=> setCode(e.target.value)}></input>
        <button onClick={()=> joinGameUsingCode(code, navigate)}>Submit</button>
        </div>
        </>
    )

}
export default JoinMatch
