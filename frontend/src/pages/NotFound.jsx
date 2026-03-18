import "./NotFound.css"
import NavBar from "../components/navbar/NavBar"
import { useAuth } from "../utils/authContext"
function NotFound() {
    const { isUserLoggedIn, userInfo, logOutFirebase, isUserVerified, isUserInDb, loading} = useAuth();
    
    return (
        <>
        <NavBar
        loading={loading}
          userInfo={userInfo}
          isUserLoggedIn={isUserLoggedIn}
          logOut={logOutFirebase}
           isUserVerified={isUserVerified}
            isUserInDb={isUserInDb}
        />
        <div className ="error-container">
            <h1>404</h1>
            <p>This page does not exist please return to the <a href="/">homepage.</a></p>
        </div>
        </>
    )
}

export default NotFound