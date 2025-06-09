import "./NavBar.css"

function NavBar({onLoginClick, onRegisterClick}) {
    return(
        <>
        <ul className="nav-bar">
            <li className="nav-item pull-left"><h1>TYPE BATTLE</h1></li>
            <li className="nav-item pull-right"><img src="https://hourglassmc.com/wp-content/uploads/2016/10/mystery-man.png"/></li>
            <li className="nav-item pull-right"><a href="#" onClick={(e) => { e.preventDefault(); onLoginClick(); }}>
                Login
            </a></li>
            <li className="nav-item pull-right"><a href= "#" onClick={(e) => {e.preventDefault(); onRegisterClick()}}>Register</a></li>
            <li className="nav-item pull-right"><a href = "https://www.atom.com/">WPMA</a></li>
            <li className="nav-item pull-right"><a href = "https://www.atom.com/">AVG</a></li>
            <li className="nav-item pull-right"><a href = "https://www.atom.com/">WINS</a></li>
        </ul>
        </>
    )
}

export default NavBar;