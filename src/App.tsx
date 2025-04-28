import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import SignIn from './pages/SignIn/SignIn';
import SignUp from './pages/SignIn/SignUp';
import './App.css';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from './firebase';
import Home from './pages/Home';
import NavBar from './components/NavBar';
import EnrollPay from './pages/EnrollPay';
import Course from './pages/Lessons/Course';
import Lesson1 from './pages/Lessons/Lesson1';
import Lesson2 from './pages/Lessons/Lesson2';
import Lesson3 from './pages/Lessons/Lesson3';
import Lesson4 from './pages/Lessons/Lesson4';
import Lesson5 from './pages/Lessons/Lesson5';
import Lesson6 from './pages/Lessons/Lesson6';
import Lesson7 from './pages/Lessons/Lesson7';
import Admin from './pages/Admin/Admin';
import Homework from './pages/Homework/Homework';
import CreateDraft from './pages/Admin/CreateDraft';
import Assignment from './pages/Homework/Assignment';
const AppContent = ({ user }: { user: User | null }) => {
  const location = useLocation();

  // Determine if NavBar should be shown
  const showNavBar = !['/signin', '/signup'].includes(location.pathname);

  return (
    <>
      {showNavBar && <NavBar user={user} />}
      <Routes>
        <Route
          path="/"
          element={<Home user={user} />}
        />
        <Route
          path="/signin"
          element={user ? <Navigate to="/" /> : <SignIn />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" /> : <SignUp />}
        />
        <Route
          path="/enrollpay"
          element={<EnrollPay user={user} />}
        />
        <Route path="/homework" element={<Homework/>}/>
        <Route path="/homework/assignment/:id" element={<Assignment />} />


        <Route path="/admin" element={<Admin />} />
        <Route 
          path="/admin/create-draft/:courseId" 
          element={<CreateDraft/>} 
        />

        <Route path="/course" element={<Course />}/>
        <Route path="/course/lesson1" element={<Lesson1 />} />
        <Route path="/course/lesson2" element={<Lesson2 />} />
        <Route path="/course/lesson3" element={<Lesson3 />} />
        <Route path="/course/lesson4" element={<Lesson4 />} />
        <Route path="/course/lesson5" element={<Lesson5 />} />
        <Route path="/course/lesson6" element={<Lesson6 />} />
        <Route path="/course/lesson7" element={<Lesson7 />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <AppContent user={user} />
      </div>
    </Router>
  );
};

export default App;
