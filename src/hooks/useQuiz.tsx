import { useState } from 'react';

// Define types
export interface QuizQuestion {
  id: string | number;
  correctAnswer: string;
  text: string;
  options?: Array<{
    value: string;
    text: string;
  }>;
}

interface SelectedAnswers {
  [questionId: string]: string;
  [questionId: number]: string;
}

interface Correctness {
  [questionId: string]: boolean;
  [questionId: number]: boolean;
}

interface QuizHookReturn {
  selectedAnswers: SelectedAnswers;
  selectAnswer: (questionId: string | number, answer: string) => void;
  isSubmitted: boolean;
  correctness: Correctness;
  correctCount: number;
  handleAllAnswersCheck: () => number;
  resetQuiz: () => void;
}

/**
 * Custom hook for managing quiz state with multiple questions
 * @param questions Array of question objects with 'id' and 'correctAnswer' properties
 * @returns Quiz state and handlers
 */
export function useQuizCheck(questions: QuizQuestion[]): QuizHookReturn {
  // Track selected answers for each question using their IDs
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  // Track if the quiz has been submitted
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  // Track correctness for each question
  const [correctness, setCorrectness] = useState<Correctness>({});
  // Track the number of correct answers
  const [correctCount, setCorrectCount] = useState<number>(0);

  /**
   * Select an answer for a specific question
   * @param questionId The ID of the question
   * @param answer The selected answer
   */
  const selectAnswer = (questionId: string | number, answer: string): void => {
    if (isSubmitted) return; // Prevent changing answers after submission
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  /**
   * Check all answers for all questions
   * @returns Number of correct answers
   */
  const handleAllAnswersCheck = (): number => {
    if (isSubmitted) return correctCount;
  
    let count = 0;
    const newCorrectness: Correctness = {};
  
    questions.forEach((question) => {
      const selectedAnswer = selectedAnswers[question.id];
      const isCorrect = selectedAnswer === question.correctAnswer;
      newCorrectness[question.id] = isCorrect;
      if (isCorrect) count++;
    });
  
    setCorrectness(newCorrectness);
    setCorrectCount(count);
    setIsSubmitted(true);
  
    // Scroll to bottom after state updates
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth", // Optional: Adds smooth scrolling
      });
    }, 0);
  
    return count;
  };

  /**
   * Reset all quiz state
   */
  const resetQuiz = (): void => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setCorrectness({});
    setCorrectCount(0);
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  };

  return {
    selectedAnswers,
    selectAnswer,
    isSubmitted,
    correctness,
    correctCount,
    handleAllAnswersCheck,
    resetQuiz
  };
}