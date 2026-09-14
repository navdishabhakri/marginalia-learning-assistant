import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

function UploadPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // NEW: Read initial state from localStorage
  const [quizStyle, setQuizStyle] = useState(() => localStorage.getItem("quizStyle") || "mixed") 
  const [questionCount, setQuestionCount] = useState(() => parseInt(localStorage.getItem("questionCount") || "5", 10))

  // NEW: Save to localStorage whenever these change
  useEffect(() => {
    localStorage.setItem("quizStyle", quizStyle);
    localStorage.setItem("questionCount", questionCount.toString());
  }, [quizStyle, questionCount]);

  const handleSubmit = async () => {
    setIsLoading(true)
    const promise = await fetch("http://localhost:8080/process-url", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({url})
    })
    
    const data = await promise.json()
    navigate(`/processing?id=${data.id}&quiz=${quizStyle}&count=${questionCount}`);
    setIsLoading(false)
  }

  const handleFileSubmit = async () => {
    setIsLoading(true)
    if(!file) return
    const formData = new FormData()
    formData.append('file', file)
    const promise = await fetch("http://localhost:8080/upload", {
      method: 'POST',
      body: formData
    })
    const data = await promise.json()
    const ext = file.name.split('.').pop()
    setFile(null)
    
    navigate(`/processing?id=${data.id}&ext=${ext}&quiz=${quizStyle}&count=${questionCount}`);
    setIsLoading(false)
  }

  return (
    <div className="upload-hero">
      <div className="eyebrow">TURN ANY LECTURE INTO STUDY MATERIAL</div>
      <h1>Upload your lecture</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "30px" }}>
        Get organized notes, a quiz, and a chat to ask it anything.
      </p>
      
      <div className="input-row" >
        <input type="text" placeholder="Paste a YouTube link" value={url} onChange={(e)=>setUrl(e.target.value)}/>
        <button className="btn" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? <span className="spinner"></span> : 'Process video'}
        </button>
      </div> 

      <div className="divider-word" style={{ margin: "20px 0" }}>OR</div>
        
      <div className="drop-zone" style={{ border: "1px dashed var(--color-border)", padding: "30px", borderRadius: "10px", textAlign: "center" }}>
          <input type="file" onChange={(e)=>{
              const selected = e.target.files?.[0] ?? null
              setFile(selected)
          }} />
          <button className="btn" onClick={handleFileSubmit} disabled={isLoading} style={{ marginTop: "10px" }}>
            {isLoading ? <span className="spinner"></span> : 'Uploaded video'}
          </button>
      </div>
      
      {/* QUIZ PREFERENCES UI */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "30px", alignItems: "center" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "var(--color-text-muted)", fontWeight: "500" }}>
          Quiz style: 
          <button className={`notes-tab ${quizStyle === 'mcq' ? 'on' : ''}`} onClick={() => setQuizStyle('mcq')} style={{ border: quizStyle === 'mcq' ? "none" : "1px solid var(--color-border)" }}>Multiple choice</button>
          <button className={`notes-tab ${quizStyle === 'mixed' ? 'on' : ''}`} onClick={() => setQuizStyle('mixed')} style={{ border: quizStyle === 'mixed' ? "none" : "1px solid var(--color-border)" }}>Mixed</button>
          <button className={`notes-tab ${quizStyle === 'freeText' ? 'on' : ''}`} onClick={() => setQuizStyle('freeText')} style={{ border: quizStyle === 'freeText' ? "none" : "1px solid var(--color-border)" }}>Short answer</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "var(--color-text-muted)", fontWeight: "500" }}>
          Question count: 
          {[3, 5, 10].map(num => (
            <button 
              key={num} 
              className={`notes-tab ${questionCount === num ? 'on' : ''}`} 
              onClick={() => setQuestionCount(num)} 
              style={{ border: questionCount === num ? "none" : "1px solid var(--color-border)", minWidth: "40px" }}
            >
              {num}
            </button>
          ))}
        </div>

      </div>

      {success && <p style={{ color: 'var(--color-success)', marginTop: '16px' }}>Video uploaded successfully!</p>}
    </div>
  )
}

export default UploadPage