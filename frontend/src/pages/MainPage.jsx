import { useState, useEffect } from "react";
import useSound from "use-sound";

import clickSound from "../sounds/keyboard-press.wav";
import NavBar from "../components/navbar/NavBar.jsx";
import JoinMatch from "../components/main-page/join-match/JoinMatch.jsx";
import CreateMatch from "../components/main-page/create-match/CreateMatch.jsx";
import LeaderBoard from "../components/main-page/leader-board/LeaderBoard.jsx";
import AboutUs from "../components/main-page/about-us/AboutUs.jsx";
import LoginModal from "../components/main-page/login/LoginModal.jsx";
import RegisterModal from "../components/main-page/register/RegisterModal.jsx";
import { useAuth } from "../utils/authContext.jsx";
import "./MainPage.css";

function MainPage() {
  // Get auth state from context
  const {
    isUserLoggedIn,
    userInfo,
    logOutFirebase,
    loadUserInfo,
    loadLeaderboardInfo,
    serverStatus,
    isUserVerified,
    isUserInDb,
    verifyAuthEmailStatus,
    cancelRegistration,
  } = useAuth();

  // Modals for login and Register
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Sound
  const [playClickSound] = useSound(clickSound);

  useEffect(() => {
    
    //Check if user is in 2nd or 3rd stage, show modal if so
    if (isUserLoggedIn && (!isUserVerified || !isUserInDb)) {
      setShowRegisterModal(true);
    }
  }, [isUserLoggedIn, isUserVerified, isUserInDb]);

  return (
    <>
      <NavBar
        userInfo={userInfo}
        logOut={logOutFirebase}
        isUserLoggedIn={isUserLoggedIn}
        serverStatus={serverStatus}
        isUserVerified={isUserVerified}
        isUserInDb={isUserInDb}
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
        <LoginModal
          show={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      )}
      {showRegisterModal && (
        <RegisterModal
          show={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onUserInfoUpdated={loadUserInfo}
          isUserVerified={isUserVerified}
          isUserLoggedIn={isUserLoggedIn}
          isUserInDb={isUserInDb}
          verifyAuthEmailStatus={verifyAuthEmailStatus}
          logOutFirebase={logOutFirebase}
          cancelRegistration={cancelRegistration}
          setShowRegisterModal={setShowRegisterModal}
        />
      )}
      <div className="container">
        <div className="topSection">
          <JoinMatch playClickSound={playClickSound} />
          <CreateMatch playClickSound={playClickSound} />
        </div>
        <div className="bottomSection">
          <LeaderBoard
            loadLeaderboardInfo={loadLeaderboardInfo}
            isUserLoggedIn={isUserLoggedIn}
            isUserVerified={isUserVerified}
            isUserInDb={isUserInDb}
          ></LeaderBoard>
          <AboutUs></AboutUs>
        </div>
      </div>
    </>
  );
}

export default MainPage;
