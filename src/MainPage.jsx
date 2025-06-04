import { useState } from 'react'
import './MainPage.css'
import NavBar from './components/NavBar.jsx'
import JoinMatch from './components/JoinMatch.jsx'


function MainPage() {
  const [count, setCount] = useState(0)

  return (
    <>
    <NavBar/>
    <JoinMatch/>
  </>
  )
}

export default MainPage
