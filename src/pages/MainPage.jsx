import { useState } from 'react'
import './MainPage.css'
import NavBar from '../components/NavBar.jsx'
import JoinMatch from '../components/JoinMatch.jsx'
import CreateMatch from '../components/CreateMatch.jsx'
import LeaderBoard from '../components/LeaderBoard.jsx'
import AboutUs from '../components/AboutUs.jsx'

function MainPage() {
  const [count, setCount] = useState(0)

  return (
    <>
    <NavBar/>
    <div className = "container">
    <div className = "topSection">
    <JoinMatch/>
    <CreateMatch/>
    </div>
    <div className = "bottomSection">
    <LeaderBoard></LeaderBoard>
    <AboutUs></AboutUs>
    </div>
    </div>
  </>
  )
}

export default MainPage
