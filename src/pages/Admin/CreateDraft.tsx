import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, Timestamp, getDoc} from 'firebase/firestore';
import { db } from '../../firebase'; // Adjust your firebase config path
import './CreateDraft.css'; // Use the provided CSS

interface CompletionStatus {
    userId: string;
    completed: boolean;
}

interface HomeworkDraft {
  name: string;
  assignedDate: Timestamp;
  dueDate: Timestamp;
  posted: boolean;
  assignmentDescription: string;
}

const CreateDraft: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [formData, setFormData] = useState({
    name: '',
    assignedDate: '',
    dueDate: '',
    assignmentDescription: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Helper function to create a date at local midnight
  const createLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // Month is 0-indexed in JS Date
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
  
    try {
      if (!courseId) throw new Error('No course ID provided');
      if (!formData.name || !formData.assignedDate || !formData.dueDate) {
        throw new Error('All fields are required');
      }
  
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        throw new Error('Course not found');
      }
  
      // Get existing homework and parse dates correctly
      const existingHomework = courseSnap.data().homework || [];
      
      // Create dates at local midnight to avoid timezone issues
      const assignedDate = createLocalDate(formData.assignedDate);
      const dueDate = createLocalDate(formData.dueDate);
      
      const newHomework = {
        name: formData.name,
        assignedDate: Timestamp.fromDate(assignedDate),
        dueDate: Timestamp.fromDate(dueDate),
        posted: false,
        assignmentDescription: formData.assignmentDescription
      };
  
      // Find the correct position to insert
      const insertionIndex = existingHomework.findIndex((hw: HomeworkDraft) => 
        hw.assignedDate.toMillis() > newHomework.assignedDate.toMillis()
      );
  
      // Create updated array with new homework in correct position
      const updatedHomework = insertionIndex === -1 
        ? [...existingHomework, newHomework]
        : [
            ...existingHomework.slice(0, insertionIndex),
            newHomework,
            ...existingHomework.slice(insertionIndex)
          ];
  
      // Update Firestore with sorted array
      await updateDoc(courseRef, {
        homework: updatedHomework
      });
  
      setSuccess(true);
      setFormData({ name: '', assignedDate: '', dueDate: '', assignmentDescription: '' });
      setTimeout(() => setSuccess(false), 3000);
      navigate('/admin');
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
            <label htmlFor="assignedDate">Assigned Date</label>
            <input
              type="date"
              id="assignedDate"
              value={formData.assignedDate}
              onChange={(e) => setFormData({...formData, assignedDate: e.target.value})}
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