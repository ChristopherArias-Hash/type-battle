import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import {useNavigate} from "react-router-dom"
import axios from "axios";


const isAllowedImageType  = (file) => {
  if(!file) return false;

  const validImageTypes = ["image/png", "image/jpg", "image/jpeg", "image/gif"]
  const fileType = file.type;

  return validImageTypes.includes(fileType);

  
}

const invalidRegistrationInput = (email, password, username, file) => {

  if (!email || !password || !username){
    alert("Please fill in all required fields.")
    return true;
  }

  if(email.split("").includes("@") === false){
     alert("Email is not in proper format")
     return true; 
  }

  if(password.length < 6){
    alert("Password must be at least 6 characters.")
    return true;
  }

  if (file && !isAllowedImageType(file)){
    alert("Unsupported image format. ");
    return true;
  }

  return false
}

const invalidLoginInput = (email, password) => {

  if (!email || !password ){
    alert("Please fill in all required fields.")
    return true;
  }

  if(email.split("").includes("@") === false){
     alert("Email is not in proper format")
     return true; 
  }

  if(password.length < 6){
    alert("Password must be at least 6 characters.")
    return true;
  }

  return false
}


export async function handleLogin(email, password) {
  if(invalidLoginInput(email, password)){
    return; 
  }
  try {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();

  const response = await fetch("http://localhost:8080/protected/verify-token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Token verification failed");
  }

  return token;
} catch (error){
  alert("User does not exist")
}

}

export async function handleRegister (email, password, username, file) {

  if (invalidRegistrationInput(email, password, username, file)){
    console.log("Bad Registration Input")
    return false;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
      await axios.post(
        "http://localhost:8080/protected/users",
        {
          email,
          displayName: username,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        await axios.post("http://localhost:8080/api/media/upload", formData, {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      alert("Registration successful!");
      return true;
   
  } catch (error) {
    console.error("Registration error:", error.message);
    alert("Failed to register.");
    throw error; 
  }

  
}

export async function createGame() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const token = await user.getIdToken();

  try {
    const res = await axios.post(
      "http://localhost:8080/protected/lobbies",
      {}, // empty body
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Lobby created:", res.data);
    return res.data.lobbyCode; // return the session ID from backend
  } catch (error) {
    console.error("Failed to create lobby:", error.response?.data || error.message);
    throw error;
  }
}

export const joinGameUsingCode = async (code, navigate) => {
       

     if(code.length != 6){
            alert("Code length must have a length of 6.")
            return;
        }
        const user = auth.currentUser
        if (user){
        try{
        const token = await user.getIdToken()
        const response = await axios.get(`http://localhost:8080/protected/game-session?lobbyCode=${code}`, {
                headers:{
                    Authorization: `Bearer ${token}`,
                }
            });

        const lobbyData = response.data
        
        if (lobbyData.lobbyCode == code){
            navigate(`/game/${code}`)

        }
        } catch(error){
            console.log("Error getting info", error)
            alert("CODE IS NOT CORRECT")
        }
    }else{
        alert("USER NOT LOGGED IN")
    }

}

