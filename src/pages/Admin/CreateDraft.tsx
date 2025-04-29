import React, { useState, useRef } from 'react';
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
  const [formData, setFormData] = useState({
    name: '',
    dueDate: '',
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
    setQuizData(quiz);
    setQuizSaved(true);
    setShowQuiz(false); // Hide quiz manager after saving
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
      setFormData({ name: '', dueDate: '', assignmentDescription: '' });
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
              <button type="button" onClick={() => setShowQuiz(true)}>Create Quiz</button>
            )}
            
            {showQuiz && (
              <QuizManager 
                onSaveQuiz={handleSaveQuiz}
              />
            )}
            
            {quizSaved && (
              <div className="quiz-status">
                <p>Quiz with {quizData.length} questions saved ✓</p>
                <button type="button" onClick={() => setShowQuiz(true)}>Edit Quiz</button>
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
              onClick={handleAttachFile}
              disabled={loading || uploadingFile}
            >
              {uploadingFile ? 'Uploading...' : 'Attach File'}
            </button>
            
            {attachedFiles.length > 0 && (
              <div className="attached-files">
                <h3>Attached Files:</h3>
                <ul>
                  {attachedFiles.map((file, index) => (
                    <li key={index}>
                      {file.name}
                      <button 
                        type="button" 
                        onClick={() => removeAttachedFile(index)}
                        className="remove-file-btn"
                      >
                        ✕
                      </button>
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