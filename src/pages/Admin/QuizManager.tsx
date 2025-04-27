// QuizManager.tsx
import React, { useState } from 'react';
import './QuizManager.css';

interface QuizQuestion {
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
}

const QuizManager: React.FC<QuizManagerProps> = ({onSaveQuiz }) => {
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<Partial<QuizQuestion>>({
    type: 'multiple_choice',
    question: '',
    options: ['', ''],
    points: 1
  });

  const handleQuestionTypeChange = (type: QuizQuestion['type']) => {
    setCurrentQuestion({
      ...currentQuestion,
      type,
      options: type === 'multiple_choice' ? ['', ''] : undefined,
      allowedFileTypes: type === 'file_upload' ? ['image/*', 'video/*'] : undefined
    });
  };

  const handleAddOption = () => {
    if (currentQuestion.options) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, '']
      });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    if (currentQuestion.options) {
      const newOptions = [...currentQuestion.options];
      newOptions[index] = value;
      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions
      });
    }
  };

  const handleAddQuestion = () => {
    // Validate basic question requirements
    if (!currentQuestion.question?.trim()) {
      setError('Please enter a question');
      return;
    }

    if (!currentQuestion.points || currentQuestion.points < 1) {
      setError('Please set a valid point value (minimum 1)');
      return;
    }

    // Type-specific validation
    if (currentQuestion.type === 'multiple_choice') {
      // Check if there are at least 2 options
      if (!currentQuestion.options || currentQuestion.options.length < 2) {
        setError('Please add at least 2 options for multiple choice questions');
        return;
      }

      // Check if all options have content
      if (currentQuestion.options.some(opt => !opt.trim())) {
        setError('Please fill in all options');
        return;
      }

      // Check if a correct answer is selected
      if (!currentQuestion.correctAnswer) {
        setError('Please select a correct answer');
        return;
      }
    }

    if (currentQuestion.type === 'short_answer' && !currentQuestion.correctAnswer?.trim()) {
      setError('Please enter a correct answer for the short answer question');
      return;
    }

    if (currentQuestion.type === 'file_upload' && 
        (!currentQuestion.allowedFileTypes || currentQuestion.allowedFileTypes.length === 0)) {
      setError('Please select at least one allowed file type');
      return;
    }

    const newQuestion: QuizQuestion = {
      type: currentQuestion.type!,
      question: currentQuestion.question!,
      points: currentQuestion.points || 1,
      ...(currentQuestion.type === 'multiple_choice' && {
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer
      }),
      ...(currentQuestion.type === 'short_answer' && {
        correctAnswer: currentQuestion.correctAnswer
      }),
      ...(currentQuestion.type === 'file_upload' && {
        allowedFileTypes: currentQuestion.allowedFileTypes
      })
    };

    setCurrentQuiz([...currentQuiz, newQuestion]);
    setError(null);

    // Reset current question
    setCurrentQuestion({
      type: 'multiple_choice',
      question: '',
      options: ['', ''], // Initialize with two empty options
      points: 1,
      correctAnswer: undefined // Reset correct answer
    });
  };

  const handleRemoveQuestion = (index: number) => {
    const updatedQuiz = [...currentQuiz];
    updatedQuiz.splice(index, 1);
    setCurrentQuiz(updatedQuiz);
  };

  const handleSaveQuiz = async () => {
    try {
      if (currentQuiz.length === 0) {
        setError('Please add at least one question');
        return;
      }

      // Pass the quiz data to the parent component
      onSaveQuiz(currentQuiz);
      
      console.log('Quiz saved successfully!');

      // Reset form
      setCurrentQuiz([]);
      setError(null);
    } catch (error) {
      console.error('Error saving quiz:', error);
      setError('Failed to save quiz');
    }
  };

  return (
    <div className="quiz-manager">
      <div className="question-creator">
        <h3>Add New Question</h3>

        <select
          value={currentQuestion.type}
          onChange={(e) => handleQuestionTypeChange(e.target.value as QuizQuestion['type'])}
        >
          <option value="multiple_choice">Multiple Choice</option>
          <option value="short_answer">Short Answer</option>
          <option value="file_upload">File Upload</option>
        </select>

        <input
          type="text"
          placeholder="Question Text"
          value={currentQuestion.question || ''}
          onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
        />

        <input
          type="number"
          placeholder="Points"
          value={currentQuestion.points}
          min="1"
          onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
        />

        {currentQuestion.type === 'multiple_choice' && (
          <div className="options-container">
            {currentQuestion.options?.map((option, index) => (
              <div key={index} className="option-input">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={currentQuestion.correctAnswer === option}
                  onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: option })}
                />
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                />
              </div>
            ))}
            <button type="button" onClick={handleAddOption}>Add Option</button>
          </div>
        )}

        {currentQuestion.type === 'short_answer' && (
          <input
            type="text"
            placeholder="Correct Answer"
            value={currentQuestion.correctAnswer || ''}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
          />
        )}

        {currentQuestion.type === 'file_upload' && (
          <div className="file-upload-options">
            <label>Allowed File Types:</label>
            <div className="checkbox-container">
              <label>
                <input
                  type="checkbox"
                  checked={currentQuestion.allowedFileTypes?.includes('image/*')}
                  onChange={(e) => {
                    const types = currentQuestion.allowedFileTypes || [];
                    setCurrentQuestion({
                      ...currentQuestion,
                      allowedFileTypes: e.target.checked
                        ? [...types, 'image/*']
                        : types.filter(t => t !== 'image/*')
                    });
                  }}
                />
                Images
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={currentQuestion.allowedFileTypes?.includes('video/*')}
                  onChange={(e) => {
                    const types = currentQuestion.allowedFileTypes || [];
                    setCurrentQuestion({
                      ...currentQuestion,
                      allowedFileTypes: e.target.checked
                        ? [...types, 'video/*']
                        : types.filter(t => t !== 'video/*')
                    });
                  }}
                />
                Videos
              </label>
            </div>
          </div>
        )}

        <button type="button" onClick={handleAddQuestion}>Add Question</button>
        {error && <div className="error-message">{error}</div>}
      </div>

      {currentQuiz.length > 0 && (
        <div className="questions-preview">
          <h3>Questions Preview</h3>
          {currentQuiz.map((q, index) => (
            <div key={index} className="question-preview">
              <h4>Question {index + 1}: {q.question}</h4>
              <p>Type: {q.type}</p>
              <p>Points: {q.points}</p>
              {q.options && (
                <div>
                  <p>Options:</p>
                  <ul>
                    {q.options.map((opt, i) => (
                      <li 
                        key={i} 
                        className={opt === q.correctAnswer ? 'correct-answer' : ''}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {q.type === 'short_answer' && (
                <p>Correct Answer: <span className="correct-answer">{q.correctAnswer}</span></p>
              )}
              {q.type === 'file_upload' && (
                <p>Allowed Files: {q.allowedFileTypes?.join(', ')}</p>
              )}
              <button type="button" onClick={() => handleRemoveQuestion(index)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <button className="save-quiz-button" type="button" onClick={handleSaveQuiz}>
        Save Quiz
      </button>
    </div>
  );
};

export default QuizManager;