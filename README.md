# Type Battle 

**Type Battle** is a real-time multiplayer typing game built as a Capstone project. Players can test their typing speed and accuracy by competing against others in live races and engaging in fun typing-based mini-games.

## What is the Game?
Type Battle transforms the standard typing test into a competitive multiplayer experience. Players can:
- **Create or Join Matches:** Hop into a lobby with friends or other players.
- **Race to the Finish:** Type paragraphs and sentences as fast as possible while your progress is tracked live against opponents.
- **Play Mini-Games:** Enjoy unique typing mini-games like *Crossy Road*, *Island Game*, and *Stacker*.
- **Climb the Leaderboard:** Track your stats and see how you rank against other typists.

## Tech Stack
The project is split into a modern web frontend and a robust Java-based backend.

### Frontend
* **React** (via **Vite**): Fast and modern UI development.
* **JavaScript (JSX) & CSS**: For component logic and styling.
* **WebSockets**: To handle real-time game state updates.

### Backend
* **Java & Spring Boot**: The core framework driving the REST APIs and game logic.
* **Spring WebSockets**: Manages real-time, bi-directional communication between the server and players in a match.
* **Maven**: Dependency management and build tool.

### Cloud & Services
* **Firebase**: Used for secure user authentication (login/registration).
* **Cloudflare R2**: Used for scalable media and asset storage.

##  How It Works
1. **Authentication:** Users sign up or log in using Firebase Authentication. 
2. **Lobby System:** A player can host a game session or join an existing one using a unique lobby code. 
3. **Real-Time Sync:** Once a game starts, the frontend connects to the Spring Boot backend via WebSockets. Every keystroke (stroke data) is processed in real-time to update the progress bars of all participants in the match.
4. **Game Loop:** Players type the displayed text. The backend verifies the accuracy and speed, determining the winner once the paragraph is completed.
5. **Mini-Games:** Players can transition into specialized mini-game modes which utilize the same WebSocket infrastructure but feature distinct rules and UI (e.g., dodging obstacles in *Crossy Road* by typing correctly).