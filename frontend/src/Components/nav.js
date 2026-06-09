import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import toast from "react-hot-toast";

const NAV = [
    { to: "/", label: "الرئيسية", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
    { to: "/rapports", label: "التقارير", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { to: "/historique", label: "السجل", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    // { to: "/chatbot", label: "المساعد", icon: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    // { to: "/chatbot1", label: "المساعد", icon: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate("/login"); };

    const handleTrain = async () => {
        if (user?.role !== "admin") { toast.error("يحتاج صلاحية مدير"); return; }
        const t = toast.loading("جارٍ إعادة تدريب النماذج...");
        try {
            const res = await api.train();

            console.log("Résultat training :", res.data);
            toast.dismiss(t);
            toast.success(`تم التدريب على ${res.data.n_samples} سجل`);
        } catch {
            toast.dismiss(t);
            toast.error("فشل التدريب");
        }
    };

    return (
        <div style={{ display: "flex", direction: "rtl", background: "#f2f0ea", minHeight: "100vh" }}>
            {/* Sidebar */}
            <div style={{
                width: 215, background: "#1a3a5c", display: "flex", flexDirection: "column",
                padding: "1.2rem .9rem", flexShrink: 0, position: "sticky", top: 0, height: "100vh",
                overflowY: "auto"
            }}>
                {/* Logo */}
                <div style={{
                    marginBottom: "1.6rem", paddingBottom: "1rem",
                    borderBottom: "0.5px solid rgba(255,255,255,.1)"
                }}>
                    <div style={{
                        width: 40, height: 40, background: "rgba(200,168,75,.15)", borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#c8a84b">
                            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
                        </svg>
                    </div>
                    <div style={{ color: "#fff", fontSize: 12, fontWeight: 500, lineHeight: 1.5 }}>
                        المجلس الأعلى للسلطة القضائية
                    </div>
                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, marginTop: 2 }}>
                        منصة تقارير القضاة
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1 }}>
                    {NAV.map(n => (
                        <NavLink key={n.to} to={n.to} end={n.to === "/"}
                            style={({ isActive }) => ({
                                display: "flex", alignItems: "center", gap: 9, padding: "9px 10px",
                                borderRadius: 8, fontSize: 13, textDecoration: "none", marginBottom: 3,
                                transition: "all .12s",
                                background: isActive ? "rgba(200,168,75,.18)" : "transparent",
                                color: isActive ? "#c8a84b" : "rgba(255,255,255,.6)",
                                fontWeight: isActive ? 500 : 400,
                            })}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d={n.icon} />
                            </svg>
                            {n.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div style={{ paddingTop: "1rem", borderTop: "0.5px solid rgba(255,255,255,.1)" }}>
                    <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, marginBottom: 8 }}>
                        {user?.nom} · {user?.role}
                    </div>
                    {user?.role === "admin" && (
                        <button onClick={handleTrain}
                            style={{
                                width: "100%", padding: "7px", background: "rgba(200,168,75,.15)",
                                color: "#c8a84b", border: "0.5px solid rgba(200,168,75,.3)", borderRadius: 7,
                                fontSize: 11, fontFamily: "'Tajawal',sans-serif", cursor: "pointer", marginBottom: 5
                            }}>
                            إعادة تدريب النماذج
                        </button>
                    )}
                    <button onClick={handleLogout}
                        style={{
                            width: "100%", padding: "7px", background: "transparent",
                            color: "rgba(255,255,255,.4)", border: "0.5px solid rgba(255,255,255,.12)",
                            borderRadius: 7, fontSize: 11, fontFamily: "'Tajawal',sans-serif", cursor: "pointer"
                        }}>
                        خروج
                    </button>
                </div>
            </div>

            {/* Main */}
            <div style={{
                flex: 1, padding: "1.5rem", overflowY: "auto", direction: "rtl",
                minWidth: 0, maxWidth: "100%"
            }}>
                <Outlet />
            </div>
        </div>
    );
}
