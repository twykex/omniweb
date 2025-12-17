import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const QuizConfig = ({ onStart }) => {
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);

  return (
    <div className="quiz-config">
      <h3>Configure Quiz</h3>
      <div className="config-grid">
          <div className="config-item">
            <label>Difficulty</label>
            <div className="segmented-control">
              {['easy', 'medium', 'hard'].map(d => (
                <button
                  key={d}
                  className={difficulty === d ? 'active' : ''}
                  onClick={() => setDifficulty(d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="config-item">
            <label>Questions: {numQuestions}</label>
            <input
              type="range" min="3" max="10" step="1"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              className="range-slider"
            />
          </div>
      </div>

      <button className="start-quiz-btn" onClick={() => onStart({ difficulty, numQuestions })}>
        START QUIZ
      </button>
    </div>
  );
};

export const QuizInterface = ({ content, quizConfig, onNewQuiz }) => {
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);

  // New State
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    try {
      let jsonStr = content.trim();
      jsonStr = jsonStr.replace(/```json/gi, "").replace(/```/g, "");
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}') + 1;
      if (start !== -1 && end !== -1) {
          jsonStr = jsonStr.substring(start, end);
          const data = JSON.parse(jsonStr);
          if (data && data.questions) {
              setQuizData(data);
          } else {
              setParseError(true);
          }
      } else {
           setParseError(true);
      }
    } catch (e) {
      console.error("Quiz parse error", e);
      setParseError(true);
    }
  }, [content]);

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0 && !showResult && !quizFinished) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleOptionClick(-1); // Timeout
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, showResult, quizFinished]);

  // Start timer when question changes
  useEffect(() => {
    if (quizData && !showResult && !quizFinished) {
        setTimeLeft(30);
        setTimerActive(true);
    }
  }, [currentQuestion, quizData, showResult, quizFinished]);

  const handleOptionClick = (index) => {
    if (selectedOption !== null && index !== -1) return; // Prevent clicks after selection, allow timeout

    setTimerActive(false);
    setSelectedOption(index);

    let isCorrect = false;
    if (index !== -1) {
        isCorrect = index === quizData.questions[currentQuestion].correct_index;
    }

    if (isCorrect) {
        setScore(score + 1);
        setStreak(streak + 1);
    } else {
        setStreak(0);
    }
    setUserAnswers([...userAnswers, { questionIndex: currentQuestion, selected: index, correct: isCorrect, timeOut: index === -1 }]);
    setShowResult(true);
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setShowResult(false);
    if (currentQuestion + 1 < quizData.questions.length) {
        setCurrentQuestion(currentQuestion + 1);
    } else {
        setQuizFinished(true);
    }
  };

  if (parseError) {
      return (
        <div className="quiz-error">
            <h3>⚠️ Unable to load quiz</h3>
            <p>The neural network failed to generate a valid quiz format.</p>
            <div className="raw-content">
                <small>Raw output:</small>
                <pre>{content}</pre>
            </div>
        </div>
      );
  }

  if (!quizData) return <div className="quiz-loading">Loading Quiz...</div>;

  if (quizFinished) {
      const percentage = Math.round((score / quizData.questions.length) * 100);
      return (
          <div className="quiz-results">
              <h3>Quiz Completed!</h3>
              <div className="score-circle" style={{ borderColor: percentage >= 70 ? '#34d399' : '#f87171' }}>
                  <span className="score-num">{percentage}%</span>
              </div>
              <p>You got {score} out of {quizData.questions.length} correct.</p>

              <div className="results-review">
                  <h4>Review</h4>
                  {quizData.questions.map((q, i) => {
                      const ans = userAnswers.find(a => a.questionIndex === i);
                      return (
                          <div key={i} className={`review-item ${ans?.correct ? 'correct' : 'wrong'}`}>
                              <div className="review-q">{i+1}. {q.question}</div>
                              <div className="review-ans">
                                  {ans?.correct ? (
                                      <span style={{color:'#34d399'}}>✓ Correct</span>
                                  ) : (
                                      <>
                                          <span style={{color:'#f87171'}}>
                                            {ans?.timeOut ? '⏱️ Timed Out' : `✗ You chose: ${q.options[ans?.selected]}`}
                                          </span>
                                          <br/>
                                          <span style={{color:'#34d399'}}>✓ Correct: {q.options[q.correct_index]}</span>
                                      </>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>

              <div className="quiz-actions" style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button onClick={() => {
                    setScore(0);
                    setCurrentQuestion(0);
                    setQuizFinished(false);
                    setSelectedOption(null);
                    setShowResult(false);
                    setUserAnswers([]);
                    setStreak(0);
                }} className="retry-btn">RETRY SAME QUESTIONS</button>

                <button onClick={onNewQuiz} className="retry-btn" style={{background: 'rgba(139, 92, 246, 0.2)', borderColor: 'rgba(139, 92, 246, 0.5)'}}>
                    GENERATE NEW QUIZ
                </button>
              </div>
          </div>
      );
  }

  const question = quizData.questions[currentQuestion];

  return (
      <div className="quiz-container">
          <div className="quiz-header">
             <div className="streak-badge">
                🔥 {streak}
             </div>
             <div className="timer-track">
                <div
                    className={`timer-fill ${timeLeft < 10 ? 'danger' : ''}`}
                    style={{width: `${(timeLeft / 30) * 100}%`}}
                ></div>
             </div>
             <div className="timer-text">{timeLeft}s</div>
          </div>

          <div className="quiz-progress-bar">
              <div className="progress-fill" style={{width: `${((currentQuestion) / quizData.questions.length) * 100}%`}}></div>
          </div>
          <div className="quiz-progress-text">
              Question {currentQuestion + 1} of {quizData.questions.length}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
            >
                <h3 className="quiz-question">{question.question}</h3>
                <div className="quiz-options">
                    {question.options.map((opt, idx) => (
                        <button
                            key={idx}
                            className={`quiz-option ${selectedOption === idx ? (idx === question.correct_index ? 'correct' : 'wrong') : ''} ${showResult && idx === question.correct_index ? 'correct' : ''}`}
                            onClick={() => handleOptionClick(idx)}
                            disabled={selectedOption !== null}
                        >
                            <span className="opt-letter">{String.fromCharCode(65+idx)}</span>
                            {opt}
                            {selectedOption === idx && (idx === question.correct_index ? ' ✓' : ' ✗')}
                        </button>
                    ))}
                </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {showResult && (
                <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="quiz-explanation"
                >
                    <strong>Explanation:</strong> {question.explanation}
                    <button className="next-btn" onClick={nextQuestion}>
                        {currentQuestion + 1 < quizData.questions.length ? "Next Question" : "See Results"}
                    </button>
                </motion.div>
            )}
          </AnimatePresence>
      </div>
  );
};
