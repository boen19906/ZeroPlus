import React, { useState, useEffect } from 'react';
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

interface EditDraftProps {
    courseId: string;
    isEdit: boolean;
    homeworkId: string | undefined;
  }

const EditDraft: React.FC<EditDraftProps> = ({ courseId, isEdit, homeworkId }) => { 
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
  

  // Fetch existing homework data if editing
  useEffect(() => {
    const fetchHomeworkData = async () => {
      if (isEdit && courseId && homeworkId) {
        try {
          setLoading(true);
          const courseRef = doc(db, 'courses', courseId);
          const courseSnap = await getDoc(courseRef);
          
          if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            const homework = courseData.homework || [];
            const homeworkItem = homework.find((hw: Homework) => hw.id === homeworkId);
            
            if (homeworkItem) {
              const dueDate = homeworkItem.dueDate.toDate();
              const formattedDueDate = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
              
              setFormData({
                name: homeworkItem.name,
                dueDate: formattedDueDate,
                assignmentDescription: homeworkItem.assignmentDescription
              });
              
              if (homeworkItem.quiz && homeworkItem.quiz.length > 0) {
                setQuizData(homeworkItem.quiz);
                setQuizSaved(true);
              }
            }
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchHomeworkData();
  }, [isEdit, courseId, homeworkId]);

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

  // Toggle quiz editor visibility
  const toggleQuizEditor = () => {
    setShowQuiz(!showQuiz);
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

      const courseData = courseSnap.data();
      const existingHomework = courseData.homework || [];
      
      if (isEdit && homeworkId) {
        // Update existing homework
        const updatedHomework = existingHomework.map((hw: Homework) => {
          if (hw.id === homeworkId) {
            return {
              ...hw,
              name: formData.name,
              dueDate: Timestamp.fromDate(dueDate),
              assignmentDescription: formData.assignmentDescription,
              quiz: quizData.length > 0 ? quizData : hw.quiz
            };
          }
          return hw;
        });
        
        await updateDoc(courseRef, { homework: updatedHomework });
      } else {
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
        const updatedHomework = [...existingHomework, newHomework];
        await updateDoc(courseRef, { homework: updatedHomework });
      }

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
              <button type="button" onClick={toggleQuizEditor}
              style={{margin: "1rem"}}>
                {isEdit ? 'Add Quiz' : 'Create Quiz'}
              </button>
            )}
            
            {!showQuiz && quizSaved && (
              <div className="quiz-status">
                <p>Quiz with {quizData.length} questions saved ✓</p>
                <button type="button" onClick={toggleQuizEditor}>
                  Edit Quiz
                </button>
              </div>
            )}
            
            {showQuiz && (
              <>
                <QuizManager 
                  onSaveQuiz={handleSaveQuiz}
                  initialQuizData={quizData}
                />
                <button 
                  type="button" 
                  className="cancel-button" 
                  onClick={() => setShowQuiz(false)}
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Error and success messages */}
          {error && <div className="error">{error}</div>}
          {success && (
            <div className="success">
              {isEdit ? 'Draft updated successfully!' : 'Draft created successfully!'}
            </div>
          )}

          <button 
            type="submit" 
            className="save-button"
            disabled={loading}
          >
            {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Draft' : 'Create Draft')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditDraft;