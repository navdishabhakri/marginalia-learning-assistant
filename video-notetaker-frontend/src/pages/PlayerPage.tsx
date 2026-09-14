import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

// HELPER: Formats "00:01:07,920" down to "01:07"
const formatTime = (timeStr?: string) => {
  if (!timeStr) return "00:00";
  const mainPart = timeStr.split(',')[0].split('.')[0]; 
  const parts = mainPart.split(':');
  if (parts.length === 3 && parts[0] === "00") return `${parts[1]}:${parts[2]}`; 
  return mainPart;
};

function PlayerPage() {
  const [searchParams] = useSearchParams();
  const ext = searchParams.get("ext") || "mp4";
  const id = searchParams.get("id");
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const [notes, setNotes] = useState<any>(location.state?.notes || null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeNoteIndex, setActiveNoteIndex] = useState(0);

  const isYouTube = id && id.length < 20;

  useEffect(() => {
    if (!notes && id) {
      fetch(`http://localhost:8080/stream-data/${id}`)
        .then(res => res.json())
        .then(data => setNotes(data.notes))
        .catch(err => console.error("Failed to load notes", err));
    }
  }, [id, notes]);

  const displayNotes = notes?.keyTimestamps || notes?.definitions || notes?.actionItems || [];

  const timeToSeconds = (timestr: string) => {
    if (!timestr) return 0;
    const parts = timestr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  useEffect(() => {
    // FIXED: Prevent the effect from aggressively resetting the index 
    // when clicking through a YouTube video.
    if (isYouTube && currentTime === 0) return;

    let newIndex = 0;
    for (let i = 0; i < displayNotes.length; i++) {
      const noteTime = timeToSeconds(formatTime(displayNotes[i].start));
      if (currentTime >= noteTime) {
        newIndex = i;
      } else {
        break; 
      }
    }
    
    // Only update state if it actually changed
    if (newIndex !== activeNoteIndex) {
      setActiveNoteIndex(newIndex);
      document.querySelector('.current')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    // FIXED: Removed activeNoteIndex from the dependency array below so manual clicks stick!
  }, [currentTime, displayNotes, isYouTube]);

  const handleNoteClick = (note: any, index: number) => {
    const seconds = timeToSeconds(formatTime(note.start));
    
    // Set the green highlight manually immediately
    setActiveNoteIndex(index);

    if (isYouTube) {
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true]
        }), '*');
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: []
        }), '*');
      }
    } else {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = seconds;
        video.play();
      }
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
        <div>
          <div className="eyebrow">STEP 4 OF 6</div>
          <h1 style={{ fontSize: "28px", margin: 0 }}>Watch, with notes in sync</h1>
        </div>
      </div>

      <div className="studio">
        {/* LEFT COLUMN: THE MEDIA PLAYER */}
        <div>
          <div className="video-box" style={{ background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            
            {isYouTube ? (
              <iframe 
                width="100%" 
                height="100%"
                style={{ aspectRatio: "16/10", borderRadius: "14px" }}
                src={`https://www.youtube.com/embed/${id}?enablejsapi=1`} 
                frameBorder="0" 
                allowFullScreen
              ></iframe>
            ) : (
              <video 
                controls 
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} 
                style={{ width: "100%", aspectRatio: "16/10", borderRadius: "14px", backgroundColor: "black" }}
                src={`http://localhost:8080/media/${id}/video.${ext}`} 
              />
            )}
            
          </div>
          
          <div style={{ height: "4px", background: "var(--color-border)", borderRadius: "2px", marginTop: "16px", width: "100%", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "35%", background: "var(--color-accent)", borderRadius: "2px" }}></div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE SYNCED NOTES */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", maxHeight: "600px", paddingRight: "8px" }}>
          {displayNotes.map((note: any, index: number) => {
            const titleField = note.term !== undefined ? 'term' : note.reason !== undefined ? 'reason' : 'text';
            const descField = note.explanation !== undefined ? 'explanation' : null;

            return (
              <div 
                key={index} 
                className={`sync-item ${index === activeNoteIndex ? 'current' : ''}`} 
                onClick={() => handleNoteClick(note, index)}
                style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px" }}
              >
                <div className="t" style={{ width: "55px", flexShrink: 0 }}>▶ {formatTime(note.start)}</div>
                
                <div style={{ fontSize: "14.5px", flex: 1 }}>
                  <strong>{(note as any)[titleField]}</strong> 
                  {descField && <span> {(note as any)[descField]}</span>}
                  {!descField && note.reason && note.reason !== note.term && <span> {note.reason}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bottom-bar" style={{ marginTop: "30px" }}>
        <div></div>
        <button className="btn" onClick={() => navigate(`/chat?id=${id}&ext=${ext}`)}>
          Continue to Chat
        </button>
      </div>
    </div>
  );
}

export default PlayerPage;