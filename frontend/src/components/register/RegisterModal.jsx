import { useState }  from 'react';
import {getAuth, createUserWithEmailAndPassword} from "firebase/auth";
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
function RegisterModal({onClose}){
    
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("")
 
    const handleRegister = async () => {
        const auth = getAuth();
        try{
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();
         // Send to Spring Boot backend
        await axios.post("http://localhost:8080/protected/users", {
        email,
        displayName: username,
 
      }, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      alert("Registration successful!");
 
      onClose();
    } catch (error) {
      console.error("Registration error:", error.message);
      alert("Failed to register.");
    }
  };

    return(
      
        <div 
        className = "modal show" 
        style = {{ display: 'block', position: 'initial'}}>
        <Modal.Dialog>
            <Modal.Header closeButton onHide={onClose}>
                <Modal.Title>Register</Modal.Title>
            </Modal.Header>
        <Modal.Body>
            <Form>
                <Form.Group className="mb-3" controlId="exampleForm.ControlInput1"> 
                    <Form.Label>Email</Form.Label>
                        <Form.Control type = "email" placeholder='Enter email' value={email} onChange={e => setEmail(e.target.value)}></Form.Control>
                </Form.Group>
                <Form.Group className="mb-3" controlId="exampleForm.ControlInput1"> 
                    <Form.Label>Password</Form.Label>
                        <Form.Control type = "password" placeholder='Enter password' value={password} onChange={e => setPassword(e.target.value)}></Form.Control>
                </Form.Group>
                <Form.Group className="mb-3" controlId="exampleForm.ControlInput1"> 
                    <Form.Label>Username</Form.Label>
                        <Form.Control type = "Username" placeholder='Enter username' value={username} onChange={e => setUsername(e.target.value)}></Form.Control>
                </Form.Group>
            </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleRegister}>Register</Button>
        </Modal.Footer>
      </Modal.Dialog>
        </div>
        
    );
}
export default RegisterModal