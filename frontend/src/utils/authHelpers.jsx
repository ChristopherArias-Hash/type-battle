import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";

export async function handleLogin(email, password) {
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
}

export async function handleRegister(email, password, username, file) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    if (email !== "" && password !== "" && username !== "") {
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
    }

    alert("Registration successful!");
  } catch (error) {
    console.error("Registration error:", error.message);
    alert("Failed to register.");
    throw error; // re-throw so calling code (like registerAndLogin) knows
  }
}
