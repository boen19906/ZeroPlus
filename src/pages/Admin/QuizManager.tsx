import React, { useState } from 'react';
import { getFirestore, collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './QuizManager.css';

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'file_upload';
  question: string;
  options?: string[];  // For multiple choice questions
  correctAnswer?: string;  // For multiple choice and short answer questions
  allowedFileTypes?: string[];  // For file upload questions
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  questions: QuizQuestion[];
  isPublished: boolean;
}

interface FileUploadState {
  file: File | null;
  uploading: boolean;
  uploadProgress: number;
  uploadedUrl: string;
}

const QuizManager: React.FC = () => {
  const [currentQuiz, setCurrentQuiz] = useState<Quiz>({
    id: '',
    title: '',
    description: '',
    dueDate: new Date(),
    questions: [],
    isPublished: false
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<QuizQuestion>>({
    type: 'multiple_choice',
    question: '',
    options: [''],
    points: 1
  });

  const [fileUpload, setFileUpload] = useState<FileUploadState>({
    file: null,
    uploading: false,
    uploadProgress: 0,
    uploadedUrl: ''
  });

  const db = getFirestore();
  const storage = getStorage();

  const handleQuestionTypeChange = (type: QuizQuestion['type']) => {
    setCurrentQuestion({
      ...currentQuestion,
      type,
      options: type === 'multiple_choice' ? [''] : undefined,
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
      alert('Please enter a question');
      return;
    }

    if (!currentQuestion.points || currentQuestion.points < 1) {
      alert('Please set a valid point value (minimum 1)');
      return;
    }

    // Type-specific validation
    if (currentQuestion.type === 'multiple_choice') {
      // Check if there are at least 2 options
      if (!currentQuestion.options || currentQuestion.options.length < 2) {
        alert('Please add at least 2 options for multiple choice questions');
        return;
      }

      // Check if all options have content
      if (currentQuestion.options.some(opt => !opt.trim())) {
        alert('Please fill in all options');
        return;
      }

      // Check if a correct answer is selected
      if (!currentQuestion.correctAnswer) {
        alert('Please select a correct answer');
        return;
      }
    }

    if (currentQuestion.type === 'short_answer' && !currentQuestion.correctAnswer?.trim()) {
      alert('Please enter a correct answer for the short answer question');
      return;
    }

    if (currentQuestion.type === 'file_upload' && 
        (!currentQuestion.allowedFileTypes || currentQuestion.allowedFileTypes.length === 0)) {
      alert('Please select at least one allowed file type');
      return;
    }

    const newQuestion: QuizQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      type: currentQuestion.type!,
      question: currentQuestion.question,
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

    setCurrentQuiz({
      ...currentQuiz,
      questions: [...currentQuiz.questions, newQuestion]
    });

    // Reset current question
    setCurrentQuestion({
      type: 'multiple_choice',
      question: '',
      options: ['', ''], // Initialize with two empty options
      points: 1,
      correctAnswer: undefined // Reset correct answer
    });
  };

  const handleSaveQuiz = async () => {
    try {
      if (!currentQuiz.title) {
        alert('Please enter a quiz title');
        return;
      }

      if (currentQuiz.questions.length === 0) {
        alert('Please add at least one question');
        return;
      }

      const quizData = {
        ...currentQuiz,
        dueDate: currentQuiz.dueDate.toISOString(),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'quizzes'), quizData);
      alert('Quiz saved successfully!');
      
      // Reset form
      setCurrentQuiz({
        id: '',
        title: '',
        description: '',
        dueDate: new Date(),
        questions: [],
        isPublished: false
      });
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Failed to save quiz');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file type is allowed
    const fileType = file.type.split('/')[0]; // 'image' or 'video'
    const isAllowedType = currentQuestion.allowedFileTypes?.some(type => 
      type.startsWith(fileType)
    );

    if (!isAllowedType) {
      alert('Selected file type is not allowed');
      return;
    }

    setFileUpload(prev => ({
      ...prev,
      file,
      uploading: true,
      uploadProgress: 0
    }));

    try {
      // Create a reference to the file in Firebase Storage
      const storageRef = ref(storage, `quiz-files/${Date.now()}-${file.name}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setFileUpload(prev => ({
        ...prev,
        uploading: false,
        uploadProgress: 100,
        uploadedUrl: downloadURL
      }));

      // Update current question with the file URL
      setCurrentQuestion(prev => ({
        ...prev,
        correctAnswer: downloadURL // Store the download URL as the correct answer
      }));

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      setFileUpload(prev => ({
        ...prev,
        uploading: false,
        uploadProgress: 0
      }));
    }
  };

  return (
    <div className="quiz-manager">
      <h2>Create New Quiz</h2>
      
      <div className="quiz-details">
        <input
          type="text"
          placeholder="Quiz Title"
          value={currentQuiz.title}
          onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
        />
        <textarea
          placeholder="Quiz Description"
          value={currentQuiz.description}
          onChange={(e) => setCurrentQuiz({ ...currentQuiz, description: e.target.value })}
        />
        <input
          type="datetime-local"
          value={currentQuiz.dueDate.toISOString().slice(0, 16)}
          onChange={(e) => setCurrentQuiz({ ...currentQuiz, dueDate: new Date(e.target.value) })}
        />
      </div>

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
          value={currentQuestion.question}
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
            <button onClick={handleAddOption}>Add Option</button>
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

            <div className="file-upload-input">
              <input
                type="file"
                accept={currentQuestion.allowedFileTypes?.join(',')}
                onChange={handleFileSelect}
                className="file-input"
              />
              {fileUpload.uploading && (
                <div className="upload-progress">
                  Uploading... {fileUpload.uploadProgress}%
                </div>
              )}
              {fileUpload.uploadedUrl && (
                <div className="upload-preview">
                  {fileUpload.file?.type.startsWith('image/') ? (
                    <img src={fileUpload.uploadedUrl} alt="Upload preview" />
                  ) : (
                    <video src={fileUpload.uploadedUrl} controls />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={handleAddQuestion}>Add Question</button>
      </div>

      {currentQuiz.questions.length > 0 && (
        <div className="questions-preview">
          <h3>Questions Preview</h3>
          {currentQuiz.questions.map((q, index) => (
            <div key={q.id} className="question-preview">
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
            </div>
          ))}
        </div>
      )}

      <button className="save-quiz-button" onClick={handleSaveQuiz}>
        Save Quiz
      </button>
    </div>
  );
};

export default QuizManager; 