import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, runTransaction } from 'firebase/firestore'; // Import runTransaction
import { auth, db, storage } from '../../firebase';
import { Timestamp } from 'firebase/firestore';
import './Assignment.css';
import { useAdmin } from '../../hooks/useAdmin';
import Homework, { Submission } from './Homework';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';



const Assignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Homework | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAdmin(auth, db);
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid;

  

  const handleSubmit = async () => {
    if (!selectedFile || !currentUser) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      const courseId = '9MPz8i5c4izfgxrapfc7';
      
      // Upload to Storage
      const storageRef = ref(storage, `submissions/${currentUserId}/${id}/${selectedFile.name}`);
      const snapshot = await uploadBytes(storageRef, selectedFile, {
        contentType: selectedFile.type,
      });
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update Firestore
      const courseRef = doc(db, 'courses', courseId);
      
      await runTransaction(db, async (transaction) => {
        const courseSnap = await transaction.get(courseRef);
        if (!courseSnap.exists()) throw new Error('Course not found');

        const homeworkArray = courseSnap.data().homework || [];
        const homeworkIndex = homeworkArray.findIndex((hw: any) => hw.id === id);
        if (homeworkIndex === -1) throw new Error('Homework not found');

        const updatedHomework = [...homeworkArray];
        const newSubmission: Submission = {
          userId: currentUserId ? currentUserId : '',
          fileURL: downloadURL,
          originalFilename: selectedFile.name,
          timestamp: Timestamp.now()
        };

        // Update or add submission
        const existingSubmissionIndex = updatedHomework[homeworkIndex].submittedFiles?.findIndex((s: { userId: string; }) => s.userId === currentUserId) ?? -1;
        
        if (existingSubmissionIndex >= 0) {
          // Update existing submission
          updatedHomework[homeworkIndex].submittedFiles[existingSubmissionIndex] = newSubmission;
        } else {
          // Add new submission
          updatedHomework[homeworkIndex].submittedFiles = [
            ...(updatedHomework[homeworkIndex].submittedFiles || []),
            newSubmission
          ];
        }
        
        // Append/update the "submitted" map to mark this user's submission status as true
        updatedHomework[homeworkIndex].submitted = {
          ...updatedHomework[homeworkIndex].submitted, // Keep existing entries
          [currentUserId ?? '']: true, // Add/update the current user
        };

        transaction.update(courseRef, { homework: updatedHomework });
      });

      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      const updatedHomework = courseDoc.data()?.homework || [];
      const updatedAssignment = updatedHomework.find((hw: Homework) => hw.id === id);
      setAssignment(updatedAssignment);
      setSubmitted(true);
      setError(null);
    } catch (error) {
      console.error('Submission failed:', error);
      setError(`Upload failed: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const courseId = '9MPz8i5c4izfgxrapfc7';
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        
        if (!courseDoc.exists()) {
          navigate('/error');
          return;
        }
  
        const homeworkArray = courseDoc.data().homework || [];
        const foundAssignment = homeworkArray.find((hw: Homework) => hw.id === id);
  
        if (foundAssignment) {
          // Convert Firestore Timestamps
          const assignmentWithTimestamps = {
            ...foundAssignment,
            assignedDate: foundAssignment.assignedDate instanceof Timestamp 
              ? foundAssignment.assignedDate 
              : new Timestamp(foundAssignment.assignedDate.seconds, foundAssignment.assignedDate.nanoseconds),
            dueDate: foundAssignment.dueDate instanceof Timestamp 
              ? foundAssignment.dueDate 
              : new Timestamp(foundAssignment.dueDate.seconds, foundAssignment.dueDate.nanoseconds),
            submittedFiles: foundAssignment.submittedFiles?.map((sub: { timestamp: { seconds: number; nanoseconds: number; }; }) => ({
              ...sub,
              timestamp: sub.timestamp instanceof Timestamp
                ? sub.timestamp
                : new Timestamp(sub.timestamp.seconds, sub.timestamp.nanoseconds)
            }))
          };
  
          setAssignment(assignmentWithTimestamps);
          // Check if current user has submitted
          const userSubmissionStatus = currentUserId
          ? assignmentWithTimestamps.submitted?.[currentUserId] ?? false 
          : false;

          
          setSubmitted(!!userSubmissionStatus);
        } else {
          navigate('/error');
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching assignment:", error);
        navigate('/error');
      }
    };

    fetchAssignment();
  }, [id, navigate, currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="assignment-container">
      <h1>{assignment?.name}</h1>
      
      {/* Submission status for students */}
      {submitted && !isAdmin && (
        <>
          <h3>Assignment Submitted</h3>
          <p>
            File Submitted: {decodeURIComponent(
              assignment?.submittedFiles
                ?.find((s: Submission) => s.userId === currentUserId)
                ?.fileURL.split('%2F').pop()
                ?.split('?')[0] || 'Download File'
            )}
          </p>
        </>
      )}
  
      {/* Assignment details with admin editing */}
      {assignment && (
        <div className="assignment-info">
          {isAdmin ? (
            <div className="admin-editor">
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={assignment.assignmentDescription}
                  onChange={(e) => setAssignment({
                    ...assignment,
                    assignmentDescription: e.target.value
                  })}
                />
              </div>
              
              <div className="form-group">
                <label>Due Date:</label>
                <input
                  type="datetime-local"
                  value={assignment.dueDate.toDate().toISOString().slice(0, 16)}
                  onChange={(e) => setAssignment({
                    ...assignment,
                    dueDate: Timestamp.fromDate(new Date(e.target.value))
                  })}
                />
              </div>
              
              <button 
                className="save-button"
                onClick={async () => {
                  try {
                    const courseId = '9MPz8i5c4izfgxrapfc7';
                    const courseRef = doc(db, 'courses', courseId);
                    
                    await runTransaction(db, async (transaction) => {
                      const courseSnap = await transaction.get(courseRef);
                      const homeworkArray = courseSnap.data()?.homework || [];
                      const index = homeworkArray.findIndex((hw: Homework) => hw.id === id);
                      
                      if (index >= 0) {
                        homeworkArray[index] = {
                          ...homeworkArray[index],
                          assignmentDescription: assignment.assignmentDescription,
                          dueDate: assignment.dueDate
                        };
                        transaction.update(courseRef, { homework: homeworkArray });
                      }
                    });
                    
                    setError(null);
                  } catch (error) {
                    setError(`Failed to save changes: ${(error as Error).message}`);
                  }
                }}
              >
                Save Changes
              </button>
            </div>
          ) : (
            /* Student view */
            <>
              <p><strong>Description:</strong> {assignment.assignmentDescription}</p>
              <p><strong>Assigned Date:</strong> 
                {assignment.assignedDate?.toDate().toLocaleDateString()}
              </p>
              <p><strong>Due Date:</strong> 
                {assignment.dueDate?.toDate().toLocaleDateString()}
              </p>
            </>
          )}
        </div>
      )}
  
      {/* Student submission form */}
      {!submitted && !isAdmin && (
        <>
          <form className="upload-form">
            <h2>File Submission</h2>
            <div className="upload-box" onClick={() => document.getElementById('file-upload')?.click()}>
              {/* ... existing upload UI ... */}
            </div>
          </form>
          {error && <p className="error-message">{error}</p>}
          <button onClick={handleSubmit} type="submit">Upload Submission</button>
        </>
      )}
  
      {/* Admin submissions list */}
      {isAdmin && (
        <>
          <h2>Current Submissions</h2>
          {!assignment ? (
            <p className="loading-message">
              <div className="loading-spinner"></div>
              Loading submissions...
            </p>
          ) : assignment.submittedFiles?.length === 0 ? (
            <p>No submissions yet</p>
          ) : (
            assignment.submittedFiles?.map((s: Submission) => (
            <div key={s.userId} className="submission-item">
              <p>User: {s.userId}</p>
              <p>
                File: <a href={s.fileURL}>
                  {decodeURIComponent(
                    s.fileURL.split('%2F').pop()?.split('?')[0] || 'Unnamed File'
                  )}
                </a>
              </p>
              <p>
                Submitted: {s.timestamp?.toDate?.().toLocaleString() || 'Unknown date'}
              </p>
            </div>
            ))
          )}
        </>
      )}
    </div>
  );
}



export default Assignment;