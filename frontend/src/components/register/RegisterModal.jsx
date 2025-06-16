import { useState } from "react";

import { handleRegister, handleLogin } from "../../utils/authHelpers"
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
function RegisterModal({ onClose, onUserInfoUpdated }) {
  //User Info that is added
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [file, setFilePath] = useState(null);


const registerAndLogin = async () => {
  try {
    await handleRegister(email.trim(), password.trim(), username.trim(), file);
    await handleLogin(email.trim(), password.trim());
    await onUserInfoUpdated(); //Refresh trigger
    onClose();
  } catch (err) {
    alert("Something went wrong during registration or login.");
    console.error(err);
  }
};


  return (
    <div
      className="modal show"
      style={{ display: "block", position: "initial" }}
    >
      <Modal.Dialog>
        <Modal.Header closeButton onHide={onClose}>
          <Modal.Title>Register</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label><b>Email</b>  *required</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              ></Form.Control>
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label><b>Password</b> *required</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              ></Form.Control>
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label><b>Username</b>  *required</Form.Label>
              <Form.Control
                type="Username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              ></Form.Control>
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label><b>Profile Picture</b></Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setFilePath(e.target.files[0])}
              ></Form.Control>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={registerAndLogin}>
            Register
          </Button>
        </Modal.Footer>
      </Modal.Dialog>
    </div>
  );
}
export default RegisterModal;
