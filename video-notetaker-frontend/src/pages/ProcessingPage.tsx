import { useState, useEffect } from "react"; // 1. Add this import
import { useNavigate, useSearchParams } from "react-router-dom"
// A simple SVG checkmark for the completed steps
const Checkmark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);
function ProcessingPage() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");
    const ext = searchParams.get("ext")
    const navigate = useNavigate();
    const [currentStep,setCurrentStep] = useState("downloading")
    const [logs, setLogs] = useState<string[]>([]);
    useEffect(()=>{
        if (!id) return;
        const eventSource = new EventSource(`http://localhost:8080/stream/${id}`);

    eventSource.onmessage = (event) => { // fires when backend does res.write
    const data = JSON.parse(event.data);
      
      setCurrentStep(data.step);
      if (data.message) {
        setLogs((prev) => {
          // Prevent duplicate consecutive logs from fast polling
          if (prev[prev.length - 1] === data.message) return prev;
          return [...prev, data.message];
        });
      }
      // If finished, close connection and go to notes
      if (data.step === "done") {
        eventSource.close();
        navigate(`/notes?id=${id}${ext ? `&ext=${ext}` : ''}`);
      }
    };
    return () => eventSource.close();
  }, [id, navigate]);

  const getStepStatus= (stepNumber:number)=>{
    const stepOrder = [
        "downloading",  // index 0
    "transcribing", // index 1
    "chunking",     // index 2
    "extracting",   // index 3
    "consolidating",// index 4
    "done"          // index 5
    ]
    const currentIndex = stepOrder.indexOf(currentStep);
    if (stepNumber === 1) {
    if (currentIndex >= 2) return "done";   // If we are at chunking or beyond
    if (currentIndex >= 0) return "active"; // If we are at downloading or transcribing
    return "pending";
  }

  // 4. UI Step 2: Chunking and embedding
  if (stepNumber === 2) {
    if (currentIndex >= 3) return "done";
    if (currentIndex === 2) return "active";
    return "pending";
  }

  // 5. UI Step 3: Extracting notes
  if (stepNumber === 3) {
    if (currentIndex >= 4) return "done";
    if (currentIndex === 3) return "active";
    return "pending";
  }

  // 6. UI Step 4: Consolidating
  if (stepNumber === 4) {
    if (currentIndex >= 5) return "done";
    if (currentIndex === 4) return "active";
    return "pending";
  }

  return "pending";
};
  
return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
        <div>
          <div className="eyebrow">STEP 2 OF 6</div>
          <h2>Processing your video</h2>
        </div>
        {/* Using your custom colors for the chip at the top right */}
        <div className="chip" style={{ backgroundColor: "var(--color-accent-secondary-light)", color: "var(--color-accent-secondary)" }}>
          Processing — {id?.slice(0, 5)}
        </div>
      </div>

      <p style={{ color: "var(--color-text-muted)", marginBottom: "40px" }}>
        Sit tight — this usually takes a few minutes for a video this length.
      </p>

      <div className="progress-track">
        {/* STEP 1 */}
        <div className="progress-step">
          <div className={`step-dot ${getStepStatus(1)}`}>
            {getStepStatus(1) === "done" ? <Checkmark /> : (getStepStatus(1) === "active" ? <span className="spinner"></span> : "1")}
          </div>
          <div>
            <div className="step-label">Downloading and transcribing</div>
            <div className="step-sub">Extracting audio and generating transcript</div>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="progress-step">
          <div className={`step-dot ${getStepStatus(2)}`}>
            {getStepStatus(2) === "done" ? <Checkmark /> : (getStepStatus(2) === "active" ? <span className="spinner"></span> : "2")}
          </div>
          <div>
            <div className="step-label">Chunking and embedding</div>
            <div className="step-sub">Indexing segments for search</div>
          </div>
        </div>

        {/* STEP 3 */}
        <div className="progress-step">
          <div className={`step-dot ${getStepStatus(3)}`}>
            {getStepStatus(3) === "done" ? <Checkmark /> : (getStepStatus(3) === "active" ? <span className="spinner"></span> : "3")}
          </div>
          <div>
            <div className="step-label">Extracting notes</div>
            <div className="step-sub">Finding definitions, action items, and key moments</div>
          </div>
        </div>

        {/* STEP 4 */}
        <div className="progress-step">
          <div className={`step-dot ${getStepStatus(4)}`}>
            {getStepStatus(4) === "done" ? <Checkmark /> : (getStepStatus(4) === "active" ? <span className="spinner"></span> : "4")}
          </div>
          <div>
            <div className="step-label">Consolidating and cleaning up</div>
            <div className="step-sub">{getStepStatus(4) === "pending" ? "Waiting" : "Finalizing data"}</div>
          </div>
        </div>
      </div>

      {/* The Dark Terminal Box */}
      <div style={{
        background: "#2B2A28",
        color: "#E5E0D5",
        fontFamily: "monospace",
        padding: "24px",
        borderRadius: "12px",
        fontSize: "13px",
        marginTop: "20px",
        lineHeight: "1.6",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
      }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: "6px" }}>
            <span style={{ color: "var(--color-success)", marginRight: "8px" }}>✓</span>
            {log}
          </div>
        ))}
        {currentStep !== "done" && (
          <div style={{ opacity: 0.5, marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "1.5px" }}></span>
            Running {currentStep} pass...
          </div>
        )}
      </div>
    </div>
  );
}


export default ProcessingPage