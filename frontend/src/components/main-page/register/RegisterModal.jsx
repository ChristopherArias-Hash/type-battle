import { useState } from "react";
import { auth } from "../../../firebase";
import {
  handleRegister,
  handleVerifiedRegister,
} from "../../../utils/authHelpers";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import "./RegisterModal.css";

function RegisterModal({
  onClose,
  show,
  onUserInfoUpdated,
  isUserVerified,
  isUserLoggedIn,
  isUserInDb,
  verifyAuthEmailStatus,
  logOutFirebase,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [file, setFilePath] = useState(null);

  let bodyContent, titleContent, footerContent;

  // Registration Stages
  const intialRegistrationStage = !isUserVerified && !isUserLoggedIn;
  const verifyRegistrationStage = !isUserVerified && isUserLoggedIn;
  const finalRegistrationStage =
    isUserVerified && isUserLoggedIn && !isUserInDb;

  // Determine current step for the progress indicator
  let currentStep = 1;
  if (verifyRegistrationStage) currentStep = 2;
  if (finalRegistrationStage) currentStep = 3;

  //------- MOVE LOGIC TO authHelpers.js? ---------//
  const cancelRegistration = async () => {
    try {
      const user = auth.currentUser;

      if (user && !isUserVerified) {
        const token = await user.getIdToken();

        // Tell the backend to execute the deletion
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/protected/cancel-registration`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          console.log("Backend successfully wiped the unverified user.");
        } else {
          console.error("Backend refused/failed to wipe user.");
        }
      }
    } catch (error) {
      console.error("Failed to execute cancelation:", error);
    } finally {
      //Always log out and close the modal
      logOutFirebase();
      onClose();
    }
  };

  const startRegistration = async () => {
    try {
      const register = await handleRegister(
        email.trim(),
        password.trim(),
        confirmPassword.trim(),
      );
      if (!register) return;
    } catch (_err) {
      alert("Something went wrong during registration or login.");
    }
  };

  const finishRegistration = async () => {
    try {
      const registerVerified = await handleVerifiedRegister(
        username.trim(),
        file,
      );
      if (!registerVerified) return;
      await onUserInfoUpdated();
      onClose();
    } catch (_err) {
      alert("Something went wrong during registration or login.");
    }
  };

  //------- MOVE LOGIC TO authHelpers.js? ---------//

  if (intialRegistrationStage) {
    titleContent = "Register";
    bodyContent = (
      <Form>
        <Form.Group className="mb-3" controlId="regEmail">
          <Form.Label>
            <b>Email</b> <span className="required">*required</span> (6-40
            characters)
          </Form.Label>
          <Form.Control
            maxLength={40}
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="regPassword">
          <Form.Label>
            <b>Password</b> <span className="required">*required</span> (6-20
            characters)
          </Form.Label>
          <Form.Control
            maxLength={20}
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="regPassword">
          <Form.Label>
            <b>Reenter Password</b> <span className="required">*required</span>{" "}
            (6-20 characters)
          </Form.Label>
          <Form.Control
            maxLength={20}
            type="password"
            placeholder="Renter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Form.Group>
      </Form>
    );
    footerContent = (
      <Button variant="primary" onClick={startRegistration}>
        Confirm
      </Button>
    );
  } else if (verifyRegistrationStage) {
    titleContent = "Email Verification Required";
    bodyContent = (
      <p className="text-center mt-3">
        Your email address needs to be verified before you can finish
        registeration. Please check your inbox for a verification email and
        click the link provided. If you haven't received the email, please check
        your spam folder.
      </p>
    );
    footerContent = (
      <>
        <Button
          className="verify-status-button"
          onClick={verifyAuthEmailStatus}
        >
          Verify status
        </Button>
        <Button className="cancel-status-button" onClick={cancelRegistration}>
          Cancel Registration
        </Button>
      </>
    );
  } else if (finalRegistrationStage) {
    titleContent = "Complete Your Profile";
    bodyContent = (
      <>
        <Form.Group className="mb-3" controlId="regUsername">
          <Form.Label>
            <b>Username</b> <span className="required">*required</span> (3-20
            characters)
          </Form.Label>
          <Form.Control
            maxLength={20}
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="regFile">
          <Form.Label>
            <b>
              Profile Picture - <i>Optional</i> (5mb max)
            </b>
          </Form.Label>
          <Form.Control
            type="file"
            onChange={(e) => setFilePath(e.target.files[0])}
          />
        </Form.Group>
      </>
    );
    footerContent = (
      <Button variant="primary" onClick={finishRegistration}>
        Finish
      </Button>
    );
  }

  // Progress Bar / Dots
  const renderProgressDots = () => (
    <div className="step-indicator">
      <div className={`step-dot ${currentStep >= 1 ? "active" : ""}`}></div>
      <div className={`step-dot ${currentStep >= 2 ? "active" : ""}`}></div>
      <div className={`step-dot ${currentStep >= 3 ? "active" : ""}`}></div>
    </div>
  );

  return (
    <div
      className="modal show"
      style={{ display: "block", position: "initial" }}
    >
      <Modal
        show={show}
        onHide={onClose}
        centered
        className="dark-modal"
        contentClassName="dark-modal-content"
      >
        <Modal.Header closeButton onHide={onClose}>
          <Modal.Title>{titleContent}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {renderProgressDots()}
          {/* Wrapper to ensure consistent height across all 3 screens */}
          <div className="step-content-wrapper">{bodyContent}</div>
        </Modal.Body>
        <Modal.Footer>{footerContent}</Modal.Footer>
      </Modal>
    </div>
  );
}

export default RegisterModal;
