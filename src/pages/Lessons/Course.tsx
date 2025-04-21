import { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Course.css";
import useScrollToTop from "../../hooks/useScroll";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import Homework from "../Homework/Homework";

interface LocalHomework extends Homework {
  id: string;
}

const Course = () => {
  const [homework, setHomework] = useState<LocalHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = auth.currentUser?.uid || "";
  
  const navigate = useNavigate();
  useScrollToTop();

  useEffect(() => {
    const fetchHomework = async () => {
      try {
        const courseRef = doc(db, "courses", "9MPz8i5c4izfgxrapfc7");
        const courseSnap = await getDoc(courseRef);
        
        if (!courseSnap.exists()) {
          throw new Error("Course document not found");
        }

        const courseData = courseSnap.data();
        const homeworkData = courseData.homework || [];
        
        
        
        // Store the full list in sessionStorage for reference by other components
        sessionStorage.setItem('allHomework', JSON.stringify(homeworkData));
        
        // Then filter for displayed homework
        const filteredHomework = homeworkData.filter(
          (h: LocalHomework) => h.posted === true && 
                           (!h.dueDate || !isDatePassed(h.dueDate))
        );

        setHomework(filteredHomework);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHomework();
  }, [currentUserId]);

  const isDatePassed = (date: Timestamp | null | undefined): boolean => {
    if (!date) return false;
    
    try {
      const dueDate = date.toDate();
      const today = new Date();
      
      // Reset time components to compare dates only
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate < today;
    } catch (err) {
      console.error("Error comparing dates:", err);
      return false;
    }
  };

  // Handle navigation to assignment details using ID instead of index
  const navigateToAssignment = (homeworkId: string) => {
    navigate(`/homework/assignment/${homeworkId}`);
  };

  return (
    <div>
      <div className="course-welcome-section">
        <h1>Course</h1>
        <h4>Welcome to Financial Literacy Course!</h4>
        <hr />
        <p>This is the beginner course for financial literacy.</p>
      </div>

      <div className="lessons-section">
        {loading ? (
          <p>Loading assignments...</p>
        ) : error ? (
          <p>Error loading assignments: {error}</p>
        ) : homework.length > 0 ? (
          <ul>
            {homework.map((hw, index) => {
            const isSubmitted = currentUserId
            ? hw.submitted?.[currentUserId] ?? false 
            : false;
            const isLocked = hw.locked || false;
            const isDisabled = isLocked;

            return (
                <li 
                key={hw.id}
                onClick={() => !isDisabled && navigateToAssignment(hw.id)}
                className={`${index % 2 === 0 ? "" : "even-row"} ${isDisabled ? "disabled-lesson" : ""}`}
                >
                Lesson {index + 1}: {hw.name}
                {isSubmitted && <span className="submitted-check">✓ Submitted</span>}
                {isLocked && <span className="locked-check">🔒 Locked</span>}
                </li>
            );
            })}
          </ul>
        ) : (
          <p>No current assignments available.</p>
        )}
      </div>
    </div>
  );
};

export default Course;