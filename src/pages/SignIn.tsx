import { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth"; // Use signInWithEmailAndPassword
import { auth } from "../firebase"; // Only auth is needed for sign-in
import { useNavigate } from "react-router-dom";
import './SignIn.css';

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

     // Manual validation
     if (formData.email=="" || formData.password=="") {
      setError("All fields must be filled out.");
      return;
    }

    try {
      // Step 1: Sign in the user with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Step 2: Redirect to home page or dashboard
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        const errorCode = (error as any).code;
    
        if (errorCode === "auth/invalid-credential") {
          setError("Incorrect Email or Password.");
        } else {
          setError(error.message);
        }
    
        console.error("Error signing in:", error);
      } else {
        setError("An unknown error occurred.");
        console.error("Unknown error:", error);
      }
    }
    
    console.log('Signup form submitted:', formData);
  };

  return (
    <div className="signup-container">
      <h2>Sign In</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">
          Sign In
        </button>
      </form>
    </div>
  );
  
};

export default SignIn; 