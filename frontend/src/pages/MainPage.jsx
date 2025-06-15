import { useEffect, useState } from "react";
import { auth } from "../firebase";
import {onAuthStateChanged, signOut } from "firebase/auth";

import "./MainPage.css";
import NavBar from "../components/navbar/NavBar.jsx";
import JoinMatch from "../components/join-match/JoinMatch.jsx";
import CreateMatch from "../components/create-match/CreateMatch.jsx";
import LeaderBoard from "../components/leader-board/LeaderBoard.jsx";
import AboutUs from "../components/about-us/AboutUs.jsx";
import LoginModal from "../components/login/LoginModal.jsx";
import RegisterModal from "../components/register/RegisterModal.jsx";
import axios from "axios";


function MainPage() {

  //Modals for login and Register
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  //Variables for user info in DB
  const [getWinsInfo, setWinsInfo] = useState(0)
  const [getGamesPlayedInfo, setGamesPlayedInfo] = useState(0)
  const [getHighestWpmInfo, setHighestWpmInfo] = useState(0)

  //Groups all info
  const userInfo = {
    getWinsInfo,
    getGamesPlayedInfo, 
    getHighestWpmInfo, 
  }

//Gets info and controls user login state
const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      setIsUserLoggedIn(true);
      const idToken = await user.getIdToken();
      const response = await axios.get("http://localhost:8080/protected/user", {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      console.log(response.data); // do something with user data
      const userDetails = response.data
      setWinsInfo(userDetails.gamesWon)
      setGamesPlayedInfo(userDetails.gamesPlayed)
      setHighestWpmInfo(userDetails.highestWpm)

    } else {
      setIsUserLoggedIn(false);
    }
  });
  return () => unsubscribe();
}, []);

//Logs out user ends session 
const logOutFirebase = async () =>{
    try{

    await signOut(auth)
    setIsUserLoggedIn(false);
    console.log("User signed out successfuly.")
      }catch (err){
        console.error("Error signing out", err)
      }
  }

  return (
    <>
      <NavBar
        userInfo ={userInfo}
        logOut={logOutFirebase}
        isUserLoggedIn={isUserLoggedIn}
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
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
      {showRegisterModal && (
        <RegisterModal onClose={() => setShowRegisterModal(false)} />
      )}
      <div className="container">
        <div className="topSection">
          <JoinMatch />
          <CreateMatch />
        </div>
        <div className="bottomSection">
          <LeaderBoard></LeaderBoard>
          <AboutUs></AboutUs>
        </div>
      </div>
    </>
  );
}

export default MainPage;
