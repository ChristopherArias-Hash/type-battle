import { useState }  from 'react';
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form';
function RegisterModal({onClose}){
    
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("")

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
          <Button variant="primary">Register</Button>
        </Modal.Footer>
      </Modal.Dialog>
        </div>
        
    );
}
export default RegisterModal