import { useState } from 'react'
import './MainPage.css'
import NavBar from './components/NavBar.jsx'


function MainPage() {
  const [count, setCount] = useState(0)

  return (
    <>
    <NavBar></NavBar>
  </>
  )
}

export default MainPage
