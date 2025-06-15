import { useState }  from 'react';

import { auth } from "../../firebase";
import {createUserWithEmailAndPassword} from "firebase/auth";
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
function RegisterModal({onClose}){
  
  //User Info that is added 
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("")
  const [file, setFilePath] = useState(null)
      
  //Register logic that uploads info to DB
 const handleRegister = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    // 1. Send user data to backend
    await axios.post("http://localhost:8080/protected/users", {
      email,
      displayName: username,
    }, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    })

    // 2. Send image file using FormData
    const formData = new FormData();
    formData.append("file", file); // 👈 make sure `file` is from a file input!

    await axios.post("http://localhost:8080/api/media/upload", formData, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "multipart/form-data",
      },
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
                <Form.Group className="mb-3" controlId="exampleForm.ControlInput1"> 
                    <Form.Label>Profile Picture</Form.Label>
                        <Form.Control type = "file" onChange={e => setFilePath(e.target.files[0])}></Form.Control>
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