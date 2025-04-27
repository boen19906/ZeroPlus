import { useState } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../firebase";
import { setDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import './SignIn.css'; // Reuse the same CSS

const SignUp = () => {
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
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
    if (formData.email === "" || formData.password === "" || formData.confirmPassword === "") {
      setError("All fields must be filled out.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.phoneNumber.length !== 10) {
      setError("Input a valid phone number");
      return;
    }

    try {
      // Create the user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Add user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        admin: false,
        paid: false
      });

      // Redirect to home page
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        const errorCode = (error as any).code;
    
        if (errorCode === "auth/email-already-in-use") {
          setError("This email is already in use.");
        } else if (errorCode === "auth/invalid-email") {
          setError("Invalid email address.");
        } else if (errorCode === "auth/weak-password") {
          setError("Password is too weak.");
        } else {
          setError(error.message);
        }
    
        console.error("Error signing up:", error);
      } else {
        setError("An unknown error occurred.");
        console.error("Unknown error:", error);
      }
    }
  };

  return (
    <div className="signin-bg">
      <div className="signup-container">
        <div className="mascot-placeholder" aria-label="Mascot">🦉</div>
        <h2>Sign Up</h2>
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
            <label htmlFor="phoneNumber">Phone Number:</label>
            <input
              type="number"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
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
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit">
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUp; 