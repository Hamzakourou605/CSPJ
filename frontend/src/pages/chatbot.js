import { useState } from "react";

export default function Chatbot() {
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState("");
    const [conversation, setConversation] = useState([]);

    const sendMessage = async () => {
        if (!message.trim()) return;
        const userMessage = { sender: "user", text: message };
        setConversation(prev => [...prev, userMessage]);
        setMessage("");
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "#f2f0ea", fontFamily: "'Tajawal',sans-serif", direction: "rtl", padding: "2rem"
        }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a3a5c", marginBottom: "2rem" }}>
                بمادا أساعدك ؟
            </h1>

            <div style={{
                background: "#fff", borderRadius: 16, border: "0.5px solid #e0ddd4",
                padding: "2rem", width: "100%", maxWidth: 600, boxShadow: "0 4px 28px rgba(26,58,92,.07)",
                display: "flex", flexDirection: "column", gap: "1rem"
            }}>
                <div style={{ minHeight: "200px", padding: "1rem", background: "#f8f7f2", borderRadius: 8, overflowY: "auto" }}>
                    {conversation.length === 0 ? (
                        <p style={{ color: "#aaa", textAlign: "center" }}>لا توجد رسائل بعد...</p>
                    ) : (
                        conversation.map((msg, idx) => (
                            <div key={idx} style={{
                                marginBottom: "0.5rem",
                                textAlign: msg.sender === "user" ? "right" : "left"
                            }}>
                                <span style={{
                                    display: "inline-block",
                                    padding: "8px 12px",
                                    borderRadius: 12,
                                    background: msg.sender === "user" ? "#1a3a5c" : "#e0ddd4",
                                    color: msg.sender === "user" ? "#fff" : "#1a3a5c"
                                }}>
                                    {msg.text}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="اكتب رسالة......"
                        style={{
                            width: "100%", padding: "10px 13px", borderRadius: 9,
                            border: "0.5px solid #ddd", fontSize: 14,
                            fontFamily: "'Tajawal',sans-serif", background: "#fafaf7",
                            color: "#1a3a5c", outline: "none", boxSizing: "border-box",
                            minHeight: "80px", resize: "vertical"
                        }}
                    />
                </div>

                <button onClick={sendMessage} disabled={sending || !message.trim()} style={{
                    width: "100%", padding: "11px", marginTop: 4,
                    background: (sending || !message.trim()) ? "#8fa8c0" : "#c8a84b", color: "#fff",
                    border: "none", borderRadius: 9, fontSize: 15,
                    fontFamily: "'Tajawal',sans-serif", fontWeight: 600,
                    cursor: (sending || !message.trim()) ? "not-allowed" : "pointer"
                }}>
                    إرسال
                </button>
            </div>
        </div>
    )
}



