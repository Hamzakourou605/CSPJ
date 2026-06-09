import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
    const [form, setForm] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const submit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(form.username, form.password);
            toast.success("مرحباً بك في منصة CSPJ");
            navigate("/");
        } catch {
            toast.error("بيانات الدخول غير صحيحة");
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "#f2f0ea", fontFamily: "'Tajawal',sans-serif", direction: "rtl"
        }}>
            <div style={{ width: "100%", maxWidth: 420 }}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        width: 68, height: 68, background: "#1a3a5c", borderRadius: 18,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 1.2rem"
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="#c8a84b">
                            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a3a5c" }}>
                        المجلس الأعلى للسلطة القضائية
                    </h1>
                    <p style={{ fontSize: 12, color: "#aaa", marginTop: 5 }}>
                        منصة تحليل تقارير القضاة ·
                    </p>
                </div>


                <div style={{
                    background: "#fff", borderRadius: 16, border: "0.5px solid #e0ddd4",
                    padding: "2rem 2rem", boxShadow: "0 4px 28px rgba(26,58,92,.07)"
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a3a5c", textAlign: "center", marginBottom: "1.5rem" }}>
                        تسجيل الدخول
                    </h2>
                    <form onSubmit={submit}>
                        {[
                            ["username", "اسم المستخدم", "text", "admin"],
                            ["password", "كلمة المرور", "password", "••••••••"]
                        ].map(([k, l, t, ph]) => (
                            <div key={k} style={{ marginBottom: "1rem" }}>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>{l}</label>
                                <input type={t} placeholder={ph} value={form[k]} required
                                    onChange={e => setForm({ ...form, [k]: e.target.value })}
                                    style={{
                                        width: "100%", padding: "10px 13px", borderRadius: 9,
                                        border: "0.5px solid #ddd", fontSize: 14,
                                        fontFamily: "'Tajawal',sans-serif", background: "#fafaf7",
                                        color: "#1a3a5c", outline: "none", boxSizing: "border-box",
                                        transition: "border-color .15s"
                                    }}
                                    onFocus={e => e.target.style.borderColor = "#1a3a5c"}
                                    onBlur={e => e.target.style.borderColor = "#ddd"}
                                />
                            </div>
                        ))}
                        <button type="submit" disabled={loading}
                            style={{
                                width: "100%", padding: "11px", marginTop: 4,
                                background: loading ? "#8fa8c0" : "#1a3a5c", color: "#fff",
                                border: "none", borderRadius: 9, fontSize: 15,
                                fontFamily: "'Tajawal',sans-serif", fontWeight: 600,
                                cursor: loading ? "not-allowed" : "pointer", transition: "background .2s"
                            }}>
                            {loading ? "جارٍ التحقق..." : "دخول →"}
                        </button>
                    </form>


                    <div style={{
                        marginTop: "1.4rem", padding: "10px 14px", background: "#f8f7f2",
                        borderRadius: 8, fontSize: 11, color: "#888", lineHeight: 1.9
                    }}>

                        <div style={{ marginTop: 4, borderTop: "0.5px solid #e8e4da", paddingTop: 4 }}>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
