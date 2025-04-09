import { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
// Create a separate component for the home page that uses useNavigate
const Home = ({ user }: { user: User | null }) => {
    const navigate = useNavigate();
    
    return (
      <div className="home">
        <h1>Welcome to ZeroPlus</h1>
        {user && (
            <p>
                You are signed in as <strong>{user.email}</strong>
            </p>
        )}
      </div>
    );
  }

  export default Home;