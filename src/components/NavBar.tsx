import { Link, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { auth } from '../firebase';

interface NavBarProps {
  user: User | null;
}

const NavBar = ({ user }: NavBarProps) => {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate("/")
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          ZeroPlus
        </Link>
        <div className="navbar-links">
          {user ? (
            <button onClick={handleSignOut} className="sign-out-button">
              Sign Out
            </button>
          ) : (
            <>
              <Link to="/signin" className="sign-in-button">
                Sign In
              </Link>
              <Link to="/signup" className="sign-up-button">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 