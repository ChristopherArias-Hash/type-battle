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
    loading,
  } = useAuth();

  // Modals for login and Register
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Sound
  const [playClickSound] = useSound(clickSound);

  console.log("DB: " + isUserInDb)
  console.log("Verified: " + isUserVerified)
  console.log("Logged in: " + isUserLoggedIn)

 useEffect(() => {
    // If Firebase is still loading the user state or database info, do nothing.
    if (loading) return;
    
    // Once loading is complete, check if they need the register modal.
    if (isUserLoggedIn && (!isUserVerified || !isUserInDb)) {
      setShowRegisterModal(true);
    } else {
      // hide it just in case it was open
      setShowRegisterModal(false); 
    }
  }, [isUserLoggedIn, isUserVerified, isUserInDb, loading]); //

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
