import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { auth, db, storage } from '../../firebase';
import { Timestamp } from 'firebase/firestore';
import './Assignment.css';
import { useAdmin } from '../../hooks/useAdmin';
import Homework from './Homework';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import EditDraft from '../Admin/EditDraft';
import { File, Download, RefreshCw } from 'lucide-react';

// Define the quiz question interface
interface QuizQuestion {
  type: 'multiple_choice' | 'short_answer' | 'file_upload';
  question: string;
  options?: string[]; // For multiple choice questions
  correctAnswer?: string; // For multiple choice and short answer questions
  allowedFileTypes?: string[]; // For file upload questions
  points: number;
}

// Define the quiz submission interface
interface QuizSubmission {
  questionId: number;
  answer?: string; // For multiple choice and short answer
  fileURL?: string; // For file upload
  originalFilename?: string; // For file upload
  isCorrect?: boolean; // For multiple choice and short answer
}

interface guideFile {
  name: string;
  url: string;
}


const Assignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Homework | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{[key: number]: File | null}>({});
  const [answers, setAnswers] = useState<{[key: number]: string}>({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradingSuccess, setGradingSuccess] = useState<string | null>(null);
  const { isAdmin } = useAdmin(auth, db);
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid;
  const [feedback, setFeedback] = useState<{[key: number]: {isCorrect: boolean, message: string}}>({});

  const courseId = '9MPz8i5c4izfgxrapfc7';

  // Handle file changes for specific question
  const handleFileChange = (questionId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(prev => ({
        ...prev,
        [questionId]: e.target.files?.[0] || null
      }));
    }
  };

  // Handle answer changes for multiple choice or short answer questions
  const handleAnswerChange = (questionId: number, value: string) => {
    // Prevent unnecessary state updates if the value hasn't changed
    if (answers[questionId] === value) return;
    
    // Use functional update to ensure we're using the latest state
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!currentUser) {
      setError('You must be logged in to submit.');
      return;
    }
    
  
    try {
      const quizSubmissions: QuizSubmission[] = [];
      
      // Track correct answers
      let correctCount = 0;
      let totalMultipleChoice = 0;
      let newFeedback: {[key: number]: {isCorrect: boolean, message: string}} = {};
      
      // Process each question's answer
      if (assignment?.quiz) {
        for (let i = 0; i < assignment.quiz.length; i++) {
          const question = assignment.quiz[i];
          const questionSubmission: QuizSubmission = { questionId: i };
          
          if (question.type === 'file_upload') {
            const file = selectedFiles[i];
            if (!file) {
              setError(`Please select a file for question ${i + 1}.`);
              return;
            }
            
            // Upload file to storage
            const storageRef = ref(storage, `submissions/${currentUserId}/${id}/${i}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file, {
              contentType: file.type,
            });
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            questionSubmission.fileURL = downloadURL;
            questionSubmission.originalFilename = file.name;
          } else {
            // For multiple choice and short answer
            const answer = answers[i];
            if (!answer) {
              setError(`Please provide an answer for question ${i + 1}.`);
              return;
            }
            questionSubmission.answer = answer;
            
            // Check if multiple choice answer is correct
            if (question.type === 'multiple_choice' && question.correctAnswer) {
              totalMultipleChoice++;
              if (answer === question.correctAnswer) {
                correctCount++;
                questionSubmission.isCorrect = true;
                newFeedback[i] = {
                  isCorrect: true,
                  message: 'Correct! Great job!'
                };
              } else {
                questionSubmission.isCorrect = false;
                newFeedback[i] = {
                  isCorrect: false,
                  message: `Incorrect. The correct answer is: ${question.correctAnswer}`
                };
              }
            }
          }
          
          quizSubmissions.push(questionSubmission);
        }
      }

      // Set feedback immediately for visual indicators
      setFeedback(newFeedback);
      setSubmitted(true);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 100);
      
  
      // Update Firestore with all submissions
      const courseRef = doc(db, 'courses', courseId);
      
      await runTransaction(db, async (transaction) => {
        const courseSnap = await transaction.get(courseRef);
        if (!courseSnap.exists()) throw new Error('Course not found');
  
        const homeworkArray = courseSnap.data().homework || [];
        const homeworkIndex = homeworkArray.findIndex((hw: any) => hw.id === id);
        if (homeworkIndex === -1) throw new Error('Homework not found');
  
        const updatedHomework = [...homeworkArray];
        
        // Create the submission object with score data
        const submissionData = {
          userId: currentUserId ? currentUserId : '',
          quizAnswers: quizSubmissions,
          timestamp: Timestamp.now(),
          score: {
            correct: correctCount,
            total: totalMultipleChoice,
            percentage: totalMultipleChoice > 0 ? Math.round((correctCount / totalMultipleChoice) * 100) : 0
          }
        };
  
        // Update or add submission
        const existingSubmissionIndex = updatedHomework[homeworkIndex].submittedFiles?.findIndex(
          (s: { userId: string; }) => s.userId === currentUserId
        ) ?? -1;
        
        if (existingSubmissionIndex >= 0) {
          // Update existing submission
          updatedHomework[homeworkIndex].submittedFiles[existingSubmissionIndex] = {
            ...updatedHomework[homeworkIndex].submittedFiles[existingSubmissionIndex],
            ...submissionData
          };
        } else {
          // Add new submission
          updatedHomework[homeworkIndex].submittedFiles = [
            ...(updatedHomework[homeworkIndex].submittedFiles || []),
            submissionData
          ];
        }
        
        // Mark as submitted
        updatedHomework[homeworkIndex].submitted = {
          ...updatedHomework[homeworkIndex].submitted,
          [currentUserId ?? '']: true,
        };
  
        transaction.update(courseRef, { homework: updatedHomework });
      });
  
      // Fetch the updated assignment data
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      const updatedHomework = courseDoc.data()?.homework || [];
      const updatedAssignment = updatedHomework.find((hw: Homework) => hw.id === id);
      setAssignment(updatedAssignment);
      setError(null);
    } catch (error) {
      console.error('Submission failed:', error);
      setError(`Submission failed: ${(error as Error).message}`);
    }
  };

  // Restart quiz function - reset states
  const handleRestartQuiz = () => {
    setAnswers({});
    setSelectedFiles({});
    setSubmitted(false);
    setFeedback({});
    setError(null);
    setTimeout(() => {
      const quizContainer = document.querySelector('.quiz-container');
      if (quizContainer) {
        quizContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };
  

  // New function to mark short answer questions as correct or incorrect
  const markShortAnswer = async (
    submissionIndex: number, 
    questionId: number, 
    isCorrect: boolean
  ) => {
    try {
      if (!assignment) return;
      
      const courseId = '9MPz8i5c4izfgxrapfc7';
      const courseRef = doc(db, 'courses', courseId);
      
      await runTransaction(db, async (transaction) => {
        const courseSnap = await transaction.get(courseRef);
        if (!courseSnap.exists()) throw new Error('Course not found');
        
        const homeworkArray = courseSnap.data().homework || [];
        const homeworkIndex = homeworkArray.findIndex((hw: any) => hw.id === id);
        if (homeworkIndex === -1) throw new Error('Homework not found');
        
        const updatedHomework = [...homeworkArray];
        
        // Get the current submission
        const submission = updatedHomework[homeworkIndex].submittedFiles[submissionIndex];
        const quizAnswers = [...submission.quizAnswers];
        
        // Find the answer for this question
        const answerIndex = quizAnswers.findIndex(a => a.questionId === questionId);
        if (answerIndex >= 0) {
          // Update the answer as correct or incorrect
          quizAnswers[answerIndex] = {
            ...quizAnswers[answerIndex],
            isCorrect
          };
        }
        
        // Recalculate scores
        let correctCount = 0;
        let totalQuestions = 0;
        
        quizAnswers.forEach(answer => {
          if (answer.isCorrect !== undefined) {
            totalQuestions++;
            if (answer.isCorrect) {
              correctCount++;
            }
          }
        });
        
        // Update the submission with new quiz answers and score
        updatedHomework[homeworkIndex].submittedFiles[submissionIndex] = {
          ...submission,
          quizAnswers,
          score: {
            correct: correctCount,
            total: totalQuestions,
            percentage: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
          }
        };
        
        transaction.update(courseRef, { homework: updatedHomework });
      });
      
      // Fetch the updated assignment data
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      const updatedHomework = courseDoc.data()?.homework || [];
      const updatedAssignment = updatedHomework.find((hw: Homework) => hw.id === id);
      setAssignment(updatedAssignment);
      setGradingSuccess("Short answer graded successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setGradingSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Grading failed:', error);
      setError(`Grading failed: ${(error as Error).message}`);
    }
  };

  // Fetch assignment data
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
          
          // If user has already submitted, fetch and populate their answers
          if (userSubmissionStatus && currentUserId) {
            const userSubmission = assignmentWithTimestamps.submittedFiles?.find(
              (s: { userId: string; }) => s.userId === currentUserId
            );
            
            if (userSubmission?.quizAnswers) {
              // Populate answers state
              const answerMap: {[key: number]: string} = {};
              const feedbackMap: {[key: number]: {isCorrect: boolean, message: string}} = {};
              
              userSubmission.quizAnswers.forEach((qa: QuizSubmission) => {
                if (qa.answer) {
                  answerMap[qa.questionId] = qa.answer;
                  
                  // Get the question to determine correct answer
                  const question = assignmentWithTimestamps.quiz?.[qa.questionId];
                  if (question && qa.isCorrect !== undefined) {
                    feedbackMap[qa.questionId] = {
                      isCorrect: qa.isCorrect,
                      message: qa.isCorrect 
                        ? 'Correct! Great job!' 
                        : `Incorrect. The correct answer is: ${question.correctAnswer}`
                    };
                  }
                }
              });
              
              setAnswers(answerMap);
              setFeedback(feedbackMap);
            }
          }
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
  }, [id, navigate, currentUserId]);

  

  // Render quiz questions
  const renderQuizQuestion = (question: QuizQuestion, index: number) => {
    switch (question.type) {
      case 'multiple_choice':
  return (
    <div className="quiz-question multiple-choice" key={index}>
      <h3>
        Question {index + 1}{' '}
        <span className="points">({question.points} points)</span>
      </h3>
      <p>{question.question}</p>
      <div className="options">
        {question.options?.map((option, optionIndex) => {
          // Pre-compute the class names to avoid complex inline logic
          const isSelected = answers[index] === option;
          const showFeedback = submitted && isSelected;
          const isCorrect = showFeedback && feedback[index]?.isCorrect;
          const isIncorrect = showFeedback && !feedback[index]?.isCorrect;
          
          let className = "option";
          if (isSelected) className += " selected";
          if (isCorrect) className += " correct";
          if (isIncorrect) className += " incorrect";
          
          return (
            <label 
              className={className}
              key={optionIndex}
              htmlFor={`q${index}-o${optionIndex}`}
            >
              <input
                type="radio"
                id={`q${index}-o${optionIndex}`}
                name={`question-${index}`}
                value={option}
                checked={isSelected}
                onChange={() => {
                  if (!submitted) handleAnswerChange(index, option);
                }}
                disabled={submitted}
              />
              {option}
            </label>
          );
        })}
      </div>
      {submitted && feedback[index] && (
        <div className={`feedback ${feedback[index].isCorrect ? 'correct' : 'incorrect'}`}>
          {feedback[index].message}
        </div>
      )}
    </div>
  );
  
      case 'short_answer':
        return (
          <div className="quiz-question short-answer" key={index}>
            <h3>
              Question {index + 1}{' '}
              <span className="points">({question.points} points)</span>
            </h3>
            <p>{question.question}</p>
            <textarea
              value={answers[index] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              disabled={submitted}
              placeholder="Your answer here..."
              rows={4}
            />
          </div>
        );
  
      case 'file_upload':
        return (
          <div className="quiz-question file-upload" key={index}>
            <h3>
              Question {index + 1}{' '}
              <span className="points">({question.points} points)</span>
            </h3>
            <p>{question.question}</p>
            {submitted ? (
              <p>
                File submitted:{' '}
                {assignment?.submittedFiles?.find((s) => s.userId === currentUserId)?.quizAnswers?.[index]
                  ?.originalFilename || 'No file'}
              </p>
            ) : (
              <div
                className="upload-box"
                onClick={() => document.getElementById(`file-upload-${index}`)?.click()}
              >
                <svg
                  className="file-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                  <line x1="9" y1="11" x2="15" y2="11"></line>
                </svg>
                <p className="upload-text">Click to upload a file</p>
                <input
                  id={`file-upload-${index}`}
                  type="file"
                  onChange={(e) => handleFileChange(index, e)}
                  required
                  accept={question.allowedFileTypes?.join(',')}
                  style={{ display: 'none' }} // Hide the file input
                />
                {selectedFiles[index] && (
                  <p className="selected-file">{selectedFiles[index]?.name}</p>
                )}
              </div>
            )}
            {question.allowedFileTypes && (
              <p className="file-types">
                Allowed file types: {question.allowedFileTypes.join(', ')}
              </p>
            )}
          </div>
        );
  
      default:
        return <div key={index}>Unknown question type</div>;
    }
  };
  

  const renderAdminSubmissions = () => {
    if (!assignment?.submittedFiles || assignment.submittedFiles.length === 0) {
      return <p>No submissions yet</p>;
    }
  
    return (
      <div className="admin-submissions">
        {gradingSuccess && <div className="success-message">{gradingSuccess}</div>}
        {assignment.submittedFiles.map((submission, subIndex) => (
          <details key={subIndex} className="submission-details">
            <summary>
              <strong>User:</strong> {submission.userId} - 
              <span className="submission-date">
                {submission.timestamp?.toDate?.().toLocaleString() || 'Unknown date'}
              </span>
              {submission.score && (
                <span className="submission-score">
                  Score: {submission.score.correct}/{submission.score.total} ({submission.score.percentage}%)
                </span>
              )}
            </summary>
            <div className="submission-answers">
              {submission.quizAnswers?.map((answer: QuizSubmission, answerIndex: number) => {
                const question = assignment.quiz?.[answer.questionId];
                if (!question) return null;
                
                return (
                  <div key={answerIndex} className={`answer-item ${answer.isCorrect !== undefined ? (answer.isCorrect ? 'correct' : 'incorrect') : ''}`}>
                    <h4>Question {answer.questionId + 1}: {question.question}</h4>
                    {question.type === 'file_upload' ? (
                      <p>
                        <strong>File:</strong> <a href={answer.fileURL}>{answer.originalFilename}</a>
                      </p>
                    ) : (
                      <>
                        <p><strong>Answer:</strong> {answer.answer}</p>
                        {question.correctAnswer && (
                          <p><strong>Correct Answer:</strong> {question.correctAnswer}</p>
                        )}
                        {answer.isCorrect !== undefined && (
                          <div className={`answer-status ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                            {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </div>
                        )}
                        
                        {/* Add grading buttons for short answer questions */}
                        {question.type === 'short_answer' && (
                          <div className="grading-buttons">
                            <button 
                              className={`grade-button correct ${answer.isCorrect === true ? 'active' : ''}`}
                              onClick={() => markShortAnswer(subIndex, answer.questionId, true)}
                            >
                              Mark Correct
                            </button>
                            <button 
                              className={`grade-button incorrect ${answer.isCorrect === false ? 'active' : ''}`}
                              onClick={() => markShortAnswer(subIndex, answer.questionId, false)}
                            >
                              Mark Incorrect
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    );
  };

  //Add this to the student view when quiz is submitted
  const renderStudentScore = () => {
    if (!submitted || !currentUserId) return null;
    
    const userSubmission = assignment?.submittedFiles?.find(s => s.userId === currentUserId);
    if (!userSubmission || !userSubmission.score) return null;
    
    return (
      <div className="student-score">
        <h3>Your Score</h3>
        <p className="score-display">
          You answered {userSubmission.score.correct} out of {userSubmission.score.total} questions correctly.
          <span className="score-percentage">Score: {userSubmission.score.percentage}%</span>
        </p>
        <button 
          onClick={handleRestartQuiz} 
          className="restart-button"
        >
          <RefreshCw size={16} className="mr-2" /> Restart Quiz
        </button>
      </div>
    );
  };

  const FileItem = ({ file, index }: { file: guideFile; index: number }) => {
    const [videoError, setVideoError] = useState(false);
  
    const getFileType = (fileName: string): 'image' | 'video' | 'other' => {
      const extension = fileName.split('.').pop()?.toLowerCase();
      if (extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
        return 'image';
      }
      if (extension && ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) {
        return 'video';
      }
      return 'other';
    };
  
    const fileType = getFileType(file.name);
  
    return (
      <div key={index} className="flex flex-col items-center p-4 border rounded-lg shadow-sm bg-white mb-4">

        
        {/* File Icon and Name */}
        <div className="flex items-center mb-4">
          <File size={20} className="mr-2 text-blue-500" />
          <span className="font-medium">{file.name}</span>
        </div>
        
        {/* Media Preview Section */}
        {fileType === 'image' && (
          <div >
            <img 
              src={file.url} 
              alt={file.name}
              style={{ maxHeight: '250px'}}
            />
          </div>
        )}


      
      {fileType === 'video' && !videoError && (
        <div className="mb-4 w-full flex justify-center video-container">
          <video 
            className="stable-video"
            src={file.url}
            controls
            style={{ maxHeight: '250px'}}
            onError={() => setVideoError(true)}
            preload="metadata"
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

        
        {/* Download Button */}
        <a 
          href={file.url} 
          download={file.name}
          className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors w-full max-w-xs mt-2"
        >
          <Download size={16} className="mr-2" /> Download
        </a>
      </div>
    );
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="assignment-container">
      <h1>{assignment?.name}</h1>
      
      {/* Assignment details */}
      <div className="assignment-info">
        {isAdmin ? (
          <EditDraft courseId={courseId} isEdit={true} homeworkId={assignment?.id}/>
        
        ) : (
          /* Student view */
          <>
            <p><strong>Description: </strong> {assignment?.assignmentDescription}</p>
            <p><strong>Assigned Date: </strong> 
              {assignment?.assignedDate?.toDate().toLocaleDateString()}
            </p>
            <p><strong>Due Date: </strong> 
              {assignment?.dueDate?.toDate().toLocaleDateString()}
            </p>
          </>
        )}
      </div>
      
      {/* Files section - Added this new section */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">Guides</h2>
        {!assignment?.files || assignment.files.length === 0 ? (
          <p className="text-gray-500">No files attached to this assignment.</p>
        ) : (
          <div className="files-list">
            {assignment.files.map((file, index) => <FileItem key={index} file={file} index={index} />)}
          </div>
        )}
      </div>
      
      {/* Quiz section for students */}
      {!isAdmin && (
        <div className="quiz-container mt-6">
          <h2 className="text-xl font-semibold mb-3">Quiz Questions</h2>
          {assignment?.quiz?.length === 0 ? (
            <p className="text-gray-500">No quiz questions available for this assignment.</p>
          ) : (
            <>
              <div className="quiz-questions">
                {assignment?.quiz?.map((question, index) => 
                  renderQuizQuestion(question, index)
                )}
              </div>
              
              {!submitted && (
                <>
                  {error && <p className="error-message text-red-500">{error}</p>}
                  <button 
                    onClick={handleSubmit} 
                    className="submit-button bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded mt-4"
                  >
                    Submit Answers
                  </button>
                </>
              )}
              
              {submitted && (
                <div className="submission-success bg-green-50 border border-green-200 rounded-md p-4 mt-4">
                  <h3 className="font-semibold text-green-800">Assignment Submitted</h3>
                  <p className="text-green-700">Your answers have been recorded.</p>
                  {renderStudentScore()}
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Admin submissions view */}
      {isAdmin && (
        <div className="admin-view mt-6">
          <h2 className="text-xl font-semibold mb-3">Student Submissions</h2>
          {renderAdminSubmissions()}
        </div>
      )}
    </div>
  );
}

export default Assignment;