import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type Note = {
  start?: string;
  end?: string;
  term?: string;
  text?: string;
  reason?: string;
  explanation?: string;
}

type Notes = {
  definitions?: Note[];
  keyTimestamps?: Note[];
  actionItems?: Note[];
}

const formatTime = (timeStr?: string) => {
  if (!timeStr) return "00:00";
  const mainPart = timeStr.split(',')[0].split('.')[0]; 
  const parts = mainPart.split(':');
  if (parts.length === 3 && parts[0] === "00") return `${parts[1]}:${parts[2]}`; 
  return mainPart;
};

function NotesPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const ext = searchParams.get("ext");
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState<Notes | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isApproving, setIsApproving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Note>({});

  if (!id) return null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetch(`http://localhost:8080/stream-data/${id}`);
        const result = await data.json();
        setNotes(result.notes);
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      }
    };
    fetchData();
  }, [id]);

  const mapWithMeta = (arr: Note[] = [], category: keyof Notes) => 
    arr.map((n, i) => ({ ...n, _category: category, _originalIndex: i }));

  const definitions = mapWithMeta(notes?.definitions, 'definitions');
  const keyMoments = mapWithMeta(notes?.keyTimestamps, 'keyTimestamps');
  const actionItems = mapWithMeta(notes?.actionItems, 'actionItems');

  let displayNotes: any[] = [];
  if (activeTab === "all") displayNotes = [...definitions, ...keyMoments, ...actionItems];
  else if (activeTab === 'definitions') displayNotes = definitions;
  else if (activeTab === 'key moments') displayNotes = keyMoments;
  else if (activeTab === 'action items') displayNotes = actionItems;

  const handleEditClick = (note: any) => {
    setEditingKey(`${note._category}-${note._originalIndex}`);
    setEditForm({ ...note, start: formatTime(note.start) }); 
  };

  const handleSaveEdit = (category: keyof Notes, index: number) => {
    setNotes(prev => {
      if (!prev) return prev;
      const updatedCategory = [...(prev[category] || [])];
      const { _category, _originalIndex, ...cleanNote } = editForm as any;
      updatedCategory[index] = cleanNote;
      return { ...prev, [category]: updatedCategory };
    });
    setEditingKey(null);
  };

  const handleDelete = (category: keyof Notes, index: number) => {
    setNotes(prev => {
      if (!prev) return prev;
      const updatedCategory = [...(prev[category] || [])];
      updatedCategory.splice(index, 1);
      return { ...prev, [category]: updatedCategory };
    });
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await fetch(`http://localhost:8080/videos/${id}/approve-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }), 
      });
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      navigate(`/player${queryString}`, { state: { notes } });
    } catch (error) {
      console.error("Failed to approve notes:", error);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div id="notes-container">
      {/* --- STANDARD SCREEN UI (NOW WRAPPED IN hide-on-print) --- */}
      <div className="screen-ui hide-on-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px", borderBottom: "1px solid var(--color-border)", paddingBottom: "20px" }}>
          <div>
            <div className="eyebrow">STEP 3 OF 6</div>
            <h1 style={{ fontSize: "28px" }}>Review your notes</h1>
          </div>
        </div>

        <div className="notes-tabs">
          <button className={`notes-tab ${activeTab === 'all' ? 'on' : ''}`} onClick={() => setActiveTab('all')}>All ({definitions.length + keyMoments.length + actionItems.length})</button>
          <button className={`notes-tab ${activeTab === 'definitions' ? 'on' : ''}`} onClick={() => setActiveTab('definitions')}>Definitions ({definitions.length})</button>
          <button className={`notes-tab ${activeTab === 'key moments' ? 'on' : ''}`} onClick={() => setActiveTab('key moments')}>Key moments ({keyMoments.length})</button>
          <button className={`notes-tab ${activeTab === 'action items' ? 'on' : ''}`} onClick={() => setActiveTab('action items')}>Action items ({actionItems.length})</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
          {displayNotes.map((note) => {
            const isEditing = editingKey === `${note._category}-${note._originalIndex}`;
            const titleField = note.term !== undefined ? 'term' : note.reason !== undefined ? 'reason' : 'text';
            const descField = note.explanation !== undefined ? 'explanation' : null;

            return (
              <div key={`${note._category}-${note._originalIndex}`} className="note-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {isEditing ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", paddingRight: "16px" }}>
                     <div style={{ display: "flex", gap: "10px" }}>
                       <input value={editForm.start || ""} onChange={e => setEditForm({...editForm, start: e.target.value})} style={{ width: "70px", padding: "6px", borderRadius: "6px", border: "1px solid var(--color-border)" }} placeholder="00:00" />
                       <input value={(editForm as any)[titleField] || ""} onChange={e => setEditForm({...editForm, [titleField]: e.target.value})} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid var(--color-border)" }} />
                     </div>
                     {descField && <textarea value={(editForm as any)[descField] || ""} onChange={e => setEditForm({...editForm, [descField]: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--color-border)", minHeight: "60px" }} />}
                     <div style={{ display: "flex", gap: "8px" }}>
                       <button onClick={() => handleSaveEdit(note._category, note._originalIndex)} className="btn" style={{ padding: "6px 12px", fontSize: "13px" }}>Save</button>
                       <button onClick={() => setEditingKey(null)} className="btn-ghost" style={{ padding: "6px 12px", fontSize: "13px" }}>Cancel</button>
                     </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: "16px", flex: 1, paddingRight: "16px" }}>
                      <div className="t" style={{ width: "65px", flexShrink: 0 }}>▶ {formatTime(note.start)}</div>
                      <div>
                        <div className="term">{(note as any)[titleField]}</div>
                        {descField && <div className="desc">{(note as any)[descField]}</div>}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button onClick={() => handleEditClick(note)} style={{ width: "32px", height: "32px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "transparent", cursor: "pointer" }}>✏️</button>
                      <button onClick={() => handleDelete(note._category, note._originalIndex)} style={{ width: "32px", height: "32px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "transparent", cursor: "pointer" }}>❌</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="bottom-bar">
          <button className="btn-ghost" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download PDF
          </button>

          <button className="btn" onClick={handleApprove} disabled={isApproving}>
            {isApproving ? "Approving..." : "Approve and continue"}
          </button>
        </div>
      </div>

      {/* --- HIDDEN PRINT-ONLY DOCUMENT UI --- */}
      <div className="print-only-document">
        <div className="print-header">
          <h1>Marginalia Study Guide</h1>
          
        </div>

        {definitions.length > 0 && (
          <div className="print-section">
            <h2>Definitions</h2>
            <div className="print-list">
              {definitions.map((note, i) => (
                <div key={i} className="print-item">
                  <span className="print-time">[{formatTime(note.start)}]</span>
                  <strong>{note.term}</strong>: {note.explanation}
                </div>
              ))}
            </div>
          </div>
        )}

        {keyMoments.length > 0 && (
          <div className="print-section">
            <h2>Key Takeaways</h2>
            <div className="print-list">
              {keyMoments.map((note, i) => (
                <div key={i} className="print-item">
                  <span className="print-time">[{formatTime(note.start)}]</span>
                  {note.reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {actionItems.length > 0 && (
          <div className="print-section">
            <h2>Action Items</h2>
            <ul className="print-list-bullets">
              {actionItems.map((note, i) => (
                <li key={i} className="print-item">
                  <span className="print-time">[{formatTime(note.start)}]</span>
                  {note.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesPage;