// Updated CreateDraft.tsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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

  const createHomeworkId = (hw: Omit<Homework, 'id' | 'posted'>): string => {
    const assignedDateStr = hw.assignedDate.toDate().getTime();
    const dueDateStr = hw.dueDate.toDate().getTime();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    return `${hw.name}-${assignedDateStr}-${dueDateStr}-${randomSuffix}`;
  };

  const createLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleSaveQuiz = (quiz: QuizQuestion[]) => {
    setQuizData(quiz);
    setQuizSaved(true);
    setShowQuiz(false); // Hide quiz manager after saving
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
      const newHomework: Homework = {
        ...tempHomework,
        id: createHomeworkId(tempHomework),
        posted: false,
        submitted: {},
        locked: true,
        submittedFiles: []
      };

      // Add quiz data if available
      if (quizData.length > 0) {
        newHomework.quiz = quizData;
      }

      // Update Firestore
      const existingHomework = courseSnap.data().homework || [];
      const updatedHomework = [...existingHomework, newHomework];

      await updateDoc(courseRef, { homework: updatedHomework });

      setSuccess(true);
      setFormData({ name: '', dueDate: '', assignmentDescription: '' });
      setQuizData([]);
      setQuizSaved(false);
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
            <label htmlFor="dueDate">Due Date</label>
            <input
              type="date"
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
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