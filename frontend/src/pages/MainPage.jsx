import { useState } from "react";
import "./MainPage.css";
import NavBar from "../components/navbar/NavBar.jsx";
import JoinMatch from "../components/join-match/JoinMatch.jsx";
import CreateMatch from "../components/create-match/CreateMatch.jsx";
import LeaderBoard from "../components/leader-board/LeaderBoard.jsx";
import AboutUs from "../components/about-us/AboutUs.jsx";
import LoginModal from "../components/login/LoginModal.jsx";
import RegisterModal from "../components/register/RegisterModal.jsx";
import { useAuth } from "../utils/authContext.jsx";
function MainPage() {
  // Get auth state from context
  const { isUserLoggedIn, userInfo, logOutFirebase, loadUserInfo, loadLeaderboardInfo, serverStatus } = useAuth();
  
  // Modals for login and Register
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <>
      <NavBar
        userInfo={userInfo}
        logOut={logOutFirebase}
        isUserLoggedIn={isUserLoggedIn}
        serverStatus={serverStatus}
        onLoginClick={() => {
          setShowLoginModal(true);
          setShowRegisterModal(false);
        }}
        onRegisterClick={() => {
          setShowRegisterModal(true);
          setShowLoginModal(false);
        }}
      />
      {showLoginModal && (
        <LoginModal  show={showLoginModal}     onClose={() => setShowLoginModal(false)} />
      )}
      {showRegisterModal && (
        <RegisterModal show={showRegisterModal}    
          onClose={() => setShowRegisterModal(false)} 
          onUserInfoUpdated={loadUserInfo}
        />
      )}
      <div className="container">
        <div className="topSection">
          <JoinMatch />
          <CreateMatch/>
        </div>
        <div className="bottomSection">
          <LeaderBoard 
          loadLeaderboardInfo={loadLeaderboardInfo}
          isUserLoggedIn={isUserLoggedIn}
          ></LeaderBoard>
          <AboutUs></AboutUs>
        </div>
      </div>
    </>
  );
}

export default MainPage;