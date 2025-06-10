import "./NavBar.css"



function NavBar({onLoginClick, onRegisterClick, isUserLoggedIn, logOut}) {
    return(
        <>
        <ul className="nav-bar">
            <li className="nav-item pull-left"><h1>TYPE BATTLE</h1></li>
            <li className="nav-item pull-right"><img src="https://hourglassmc.com/wp-content/uploads/2016/10/mystery-man.png"/></li>
            {isUserLoggedIn ?    
            <>
            <li className="nav-item pull-right">WPMA: </li>
            <li className="nav-item pull-right">AVG:</li>
            <li className="nav-item pull-right">WINS:</li>
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