import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

function ChatPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const ext = searchParams.get("ext");
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. FIXED: Initialize state from sessionStorage if it exists for this specific video
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!id) return [];
    const saved = sessionStorage.getItem(`chat-history-${id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // 2. FIXED: Automatically save to sessionStorage every time messages change
  useEffect(() => {
    if (id) {
      sessionStorage.setItem(`chat-history-${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !id) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8080/videos/${id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg }),
      });
      const data = await response.json();

      const aiReply = data.answer || data.reply || data.text || "Here is what I found.";
      
      // Parse the timestamp using the regex we fixed earlier
      const timeMatch = aiReply.match(/\[(\d{2}:\d{2}:\d{2}|\d{1,2}:\d{2})\]?/);
      const parsedTimestamp = timeMatch ? timeMatch[1] : undefined;
      const cleanText = aiReply.replace(/\[\d{2}:\d{2}:\d{2}\]|\[\d{1,2}:\d{2}\]|\s*-\s*\[.*?\]/g, "").trim();

      setMessages((prev) => [...prev, { role: "assistant", content: cleanText, timestamp: parsedTimestamp }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I ran into an error processing that request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimestampClick = (timestamp: string) => {
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    navigate(`/player${queryString}`, { state: { jumpTo: timestamp } });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--color-border)", paddingBottom: "20px" }}>
        <div>
          <div className="eyebrow">ASK ANYTHING</div>
          <h1 style={{ fontSize: "28px" }}>Talk to the video</h1>
        </div>
        <div className="chip" style={{ backgroundColor: "var(--color-accent-secondary-light)", color: "var(--color-accent-secondary)" }}>
          Video ID — {id?.slice(0, 5)}
        </div>
      </div>

      <p style={{ color: "var(--color-text-muted)", marginBottom: "24px" }}>
        Answers are grounded in what was actually said, with a timestamp to check the source.
      </p>

      {/* Chat Messages Area */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "20px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {messages.length === 0 ? (
          <div style={{ margin: "auto", color: "var(--color-text-muted)" }}>Ask something about this video!</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ display: "flex", gap: "16px", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "assistant" && (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: "bold", color: "var(--color-text-muted)" }}>
                  M
                </div>
              )}
              
              <div style={{ 
                maxWidth: "80%", 
                padding: "16px", 
                borderRadius: "12px", 
                backgroundColor: msg.role === "user" ? "var(--color-accent)" : "#fff",
                color: msg.role === "user" ? "#fff" : "var(--color-text)",
                border: msg.role === "assistant" ? "1px solid var(--color-border)" : "none",
                lineHeight: "1.5"
              }}>
                {msg.content}
              </div>

              {/* Display Timestamp Pill if it exists */}
              {msg.role === "assistant" && msg.timestamp && (
                <button 
                  onClick={() => handleTimestampClick(msg.timestamp!)}
                  style={{ 
                    alignSelf: "flex-end", padding: "6px 12px", borderRadius: "20px", 
                    backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)",
                    fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                  }}
                >
                  ▶ {msg.timestamp}
                </button>
              )}

              {msg.role === "user" && (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontWeight: "bold" }}>
                  U
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: "bold", color: "var(--color-text-muted)" }}>M</div>
            <div style={{ padding: "16px", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div style={{ marginTop: "auto", position: "relative" }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask something about this video"
          style={{ width: "100%", padding: "16px 120px 16px 20px", borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: "15px", outline: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="btn"
          style={{ position: "absolute", right: "8px", top: "8px", bottom: "8px", padding: "0 24px" }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}

export default ChatPage;