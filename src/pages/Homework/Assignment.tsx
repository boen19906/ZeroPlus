import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db} from '../../firebase';
import { Timestamp } from 'firebase/firestore';
import './Assignment.css';
import { useAdmin } from '../../hooks/useAdmin';
interface Assignment {
  assignmentDescription: string;
  assignedDate: Timestamp;
  dueDate: Timestamp;
  name: string;
  // Add other properties if needed
}

const Assignment: React.FC = () => {
  const { index } = useParams<{ index: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin} = useAdmin(auth, db);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const numericIndex = parseInt(index || '', 10);
        if (isNaN(numericIndex)) {
          navigate('/error');
          return;
        }

        const courseDocRef = doc(db, 'courses', '9MPz8i5c4izfgxrapfc7');
        const courseDocSnap = await getDoc(courseDocRef);
        
        if (courseDocSnap.exists()) {
          const homeworkArray = courseDocSnap.data().homework as Assignment[];
          if (homeworkArray && numericIndex >= 0 && numericIndex < homeworkArray.length) {
            setAssignment(homeworkArray[numericIndex]);
          } else {
            navigate('/error');
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching assignment:", error);
        navigate('/error');
      }
    };

    fetchAssignment();
  }, [index, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="assignment-container">
      <h1>{assignment?.name}</h1>
      {assignment && (
        <div className="assignment-info">
          <p><strong>Description:</strong> {assignment.assignmentDescription}</p>
          <p><strong>Assigned Date:</strong> 
            {assignment.assignedDate?.toDate().toLocaleDateString()}
          </p>
          <p><strong>Due Date:</strong> 
            {assignment.dueDate?.toDate().toLocaleDateString()}
          </p>
        </div>
      )}
      {isAdmin == false &&
      <> 
      <form className="upload-form">
        <h2>File Submission</h2>
        <div className="upload-box" onClick={() => document.getElementById('file-upload')?.click()}>
            <svg className="file-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
            <line x1="9" y1="11" x2="15" y2="11"></line>
            </svg>
            <p className="upload-text">Click to upload a file</p>
            <input 
            id="file-upload"
            type="file" 
            onChange={handleFileChange} 
            required 
            />
            {selectedFile && <p className="selected-file">{selectedFile.name}</p>}
        </div>
        </form>
        <button type="submit">Upload Submission</button>
        </>
      }
    </div>
  )
}

export default Assignment;