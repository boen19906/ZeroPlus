import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import './CreateDraft.css';
import QuizManager from './QuizManager';

// Use the same QuizQuestion interface from QuizManager
interface QuizQuestion {
  type: 'multiple_choice' | 'short_answer' | 'file_upload';
  question: string;
  options?: string[];
  correctAnswer?: string;
  allowedFileTypes?: string[];
  points: number;
}

interface Homework {
  id: string;
  name: string;
  assignedDate: any; // Firestore Timestamp
  dueDate: any; // Firestore Timestamp
  assignmentDescription: string;
  submitted: Record<string, any>;
  locked: boolean;
  posted: boolean;
  submittedFiles: any[];
  quiz?: QuizQuestion[]; // Optional quiz field
  files?: { name: string; url: string }[]; // Array of file objects with name and url
}

interface AttachedFile {
  name: string;
  url: string;
}

const CreateDraft: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  
  // Function to get default due date (today at 11:59 PM)
  const getDefaultDueDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59`;
  };

  const [formData, setFormData] = useState({
    name: '',
    dueDate: getDefaultDueDate(),
    assignmentDescription: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [quizSaved, setQuizSaved] = useState(false);
  
  // File upload states
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createHomeworkId = (hw: Omit<Homework, 'id' | 'posted'>): string => {
    const assignedDateStr = hw.assignedDate.toDate().getTime();
    const dueDateStr = hw.dueDate.toDate().getTime();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    return `${hw.name}-${assignedDateStr}-${dueDateStr}-${randomSuffix}`;
  };

  const createLocalDate = (dateTimeString: string): Date => {
    const [datePart, timePart] = dateTimeString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    let hour = 0;
    let minute = 0;
    
    // Handle cases where time part exists
    if (timePart) {
      [hour, minute] = timePart.split(':').map(Number).slice(0, 2);
    }
    
    return new Date(year, month - 1, day, hour, minute);
  };

  const handleSaveQuiz = (quiz: QuizQuestion[]) => {
    console.log('Saving quiz with questions:', quiz); // Debug log
    setQuizData([...quiz]); // Create a new array to ensure state update
    setQuizSaved(true);
    setShowQuiz(false);
  };

  const handleEditQuiz = () => {
    console.log('Editing quiz, current quizData:', quizData); // Debug log
    setShowQuiz(true);
  };

  const handleCancelQuiz = () => {
    setShowQuiz(false);
    // Don't reset quizData or quizSaved when canceling - keep existing quiz
  };

  const handleAttachFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    setError('');

    try {
      if (!courseId) throw new Error('No course ID provided');
      
      // Create a temporary ID for the homework to organize files
      const tempId = `temp-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Upload files to Firebase Storage
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `assignment-files/${courseId}/${tempId}/${file.name}`);
        
        // Upload the file
        await uploadBytes(fileRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(fileRef);
        
        // Add to local state
        setAttachedFiles(prev => [...prev, { name: file.name, url: downloadURL }]);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(`Failed to upload file: ${err.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (!courseId) throw new Error('No course ID provided');
      if (!formData.name || !formData.dueDate) {
        throw new Error('All fields are required');
      }

      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) throw new Error('Course not found');

      // Create dates at local midnight
      const today = new Date();
      const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const assignedDate = createLocalDate(formattedToday);
      const dueDate = createLocalDate(formData.dueDate);

      // Create temporary homework object for ID generation
      const tempHomework = {
        name: formData.name,
        assignedDate: Timestamp.fromDate(assignedDate),
        dueDate: Timestamp.fromDate(dueDate),
        assignmentDescription: formData.assignmentDescription,
        submitted: {},
        locked: true,
        submittedFiles: []
      };

      // Generate unique ID
      const homeworkId = createHomeworkId(tempHomework);
      
      // If files were attached, create an array of file objects with name and url
      const fileArray: { name: string; url: string }[] = [];
      
      if (attachedFiles.length > 0) {
        // Convert attachedFiles directly to the format we want to store
        fileArray.push(...attachedFiles.map(file => ({
          name: file.name,
          url: file.url
        })));
      }

      const newHomework: Homework = {
        ...tempHomework,
        id: homeworkId,
        posted: false,
        submitted: {},
        locked: true,
        submittedFiles: []
      };

      // Add quiz data if available
      if (quizData.length > 0) {
        newHomework.quiz = quizData;
      }

      // Add file data if available
      if (fileArray.length > 0) {
        newHomework.files = fileArray;
      }

      // Update Firestore
      const existingHomework = courseSnap.data().homework || [];
      const updatedHomework = [...existingHomework, newHomework];

      await updateDoc(courseRef, { homework: updatedHomework });

      setSuccess(true);
      setFormData({ 
        name: '', 
        dueDate: getDefaultDueDate(), // Reset to default due date
        assignmentDescription: '' 
      });
      setQuizData([]);
      setQuizSaved(false);
      setAttachedFiles([]);
      setTimeout(() => navigate('/admin'), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="enroll-pay-container">
      <h1 className="enroll-pay-header">Create Homework Draft</h1>
      
      <div className="enroll-pay-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Assignment Name</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Due Date and Time</label>
            <input
              type="datetime-local"
              id="dueDate"
              value={formData.dueDate || ''}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="assignmentDescription">Assignment Description</label>
            <textarea
              id="assignmentDescription"
              value={formData.assignmentDescription}
              onChange={(e) => setFormData({...formData, assignmentDescription: e.target.value})}
              disabled={loading}
              required
            />
          </div>

          <div className="quiz-section">
            {!showQuiz && !quizSaved && (
              <button type="button" 
              style={{margin: "1rem"}}
              onClick={() => setShowQuiz(true)}>Create Quiz</button>
            )}
            
            {showQuiz && (
              <QuizManager 
                initialQuizData={quizData} // Pass existing quiz data when editing
                onSaveQuiz={handleSaveQuiz}
                onCancel={handleCancelQuiz}
              />
            )}
            
            {quizSaved && !showQuiz && (
              <div className="quiz-status">
                <p>Quiz with {quizData.length} questions saved ✓</p>
                <button 
                  type="button"
                  className="edit-quiz-button" 
                  onClick={handleEditQuiz}
                >
                  Edit Quiz
                </button>
              </div>
            )}
          </div>

          <div className="file-upload-section">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              multiple
            />
            <button
              type="button"
              className="file-upload-button"
              onClick={handleAttachFile}
              disabled={loading || uploadingFile}
            >
              <div className="button-content">
                <svg 
                  className="upload-icon" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{uploadingFile ? 'Uploading...' : 'Attach Guide File'}</span>
              </div>
            </button>
            
            {attachedFiles.length > 0 && (
              <div className="attached-files">
                <h3>Attached Files:</h3>
                <ul>
                  {attachedFiles.map((file, index) => (
                    <li key={index}>
                      <div className="file-item">
                        <svg
                          className="file-icon"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        <span className="file-name">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachedFile(index)}
                          className="remove-file-btn"
                          aria-label="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Error and success messages */}
          {error && <div className="error">{error}</div>}
          {success && <div className="success">Draft created successfully!</div>}

          <button 
            type="submit" 
            className="save-button"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Draft'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateDraft;