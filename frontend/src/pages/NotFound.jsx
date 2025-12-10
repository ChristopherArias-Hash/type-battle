import "./NotFound.css"
import NavBar from "../components/navbar/NavBar"
import { useAuth } from "../utils/authContext"
function NotFound() {
    const { isUserLoggedIn, userInfo, logOutFirebase, loading, loadUserInfo} = useAuth();
    
    return (
        <>
        <NavBar
          userInfo={userInfo}
          isUserLoggedIn={isUserLoggedIn}
          logOut={logOutFirebase}
        />
        <div className ="error-container">
            <h1>404</h1>
            <p>This page does not exist please return to the <a href="/">homepage.</a></p>
        </div>
        </>
    )
}

export default NotFound