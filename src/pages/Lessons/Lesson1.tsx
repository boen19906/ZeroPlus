import React from "react";
import { useNavigate } from "react-router-dom";
import "./Lesson.css";
import { useQuizCheck } from "../../hooks/useQuiz";
import useScrollToTop from "../../hooks/useScroll";

const Lesson1 = () => {
  const navigate = useNavigate();
  
  
  // Define your questions with IDs and correct answers
  const questions = [
    { 
      id: 1, 
      correctAnswer: 'A', 
      text: 'What is financial literacy?',
      options: [
        { value: 'A', text: 'The ability to manage money' },
        { value: 'B', text: 'The process of investing in stocks' },
        { value: 'C', text: 'A plan for spending and saving' },
        { value: 'D', text: 'The study of economics' }
      ]
    },
    {
      id: 2,
      correctAnswer: 'C',
      text: 'Which of the following is an example of a financial goal?',
      options: [
        { value: 'A', text: 'Getting a promotion at work' },
        { value: 'B', text: 'Improving your cooking skills' },
        { value: 'C', text: 'Saving for retirement' },
        { value: 'D', text: 'Running a marathon' }
      ]
    },
    {
      id: 3,
      correctAnswer: 'B',
      text: 'What is a budget?',
      options: [
        { value: 'A', text: 'A type of investment account' },
        { value: 'B', text: 'A plan for how to spend and save money' },
        { value: 'C', text: 'A type of loan with low interest' },
        { value: 'D', text: 'Money set aside for emergencies' }
      ]
    }
  ];
  useScrollToTop();
  
  const {
    selectedAnswers,
    selectAnswer,
    isSubmitted,
    correctness,
    correctCount,
    handleAllAnswersCheck,
    resetQuiz
  } = useQuizCheck(questions);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
  
    const fileDisplay = document.querySelector('.selected-file');
    if (fileDisplay) {
      fileDisplay.textContent = file ? file.name : 'No file selected';
    }
  };
  
  return (
    <div className="lesson-container">
      <div className="lesson-content">
        <h1>Introduction to Financial Literacy</h1>
        <p>Welcome to your first lesson! In this module, we'll explore the fundamentals of financial literacy and why it matters for your future. Get ready to learn essential concepts that will help you make better financial decisions.</p>

        {/* YouTube Video Embed */}
        <div className="video-container">
          <iframe
            width="100%"
            height="400"
            src="https://www.youtube.com/embed/4XZIv4__sQA"
            title="Introduction to Financial Literacy"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        
        <div className="questions">
          <h2>Knowledge Check</h2>
          {questions.map((question) => {
            const isAnswerCorrect = correctness[question.id];
            const selectedAnswer = selectedAnswers[question.id];
            
            return (
              <div className="question" key={question.id}>
                <h2>Question {question.id}: {question.text}</h2>
                <ul>
                  {question.options.map(option => (
                    <li 
                      key={option.value}
                      onClick={() => !isSubmitted && selectAnswer(question.id, option.value)}
                      className={`
                        ${selectedAnswer === option.value ? "selected" : ""}
                        ${isSubmitted && selectedAnswer === option.value && isAnswerCorrect ? "correct" : ""}
                        ${isSubmitted && selectedAnswer === option.value && !isAnswerCorrect ? "incorrect" : ""}
                      `}
                    >
                      {option.value}. {option.text}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          
          <div className="video-submission">
            <h2>🎥 Share Your Financial Journey</h2>
            <label htmlFor="video-upload" className="upload-box">
              <svg className="video-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
              </svg>
              <div className="upload-text">Record a 2-minute video explaining your financial goals</div>
              <input 
                type="file" 
                accept="video/*" 
                id="video-upload" 
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
            <div className="selected-file">No file selected</div>
          </div>
        </div>

        {!isSubmitted ? (
          <button className="submit-button" onClick={handleAllAnswersCheck}>Check Answers</button>
        ) : (
          <div className="quiz-results">
            <h3>🎉 Quiz Results</h3>
            <p>You got <span>{correctCount} out of {questions.length}</span> questions correct!</p>
            <button className="try-again-button" onClick={resetQuiz}>Try Again</button>
          </div>
        )}

        <div className="nav-buttons">
          <button className="submit-button" onClick={() => navigate("/course")}>Back to Course</button>
          <button className="submit-button" onClick={() => navigate("/course/lesson2")}>Next Lesson →</button>
        </div>
      </div>
    </div>
  );
};

export default Lesson1;