import { useEffect, useState } from "react";
import { doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase"; // Adjust your firebase import path
import "./Homework.css";
import { useNavigate } from "react-router-dom";

interface CompletionStatus {
  userId: string;
  completed: boolean;
}

interface Homework {
  assignedDate: Timestamp;
  dueDate: Timestamp; // Firestore Timestamp or string
  name: string;
  posted: boolean;
  completed: CompletionStatus[]; // Array of completion status for each user
}

const Homework = () => {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = auth.currentUser?.uid || "";
  
  const navigate = useNavigate();

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
        const filteredHomework = homeworkData.filter(
          (h: Homework) => h.posted === true
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
  }, []);

  // Check if the current user has marked the homework as completed
  const isCompletedByCurrentUser = (hw: Homework) => {
    if (!hw.completed || !Array.isArray(hw.completed)) return false;
    
    const userCompletion = hw.completed.find(item => item.userId === currentUserId);
    return userCompletion ? userCompletion.completed : false;
  };

  const handleStatusChange = async (index: number, newStatus: boolean) => {
    try {
      const courseRef = doc(db, "courses", "9MPz8i5c4izfgxrapfc7");
      const courseSnap = await getDoc(courseRef);
      if (!courseSnap.exists()) return;

      const courseData = courseSnap.data();
      const updatedHomework = [...courseData.homework];
      
      // Ensure completed array exists
      if (!updatedHomework[index].completed || !Array.isArray(updatedHomework[index].completed)) {
        updatedHomework[index].completed = [];
      }

      // Find if the user already has a completion status
      const userIndex = updatedHomework[index].completed.findIndex(
        (item: CompletionStatus) => item.userId === currentUserId
      );

      if (userIndex >= 0) {
        // Update existing status
        updatedHomework[index].completed[userIndex].completed = newStatus;
      } else {
        // Add new status
        updatedHomework[index].completed.push({
          userId: currentUserId,
          completed: newStatus
        });
      }

      await updateDoc(courseRef, { homework: updatedHomework });
      
      // Update local state
      setHomework(prev => {
        const updated = [...prev];
        if (!updated[index].completed || !Array.isArray(updated[index].completed)) {
          updated[index].completed = [];
        }
        
        const localUserIndex = updated[index].completed.findIndex(
          item => item.userId === currentUserId
        );
        
        if (localUserIndex >= 0) {
          updated[index].completed[localUserIndex].completed = newStatus;
        } else {
          updated[index].completed.push({
            userId: currentUserId,
            completed: newStatus
          });
        }
        
        return updated;
      });
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update assignment status");
    }
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
  const navigateToAssignment = (index: number) => {
    navigate(`/homework/assignment/${index}`);
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
        <h1>Homework Assignments</h1>
        <div className="table-container">
          {homework.length === 0 ? (
            <div className="loading">No posted homework found</div>
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
                {homework.map((hw, index) => (
                  <tr 
                    key={index}
                    onClick={() => navigateToAssignment(index)} 
                    className={index % 2 === 0 ? "" : "even-row"}
                  >
                    <td>{hw.name}</td>
                    <td>{formatDate(hw.assignedDate)}</td>
                    <td>{formatDate(hw.dueDate)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={isCompletedByCurrentUser(hw) ? "complete" : "not-complete"}
                        onChange={(e) => handleStatusChange(index, e.target.value === "complete")}
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