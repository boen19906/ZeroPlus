import { User } from "firebase/auth";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom"; // Import Outlet
import "./Course.css";
import useScrollToTop from "../hooks/useScroll";

const Course = ({ user }: { user: User | null }) => {
    useScrollToTop();
    const navigate = useNavigate();

    return (
        <div>
            <div className="course-welcome-section">
                <h1>Course</h1>
                <h4>Welcome to Financial Literacy Course!</h4>
                <hr />
                <p>This is the beginner course for financial literacy.</p>
            </div>

            <div className="lessons-section">
                <ul>
                    <li onClick={() => navigate("/course/lesson1")}>Lesson 1: Introduction to Financial Literacy</li>
                    <li onClick={() => navigate("/course/lesson2")}>Lesson 2: Budgeting Basics</li>
                    <li onClick={() => navigate("/course/lesson3")}>Lesson 3: Saving and Investing</li>
                    <li onClick={() => navigate("/course/lesson4")}>Lesson 4: Credit and Debt</li>
                    <li onClick={() => navigate("/course/lesson5")}>Lesson 5: Banking</li>
                    <li onClick={() => navigate("/course/lesson6")}>Lesson 6: Taxes</li>
                    <li onClick={() => navigate("/course/lesson7")}>Lesson 7: Financial Planning</li>
                </ul>
            </div>

            
        </div>
    );
};

export default Course;
