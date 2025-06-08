import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
function LoginModal({onClose}){
    return(
      
        <div 
        className = "modal show" 
        style = {{ display: 'block', position: 'initial'}}>
        <Modal.Dialog>
            <Modal.Header closeButton onHide={onClose}>
                <Modal.Title>Login</Modal.Title>
            </Modal.Header>
        <Modal.Body>
            <label>Username</label>
            <input type = "text" placeholder='Enter username'></input>
            <label>Password</label>
            <input type = "text" placeholder='Enter Password'></input>

            
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" >Close</Button>
          <Button variant="primary">Save changes</Button>
        </Modal.Footer>
      </Modal.Dialog>
        </div>
        
    );
}
export default LoginModal