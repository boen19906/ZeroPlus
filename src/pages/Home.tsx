import { onAuthStateChanged, User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { setDoc, doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import "./Home.css";
import { useEffect, useState } from "react";
import useScrollToTop from "../hooks/useScroll";

// Create a separate component for the home page that uses useNavigate
const Home = ({ user }: { user: User | null }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  useScrollToTop();
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const handlePackageSelect = (packageName: string) => {
    setSelectedPackage(packageName);
  };

  const confirmPackageSelection = async () => {
    if (!user || !selectedPackage) {
      return;
    }
    
    await updateDoc(doc(db, "users", user.uid), {
      packageName: selectedPackage,
    });
    
    console.log("Package changed to", selectedPackage);
    navigate("/enrollpay");
  };

  const handleJoinClass = async () => {
    if (!user) {
      alert('Please log in to join class');
      return;
    }

    try {
      navigate('/course');
      const courseRef = doc(db, 'courses', '9MPz8i5c4izfgxrapfc7');
      
      await updateDoc(courseRef, {
        students: arrayUnion(user.uid)
      });

      
      console.log("Joined class");
    } catch (err) {
      console.error('Error joining class:', err);
      alert('Failed to join class');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        if (currentUser) {
          // Get user document from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setIsAdmin(userDoc.data().admin || false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error(err);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  return (
    <div className="home">
      <h1>Welcome to ZeroPlus</h1>
      {user && (
        <>
          <p>
            You are signed in as <strong>{user.email}</strong>
          </p>
          {!isAdmin &&
          <>
            <div className="packages-grid">
            <div 
              className={`package-box ${selectedPackage === "Basic" ? "selected" : ""}`} 
              onClick={() => handlePackageSelect("Basic")}
            >
              <h4>Basic Package</h4>
              <p>$200</p>
              <ul>
                <li>3 Free Lessons</li>
                <li>5 Free Tests</li>
                <li>Some Support</li>
              </ul>
            </div>
            
            <div 
              className={`package-box ${selectedPackage === "Pro" ? "selected" : ""}`} 
              onClick={() => handlePackageSelect("Pro")}
            >
              <h4>Pro Package</h4>
              <p>$500</p>
              <ul>
                <li>Unlimited Free Lessons</li>
                <li>Unlimited Free Tests</li>
                <li>Full Support</li>
              </ul>
            </div>
          </div>
          
          <button 
            className="select-package-btn"
            onClick={confirmPackageSelection}
            disabled={!selectedPackage}
          >
            {selectedPackage ? `Select ${selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)} Package` : "Select a Package"}
          </button>

          <div className="join-class-section">
            <h2>Join Class</h2>
            <p>Join the class to start your journey to success</p>
            <button onClick={handleJoinClass}>Join Class</button>
          </div>
          </>
          }
          
          
         

          {!isAdmin &&
            <>
              <hr/>
              <div className="homework-section">
              <h2>Homework</h2>
              <p>Check your homework assignments</p>
              <button onClick={() => navigate("/homework")}>Go to Homework</button>
            </div>
            </>
          }
          
          {isAdmin &&
          <>
            <hr/>
            <div className="admin-section">
              <h2>Admin</h2>
              <p>Click the button below to access the admin page</p>
              <button onClick={() => navigate("/admin")}>Admin</button>
            </div>
          </>
          }
          
        </>
      )}
    </div>
  );
};

export default Home;