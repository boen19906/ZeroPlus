import { useNavigate } from "react-router-dom";
import "./Lesson.css";
import { useQuizCheck } from "../../hooks/useQuiz";
import useScrollToTop from "../../hooks/useScroll";

const Lesson5 = () => {
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
  
  return (
    <div className="lesson-container">
      <h1>Lesson 5</h1>
      <p>This is the first lesson of the course.</p>

      {/* YouTube Video Embed */}
      <div style={{ margin: "20px 0" }}>
        <iframe
          width="560"
          height="315"
          src="https://www.youtube.com/embed/4XZIv4__sQA"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      
      <div className="questions">
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
                    onClick={() => selectAnswer(question.id, option.value)}
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
      </div>

      {!isSubmitted ? (
        <button className="submit-button" onClick={handleAllAnswersCheck}>Submit Quiz</button>
      ) : (
        <div className="quiz-results">
          <h3>Quiz Results</h3>
          <p>You got <span>{correctCount} out of {questions.length}</span> questions correct!</p>
          <button className="try-again-button" onClick={resetQuiz}>Try Again</button>
        </div>
      )}

      <div className="nav-buttons">
        <button onClick={() => navigate("/course/lesson4")}>Previous Lesson</button>
        <button onClick={() => navigate("/course")}>Back to Course</button>
        <button onClick={() => navigate("/course/lesson6")}>Next Lesson</button>
      </div>
    </div>
  );
};

export default Lesson5;