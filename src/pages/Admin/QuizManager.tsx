import React, { useState, useEffect } from 'react';
import './QuizManager.css'; // Adjust the path as necessary

interface QuizQuestion {
  id?: string;
  type: 'multiple_choice' | 'short_answer' | 'file_upload';
  question: string;
  options?: string[];  // For multiple choice questions
  correctAnswer?: string;  // For multiple choice and short answer questions
  allowedFileTypes?: string[];  // For file upload questions
  points: number;
}

interface QuizManagerProps {
  courseId?: string;
  onSaveQuiz: (quizData: QuizQuestion[]) => void;
  onCancel?: () => void;
  initialQuizData?: QuizQuestion[];  // New prop for editing existing quizzes
}

const QuizManager: React.FC<QuizManagerProps> = ({ onSaveQuiz, onCancel, initialQuizData }) => {
  // State for all questions in edit mode
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize with initialQuizData or default when component mounts
  useEffect(() => {
    if (initialQuizData && initialQuizData.length > 0) {
      // Add IDs to existing questions if they don't have them
      const questionsWithIds = initialQuizData.map(question => ({
        ...question,
        id: question.id || generateId()
      }));
      setQuestions(questionsWithIds);
    } else {
      // Default empty question
      setQuestions([{
        id: generateId(),
        type: 'multiple_choice',
        question: '',
        options: ['', ''],
        points: 1
      }]);
    }
  }, [initialQuizData]);

  // Generate a unique ID for new questions
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // Add a new question to the list
  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: generateId(),
        type: 'multiple_choice',
        question: '',
        options: ['', ''],
        points: 1
      }
    ]);
  };

  // Remove a question from the list
  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  // Update question properties
  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  // Handle question type change
  const handleQuestionTypeChange = (id: string, type: QuizQuestion['type']) => {
    const updates: Partial<QuizQuestion> = { type };
    
    if (type === 'multiple_choice') {
      updates.options = ['', ''];
      updates.allowedFileTypes = undefined;
    } else if (type === 'file_upload') {
      updates.options = undefined;
      updates.correctAnswer = undefined;
      updates.allowedFileTypes = ['image/*', 'video/*'];
    } else {
      updates.options = undefined;
      updates.allowedFileTypes = undefined;
    }
    
    updateQuestion(id, updates);
  };

  // Add option to multiple choice question
  const handleAddOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      updateQuestion(questionId, {
        options: [...question.options, '']
      });
    }
  };

  // Update option text
  const handleOptionChange = (questionId: string, index: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = [...question.options];
      const oldValue = newOptions[index];
      newOptions[index] = value;
      
      // If this option was previously set as correct answer, update the correct answer
      const newCorrectAnswer = question.correctAnswer === oldValue ? 
        value : question.correctAnswer;
      
      updateQuestion(questionId, {
        options: newOptions,
        correctAnswer: newCorrectAnswer
      });
    }
  };

  // Remove an option
  const handleRemoveOption = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options && question.options.length > 2) {
      const newOptions = [...question.options];
      const removedOption = newOptions[index];
      newOptions.splice(index, 1);
      
      // If the removed option was the correct answer, reset correctAnswer
      let updatedCorrectAnswer = question.correctAnswer;
      if (updatedCorrectAnswer === removedOption) {
        updatedCorrectAnswer = undefined;
      }
      
      updateQuestion(questionId, {
        options: newOptions,
        correctAnswer: updatedCorrectAnswer
      });
    }
  };

  // Set correct answer for multiple choice
  const setCorrectAnswer = (questionId: string, option: string) => {
    updateQuestion(questionId, { correctAnswer: option });
  };

  // Toggle allowed file types for file upload questions
  const toggleAllowedFileType = (questionId: string, fileType: string, checked: boolean) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const types = question.allowedFileTypes || [];
      updateQuestion(questionId, {
        allowedFileTypes: checked
          ? [...types, fileType]
          : types.filter(t => t !== fileType)
      });
    }
  };

  // Validate all questions
  const validateQuestions = () => {
    for (const question of questions) {
      if (!question.question?.trim()) {
        setError(`Question ${questions.indexOf(question) + 1}: Please enter a question text`);
        return false;
      }

      if (!question.points || question.points < 1) {
        setError(`Question ${questions.indexOf(question) + 1}: Please set a valid point value (minimum 1)`);
        return false;
      }

      if (question.type === 'multiple_choice') {
        if (!question.options || question.options.length < 2) {
          setError(`Question ${questions.indexOf(question) + 1}: Please add at least 2 options`);
          return false;
        }

        if (question.options.some(opt => !opt.trim())) {
          setError(`Question ${questions.indexOf(question) + 1}: Please fill in all options`);
          return false;
        }

        if (!question.correctAnswer) {
          setError(`Question ${questions.indexOf(question) + 1}: Please select a correct answer`);
          return false;
        }
      }

      if (question.type === 'file_upload' && 
          (!question.allowedFileTypes || question.allowedFileTypes.length === 0)) {
        setError(`Question ${questions.indexOf(question) + 1}: Please select at least one allowed file type`);
        return false;
      }
    }
    
    return true;
  };

  // Save the quiz
  const handleSaveQuiz = () => {
    if (questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    if (!validateQuestions()) {
      return;
    }

    try {
      // Remove the id property before saving
      const finalQuestions = questions.map(({ id, ...rest }) => rest);
      onSaveQuiz(finalQuestions as QuizQuestion[]);
      console.log('Quiz saved successfully!');
      setError(null);
    } catch (error) {
      console.error('Error saving quiz:', error);
      setError('Failed to save quiz');
    }
  };

  // Cancel quiz creation
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    // Reset to initial data if provided, otherwise set to default
    if (initialQuizData && initialQuizData.length > 0) {
      const questionsWithIds = initialQuizData.map(question => ({
        ...question,
        id: question.id || generateId()
      }));
      setQuestions(questionsWithIds);
    } else {
      setQuestions([{
        id: generateId(),
        type: 'multiple_choice',
        question: '',
        options: ['', ''],
        points: 1
      }]);
    }
    setError(null);
  };

  return (
    <div className="quiz-manager">
      <h2>{initialQuizData && initialQuizData.length > 0 ? 'Edit Quiz' : 'Create Quiz'}</h2>
      {error && <div className="error-message">{error}</div>}
      
      {questions.map((question, qIndex) => (
        <div key={question.id} className="question-editor">
          <div className="question-header">
            <h3>Question {qIndex + 1}</h3>
            {questions.length > 1 && (
              <button 
                type="button" 
                className="remove-question-btn"
                onClick={() => handleRemoveQuestion(question.id as string)}
              >
                Remove Question
              </button>
            )}
          </div>

          <div className="question-form">
            <div className="form-row">
              <label>
                Question Type:
                <select
                  value={question.type}
                  onChange={(e) => handleQuestionTypeChange(question.id as string, e.target.value as QuizQuestion['type'])}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="file_upload">File Upload</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Question Text:
                <input
                  type="text"
                  value={question.question || ''}
                  onChange={(e) => updateQuestion(question.id as string, { question: e.target.value })}
                  placeholder="Enter your question here"
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Points:
                <input
                  type="number"
                  value={question.points}
                  min="1"
                  onChange={(e) => updateQuestion(question.id as string, { points: parseInt(e.target.value) })}
                />
              </label>
            </div>

            {question.type === 'multiple_choice' && (
              <div className="options-container">
                <h4>Options:</h4>
                {question.options?.map((option, index) => (
                  <div key={index} className="option-input">
                    <input
                      type="radio"
                      name={`correctAnswer-${question.id}`}
                      checked={question.correctAnswer === option}
                      onChange={() => setCorrectAnswer(question.id as string, option)}
                      id={`option-radio-${question.id}-${index}`}
                    />
                    <label htmlFor={`option-radio-${question.id}-${index}`}>
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => handleOptionChange(question.id as string, index, e.target.value)}
                      />
                    </label>
                    {question.options && question.options.length > 2 && (
                      <button 
                        type="button" 
                        className="remove-option-btn"
                        onClick={() => handleRemoveOption(question.id as string, index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  className="add-option-btn" 
                  onClick={() => handleAddOption(question.id as string)}
                >
                  Add Option
                </button>
              </div>
            )}

            {question.type === 'file_upload' && (
              <div className="file-upload-options">
                <h4>Allowed File Types:</h4>
                <div className="checkbox-container">
                  <label>
                    <input
                      type="checkbox"
                      checked={question.allowedFileTypes?.includes('image/*')}
                      onChange={(e) => toggleAllowedFileType(question.id as string, 'image/*', e.target.checked)}
                    />
                    Images
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={question.allowedFileTypes?.includes('video/*')}
                      onChange={(e) => toggleAllowedFileType(question.id as string, 'video/*', e.target.checked)}
                    />
                    Videos
                  </label>
                </div>
              </div>
            )}
          </div>
          <hr />
        </div>
      ))}
      
      <div className="quiz-actions">
        <button type="button" className="add-question-btn" onClick={handleAddQuestion}>
          + Add Another Question
        </button>
        
        <div className="save-cancel-buttons">
          <button className="save-quiz-button" type="button" onClick={handleSaveQuiz}>
            Save Quiz
          </button>
          <button className="cancel-quiz-button" type="button" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizManager;