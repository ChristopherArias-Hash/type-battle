import { createContext, useContext, useEffect, useState } from "react";
import { isServerUp } from "./authHelpers";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

//Contains all fuctions that require auth protection
export const AuthProvider = ({ children }) => {
  const [isUserVerified, setIsUserVerified] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isUserInDb, setIsUserInDb] = useState(false);
  const [serverStatus, setServerStatus] = useState(false);
  const [userInfo, setUserInfo] = useState({
    getWinsInfo: 0,
    getGamesPlayedInfo: 0,
    getHighestWpmInfo: 0,
    getDisplayName: "",
    getProfilePicture: null,
  });

  //Loading screens
  const [loading, setLoading] = useState(true);

  const loadServerStatus = async () => {
    if (!(await isServerUp())) {
      setServerStatus(false);
    } else {
      setServerStatus(true);
    }
  };
  //GET: User Info
  const loadUserInfo = async () => {
    const user = auth.currentUser;
    const verificationStatus = user.emailVerified;
    if (!user || !verificationStatus) return;

    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/protected/user`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const userDetails = response.data;

      if (!userDetails) {
        setIsUserInDb(false);
        return;
      }
      
      console.log("User details loaded:");
      setIsUserInDb(true);
      setUserInfo({
        getWinsInfo: userDetails.gamesWon,
        getGamesPlayedInfo: userDetails.gamesPlayed,
        getHighestWpmInfo: userDetails.highestWpm,
        getDisplayName: userDetails.displayName,
        getProfilePicture: userDetails.imageUrl,
      });
    } catch (error) {
         console.error("Failed to load user info:", error);
      setIsUserInDb(false);
    }
  };

  //GET: Leaderboard info
  const loadLeaderboardInfo = async () => {
    const user = auth.currentUser;
    const verificationStatus = user.emailVerified;

    if (!user || !verificationStatus || !isUserInDb) {
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/protected/leader-board`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const leaderboard = response.data;
      void leaderboard;
      return response;
    } catch (error) {}
  };

  //Firebase logout
  const logOutFirebase = async () => {
    try {
      await signOut(auth);
      setIsUserLoggedIn(false);
      setIsUserVerified(false);
      setIsUserInDb(false);
      setUserInfo({
        getWinsInfo: 0,
        getGamesPlayedInfo: 0,
        getHighestWpmInfo: 0,
        getDisplayName: "",
        getProfilePicture: null,
      });
    } catch (_err) {}
  };

  useEffect(() => {
    loadServerStatus();
  }, []);

  const verifyAuthEmailStatus = async () => {
    const user = auth.currentUser;
    if (user) {
      await user.reload();
      if (user.emailVerified) {
        setIsUserVerified(true);
        await loadUserInfo();
      } else {
        alert("Account is not verified. Please check your email for the verification link.");
        setIsUserVerified(false);
        setIsUserInDb(false);
      }
    }

    console.log(
      "Email verification status:",
      user ? user.emailVerified : "No user",
    );
  };
  //Keeps track if user is logged in or out.
  useEffect(() => {
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      // Instantly pause the UI while we process the login/logout
      setLoading(true);

      if (user) {
        setIsUserLoggedIn(true);

        //Force refresh from Firebase server
        await user.reload();

        if (user.emailVerified) {
          setIsUserInDb(false);
          setIsUserVerified(true);
          await loadUserInfo();
        } else {
          setIsUserVerified(false);
          setIsUserInDb(false);
        }
      } else {
        setIsUserLoggedIn(false);
        setIsUserVerified(false);
        setIsUserInDb(false);
        setUserInfo({
          getWinsInfo: 0,
          getGamesPlayedInfo: 0,
          getHighestWpmInfo: 0,
          getDisplayName: "",
          getProfilePicture: null,
        });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  //Used for exporting above functions
  const value = {
    isUserLoggedIn,
    userInfo,
    loadUserInfo,
    logOutFirebase,
    loading,
    loadLeaderboardInfo,
    serverStatus,
    isUserVerified,
    isUserInDb,
    verifyAuthEmailStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
