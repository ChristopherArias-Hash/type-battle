import "./GamePlay.css"
import NavBar from "../components/navbar/NavBar"
import TypingSentences from "../components/typing-sentences/TypingSentences";
import { useAuth } from "../utils/authContext"

function GamePlay(){

    const {isUserLoggedIn, userInfo, logOutFirebase, loading} = useAuth();
    
    
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!isUserLoggedIn){
        return <Navigate to="/" replace />;
    }

    return(
        <>
        <NavBar 
        userInfo={userInfo}
        isUserLoggedIn={isUserLoggedIn}
        logOut={logOutFirebase}
        />
        <TypingSentences/>
        </>
    )
}

export default GamePlay