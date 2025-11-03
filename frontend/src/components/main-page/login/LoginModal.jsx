import { useState } from "react";
import { handleLogin } from "../../../utils/authHelpers";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import "./LoginModal.css"

function LoginModal({ onClose, show }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginAndClose = async () => {
  const success = await handleLogin(email, password);
  if (success) {
    onClose();
  }
};
  return (
    <Modal
      show={show}           
      onHide={onClose}         
      centered
      className="dark-modal"
      contentClassName="dark-modal-content"
    >        <Modal.Header closeButton onHide={onClose}>
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              ></Form.Control>
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              ></Form.Control>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={loginAndClose}>
            Login
          </Button>
        </Modal.Footer>
    </Modal>
  );
}
export default LoginModal;
