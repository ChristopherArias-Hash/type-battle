import "./NavBar.css"



function NavBar({onLoginClick, onRegisterClick, isUserLoggedIn, logOut, userInfo}) {
    return(
        <>
        <ul className="nav-bar">
            <li className="nav-item pull-left"><h1>TYPE BATTLE</h1></li>
            {isUserLoggedIn ?    
            <>
            <li className="nav-item pull-right"><img src={userInfo.getProfilePicture}/></li>
            <li className="nav-item pull-right">name: {userInfo.getDisplayName}</li>
            <li className="nav-item pull-right">WPM Max: {userInfo.getWinsInfo}</li>
            <li className="nav-item pull-right">Games Played: {userInfo.getGamesPlayedInfo}</li>
            <li className="nav-item pull-right">WINS: {userInfo.getWinsInfo}</li>
            <li className="nav-item pull-right"><button onClick={logOut}>Logout</button></li>
            </> : 
                    <>
            <li className="nav-item pull-right"><a href="#" onClick={(e) => { e.preventDefault(); onLoginClick(); }}>
                Login 
            </a></li> 
            <li className="nav-item pull-right"><a href= "#" onClick={(e) => {e.preventDefault(); onRegisterClick()}}>Register</a></li> </>} 
          
        </ul>
        </>
    )
}

export default NavBar;