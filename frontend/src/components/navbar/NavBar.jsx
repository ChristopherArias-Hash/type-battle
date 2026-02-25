import "./NavBar.css"
import defaultProfilePicture from "../../images/profile/Default_pfp.svg";
function NavBar({onLoginClick, onRegisterClick, isUserLoggedIn, logOut, userInfo, serverStatus, disableLogout}) {
    return(
        <>
            <ul className="nav-bar">
                {/* Left side content */}
                <div className="nav-left">
                    <li className="nav-item pull-left">
                        <h1 className="home-button">
                            <a href="/">TYPE BATTLE</a>
                        </h1>
                    </li>
                    <li className="nav-item pull-left">
                        <p>Beta 1.0</p>
                    </li>
                </div>

                {/* Right side content */}
                <div className="nav-right">
                    {isUserLoggedIn ? (
                        <div className="user-card">
                            <img src={userInfo.getProfilePicture || defaultProfilePicture} alt="Profile picture" />
                            <div className="user-info">
                                <div className="user-name">{userInfo.getDisplayName}</div>
                                <div className="user-stats">
                                    WPM: {userInfo.getHighestWpmInfo} Games: {userInfo.getGamesPlayedInfo} Wins: {userInfo.getWinsInfo}
                                </div>
                            </div>
                            {!disableLogout && (
                                <button className="logout-btn" onClick={logOut}>
                                    Log out
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="auth-links">
                            <a href="#" onClick={(e) => { e.preventDefault(); onLoginClick(); }}>
                                Login
                            </a>
                            <a href="#" onClick={(e) => {e.preventDefault(); onRegisterClick()}}>
                                Register
                            </a>
                        </div>
                    )}
                </div>
            </ul>
        </>
    )
}

export default NavBar;