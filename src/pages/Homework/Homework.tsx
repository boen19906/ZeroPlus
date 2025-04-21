import { useEffect, useState } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../../firebase"; // Adjust your firebase import path
import "./Homework.css";
import { useNavigate } from "react-router-dom";
import generateHomeworkId from "../../hooks/useId";


export interface Submission {
  userId: string;
  fileURL: string;
  originalFilename: string;
  timestamp: Timestamp;
}


interface Homework {
  assignmentDescription: string;
  assignedDate: Timestamp;
  dueDate: Timestamp; // Firestore Timestamp or string
  name: string;
  posted: boolean;
  id: string;
  submitted: { [userId: string]: boolean };
  locked: boolean;
  submittedFiles?: Submission[];
}

interface LocalHomework extends Homework {
  localCompleted: boolean; // Local completion status
  id: string; // Unique identifier for the homework
}

const Homework = () => {
  const [homework, setHomework] = useState<LocalHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = auth.currentUser?.uid || "";
  
  const navigate = useNavigate();



  // Load completion statuses from localStorage
  const getCompletionMap = (): {[key: string]: boolean} => {
    const localStatusKey = `homework-status-${currentUserId}`;
    const savedStatus = localStorage.getItem(localStatusKey);
    return savedStatus ? JSON.parse(savedStatus) : {};
  };

  // Apply completion status to homework items
  const applyCompletionStatus = (homeworkData: Homework[]) => {
    const completionMap = getCompletionMap();
    
    return homeworkData.map(hw => {
      const hwId = generateHomeworkId(hw);
      return {
        ...hw,
        localCompleted: completionMap[hwId] === true,
        id: hwId
      };
    });
  };

  // Save completion status to localStorage
  const saveCompletionStatus = (hwId: string, isCompleted: boolean) => {
    const completionMap = getCompletionMap();
    completionMap[hwId] = isCompleted;
    
    const localStatusKey = `homework-status-${currentUserId}`;
    localStorage.setItem(localStatusKey, JSON.stringify(completionMap));
  };

  // Check if a due date has passed
  const isDatePassed = (date: Timestamp | null | undefined): boolean => {
    if (!date) return false;
    
    try {
      const dueDate = date.toDate();
      const today = new Date();
      
      // Reset time components to compare dates only
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      // Use > instead of >= to include today's assignments
      return dueDate < today;
    } catch (err) {
      console.error("Error comparing dates:", err);
      return false;
    }
  };

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
        
        // Filter homework that is posted AND due date has not passed
        const currentDate = new Date();
        const filteredHomework = homeworkData.filter(
          (h: Homework) => h.posted === true && 
                           (!h.dueDate || !isDatePassed(h.dueDate))
        );

        // Apply local completion status from localStorage
        const homeworkWithLocalStatus = applyCompletionStatus(filteredHomework);
        setHomework(homeworkWithLocalStatus);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHomework();
  }, [currentUserId]);

  const handleStatusChange = (homeworkId: string, newStatus: boolean) => {
    // Save to localStorage first
    saveCompletionStatus(homeworkId, newStatus);
    
    // Then update local state
    setHomework(prev => {
      return prev.map(hw => {
        if (hw.id === homeworkId) {
          return {...hw, localCompleted: newStatus};
        }
        return hw;
      });
    });
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      return date.toDate().toLocaleDateString();
    } catch (err) {
      return typeof date === "string" ? date : "Invalid date";
    }
  };

  // Handle navigation to assignment details
  const navigateToAssignment = (homeworkId: string) => {
    // Find the index by matching the ID
    const index = homework.findIndex(hw => hw.id === homeworkId);
    if (index !== -1) {
      navigate(`/homework/assignment/${index}`);
    }
  };

  // Stop event propagation when interacting with dropdown
  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (loading) {
    return <div className="loading">Loading homework assignments...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="homework-container">
      <div className="table-section">
        <h1>Current Homework Assignments</h1>
        <div className="table-container">
          {homework.length === 0 ? (
            <div className="loading">No current homework assignments found</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Assignment Name</th>
                  <th>Assigned Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {homework.map((hw) => (
                  <tr 
                    key={hw.id}
                    onClick={() => navigateToAssignment(hw.id)} 
                    className={homework.indexOf(hw) % 2 === 0 ? "" : "even-row"}
                  >
                    <td>{hw.name}</td>
                    <td>{formatDate(hw.assignedDate)}</td>
                    <td>{formatDate(hw.dueDate)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={hw.localCompleted ? "complete" : "not-complete"}
                        onChange={(e) => handleStatusChange(hw.id, e.target.value === "complete")}
                        onClick={handleSelectClick}
                        className="status-dropdown"
                      >
                        <option value="complete">Complete</option>
                        <option value="not-complete">Not Complete</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Homework;