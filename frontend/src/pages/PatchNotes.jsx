import NavBar from "../components/navbar/NavBar";
import "./PatchNotes.css";
import { useAuth } from "../utils/authContext";
function PatchNotes() {
  const { isUserLoggedIn, userInfo, logOutFirebase, isUserInDb, isUserVerified, loading } = useAuth();

  return (
    <>
      <NavBar
      loading={loading}
        userInfo={userInfo}
        isUserLoggedIn={isUserLoggedIn}
        logOut={logOutFirebase}
         isUserVerified={isUserVerified}
        isUserInDb={isUserInDb}
      />
      <div className="patch-notes-container">
  <header className="patch-header">
    <div className="patch-header-top">
      <span>v1.2</span>
      <span>March 17, 2026</span>
    </div>
    <h1 className="patch-title">QUALITY OF LIFE</h1>
  </header>

  <div className="patch-intro">
    <p>Mainly focused on polishing UI and Game mechanics.</p>
  </div>

  <div className="patch-sections">
    <section key="0">
      <h2 className="patch-section-title">FEATURES</h2>
      <ul className="patch-list">
        <li>Email verification is now required upon account creation</li>
        <li>Added 5 second transition timer at the end of mini games</li>
        <li>Added skeleton loaders when refreshing on homepage </li>
      </ul>
    </section>
    <section key="1">
      <h2 className="patch-section-title">OPTIMIZATIONS</h2>
      <ul className="patch-list">
        <li>Improved Crossy Road hitboxes </li>
        <li>Made stacker 30 second's instead of 60</li>
      </ul>
    </section>
  </div>
</div>

      <div className="patch-notes-container">
        <header className="patch-header">
          <div className="patch-header-top">
            <span>v1.1</span>
            <span>March 3, 2026</span>
          </div>
          <h1 className="patch-title">Quality of life & Bug fixes</h1>
        </header>

        <div className="patch-intro">
          <p>
            This update focused on refining/polishing game playing and adding
            features that were requested.
          </p>
        </div>

        <div className="patch-sections">
          <section key="0">
            <h2 className="patch-section-title">OPTIMIZATIONS</h2>
            <ul className="patch-list">
              <li>
                Optimized timer's, now use's concurrent hashmap instead of db
              </li>
              <li>
                Stacker and CrossyRoad now have results sent at the end of the
                game
              </li>
            </ul>
          </section>
          <section key="1">
            <h2 className="patch-section-title">FEATURES</h2>
            <ul className="patch-list">
              <li>Viewable profile pictures in game</li>
              <li>10 second transition timer in between games</li>
            </ul>
          </section>
          <section key="2">
            <h2 className="patch-section-title">BUG FIXES</h2>
            <ul className="patch-list">
              <li>Stacker score no longer resets on refresh</li>
              <li>4 player mode now works</li>
              <li>Error's given when email already in use</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

export default PatchNotes;
