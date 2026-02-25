import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";

const invalidRegistrationInput = (email, password, username, file) => {
  if (!email || !password || !username) {
    alert("Please fill in all required fields.");
    return true;
  }

  if (email.split("").includes("@") === false) {
    alert("Email is not in proper format");
    return true;
  }

  if (username.length < 3 || username.length > 20) {
    alert("Username must be between 3 and 20 characters.");
    return true;
  }

  if (password.length < 6 || password.length > 20) {
    alert("Password must be between 6 and 20 characters.");
    return true;
  }

  if (email.length < 1 || email.length > 40) {
    alert("Email must be between 1 and 40 characters.");
    return true;
  }

  if (file && !isAllowedImageType(file)) {
    alert("Unsupported image format. ");
    return true;
  }

  return false;
};

const invalidLoginInput = (email, password) => {
  if (!email || !password) {
    alert("Please fill in all required fields.");
    return true;
  }

  if (email.split("").includes("@") === false) {
    alert("Email is not in proper format");
    return true;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return true;
  }

  return false;
};

const isAllowedImageType = (file) => {
  if (!file) return false;

  const validImageTypes = ["image/png", "image/jpg", "image/jpeg", "image/gif"];
  const fileType = file.type;

  return validImageTypes.includes(fileType);
};

export const isServerUp = async () => {
  try {
    const serverRespones = await axios.get(
      `${import.meta.env.VITE_BACKEND_URL}/ping`,
    );
    if (serverRespones.status) {
      return true;
    }
  } catch (_error) {
    alert("Server is down please try again later");
    return false;
  }
};

export async function handleLogin(email, password) {
  if (invalidLoginInput(email, password)) {
    return;
  }
  if (!(await isServerUp())) {
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const token = await userCredential.user.getIdToken();

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/protected/verify-token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Token verification failed");
    }

    return token;
  } catch (error) {
    signOut(auth);
    alert("User does not exist");
  }
}

export async function handleRegister(email, password, username, file) {
  if (invalidRegistrationInput(email, password, username, file)) {
    return false;
  }

  if (!(await isServerUp())) {
    return;
  }
  let firebaseUser = null;

  try {
    // Step 1: Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    firebaseUser = userCredential.user;
    const idToken = await firebaseUser.getIdToken();

    // Step 2: Backend user registration
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/protected/users`,
        {
          email,
          displayName: username,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );
    } catch (backendError) {
      void backendError;
      alert("Failed to register user in backend.");

      if (firebaseUser) {
        await deleteUser(firebaseUser);
      }

      return;
    }

    // Step 3: Profile image upload (if file is provided)
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/media/upload`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );
      } catch (uploadError) {
        void uploadError;
        alert("Image upload failed. Please try again.");

        if (firebaseUser) {
          await deleteUser(firebaseUser);
        }

        return;
      }
    }

    alert("Registration successful!");
    return true;
  } catch (_error) {
    alert("Failed to register with Firebase.");
    return;
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
      `${import.meta.env.VITE_BACKEND_URL}/protected/lobbies`,
      {}, // empty body
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return res.data.lobbyCode; // return the session ID from backend
  } catch (error) {
    throw error;
  }
}

export const joinGameUsingCode = async (code, navigate) => {
  if (code.length != 6) {
    alert("Code length must have a length of 6.");
    return;
  }
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/protected/game-session?lobbyCode=${code}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const lobbyData = response.data;

      if (lobbyData.lobbyCode == code) {
        navigate(`/game/${code}`);
      }
    } catch (_error) {
      alert("CODE IS NOT CORRECT");
    }
  } else {
    alert("USER NOT LOGGED IN");
  }
};
