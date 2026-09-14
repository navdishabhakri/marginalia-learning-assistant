import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

type Question = {
  type: "mcq" | "freeText";
  question: string;
  choice?: string[];
  correctAnswer: string;
};

function QuizPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  
  // NEW: Grab from URL first, but safely fall back to localStorage
  const count = parseInt(searchParams.get("count") || localStorage.getItem("questionCount") || "5", 10);
  const quizType = searchParams.get("quiz") || localStorage.getItem("quizStyle") || "mixed"; 

  const [quizData, setQuizData] = useState<Question[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [freeTextAnswer, setFreeTextAnswer] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [gradingState, setGradingState] = useState<"idle" | "loading" | "correct" | "incorrect">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const generateQuiz = async () => {
      setIsGenerating(true);
      try {
        const response = await fetch(`http://localhost:8080/videos/${id}/generate-quiz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count, quizType }), 
        });
        const data = await response.json();
        setQuizData(data.quiz);
      } catch (error) {
        console.error("Failed to generate quiz:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    if (!quizData) {
      generateQuiz();
    }
  }, [id, quizType, count, quizData]);

  const handleGrade = async () => {
    if (!quizData) return;
    
    const currentQ = quizData[currentIndex];
    const studentAnswer = currentQ.type === "mcq" ? selectedOption : freeTextAnswer;
    
    if (!studentAnswer.trim()) return;

    setGradingState("loading");

    try {
      const response = await fetch(`http://localhost:8080/videos/${id}/generate-mcq-grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: currentIndex, studentAnswer }),
      });
      const data = await response.json();

      if (currentQ.type === "mcq") {
        const isCorrect = data.reply;
        setGradingState(isCorrect ? "correct" : "incorrect");
        setFeedback(isCorrect ? "Spot on!" : `Not quite — the right answer was: ${currentQ.correctAnswer}`);
      } else {
        const { isCorrect, feedback: aiFeedback } = data.reply;
        setGradingState(isCorrect ? "correct" : "incorrect");
        setFeedback(aiFeedback);
      }
    } catch (error) {
      console.error("Grading failed:", error);
      setGradingState("idle");
    }
  };

  const handleNext = () => {
    setSelectedOption("");
    setFreeTextAnswer("");
    setGradingState("idle");
    setFeedback(null);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSelectedOption("");
      setFreeTextAnswer("");
      setGradingState("idle");
      setFeedback(null);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const displayQuizType = quizType === 'mcq' ? 'MULTIPLE CHOICE' : quizType === 'freeText' ? 'SHORT ANSWER' : 'MIXED';

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px", borderBottom: "1px solid var(--color-border)", paddingBottom: "20px" }}>
        <div>
          <div className="eyebrow">STEP 6 OF 6</div>
          <h1 style={{ fontSize: "28px" }}>Test what you learned</h1>
        </div>
        <div className="chip" style={{ backgroundColor: "var(--color-accent-secondary-light)", color: "var(--color-accent-secondary)" }}>
          Video ID — {id?.slice(0, 5)}
        </div>
      </div>

      {isGenerating ? (
        <div className="card quiz-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
          <span className="spinner" style={{ width: "24px", height: "24px", borderWidth: "3px", borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)", marginBottom: "16px" }}></span>
          <p style={{ color: "var(--color-text-muted)" }}>Generating your custom quiz...</p>
        </div>
      ) : quizData && currentIndex < quizData.length ? (
        <div>
          <div className="card quiz-card" style={{ padding: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <div className="eyebrow" style={{ color: "var(--color-text-muted)", margin: 0 }}>
                QUESTION {currentIndex + 1} OF {quizData.length}
              </div>
              <div className="eyebrow" style={{ color: "var(--color-text-muted)", margin: 0 }}>
                {displayQuizType} QUIZ
              </div>
            </div>
            
            <h3 className="quiz-q">{quizData[currentIndex].question}</h3>

            {/* MCQ OPTIONS */}
            {quizData[currentIndex].type === "mcq" && quizData[currentIndex].choice?.map((opt, i) => {
              const isSelected = selectedOption === opt;
              const isSubmitted = gradingState !== "idle";
              
              let optionClass = "opt";
              if (isSelected && gradingState === "correct") optionClass += " correct";
              if (isSelected && gradingState === "incorrect") optionClass += " wrong";
              if (isSelected && gradingState === "idle") optionClass += " active";

              return (
                <div 
                  key={i} 
                  className={optionClass}
                  onClick={() => !isSubmitted && setSelectedOption(opt)}
                  style={{
                    pointerEvents: isSubmitted ? "none" : "auto",
                    backgroundColor: isSelected && gradingState === "idle" ? "var(--color-accent-light)" : "",
                    borderColor: isSelected && gradingState === "idle" ? "var(--color-accent)" : ""
                  }}
                >
                  <div style={{ 
                    width: "20px", height: "20px", borderRadius: "50%", 
                    border: isSelected ? "6px solid var(--color-accent)" : "2px solid var(--color-border)",
                    marginRight: "10px", flexShrink: 0,
                    transition: "all 0.2s"
                  }}></div>
                  {opt}
                </div>
              );
            })}

            {/* FREE TEXT AREA */}
            {quizData[currentIndex].type === "freeText" && (
              <textarea
                value={freeTextAnswer}
                onChange={(e) => setFreeTextAnswer(e.target.value)}
                disabled={gradingState !== "idle"}
                placeholder="Type your answer here..."
                style={{
                  width: "100%", height: "120px", padding: "14px",
                  borderRadius: "10px", border: "1px solid var(--color-border)",
                  fontFamily: "var(--font-body)", fontSize: "15px",
                  resize: "none", marginBottom: "10px", outline: "none",
                  backgroundColor: gradingState !== "idle" ? "var(--color-bg)" : "#fff"
                }}
              />
            )}

            {/* FEEDBACK */}
            {feedback && (
              <div style={{
                marginTop: "20px", padding: "16px", borderRadius: "10px",
                backgroundColor: gradingState === "correct" ? "var(--color-success-light)" : "var(--color-error-light)",
                color: gradingState === "correct" ? "var(--color-success)" : "var(--color-error)",
                fontSize: "14.5px", lineHeight: "1.5"
              }}>
                {feedback}
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "520px", marginTop: "20px" }}>
            <button 
              className="btn-ghost" 
              onClick={handlePrevious}
              style={{ visibility: currentIndex === 0 ? "hidden" : "visible" }}
            >
              Previous
            </button>
            
            {gradingState === "loading" ? (
              <button className="btn" disabled>
                Grading...
              </button>
            ) : gradingState === "idle" ? (
              <button 
                className="btn" 
                onClick={handleGrade} 
                disabled={quizData[currentIndex].type === "mcq" ? !selectedOption : !freeTextAnswer.trim()}
              >
                Check answer
              </button>
            ) : (
              <button className="btn" onClick={handleNext}>
                {currentIndex === quizData.length - 1 ? "Finish quiz" : "Next question"}
              </button>
            )}
          </div>
        </div>
      ) : quizData ? (
        <div className="card quiz-card" style={{ textAlign: "center", padding: "60px 40px" }}>
          <h2 style={{ marginBottom: "12px" }}>Quiz Complete! 🎉</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "24px" }}>
            You've reviewed your notes and checked your understanding.
          </p>
          <button className="btn" onClick={() => window.location.href = "/"}>Start a new video</button>
        </div>
      ) : null}
    </div>
  );
}

export default QuizPage;