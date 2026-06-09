import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { C, Badge, Card, SectionTitle, MetricCard, CoherenceBar, PageHeader, Spinner, ScoreGauge, SentimentBar, MLChip } from "../Components/designe";
import toast from "react-hot-toast";
import {
    ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, Cell
} from "recharts";

const REFRESH_INTERVAL = 30000;

export default function Detail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [r, setR] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const intervalRef = useRef(null);
    const [feedback, setFeedback] = useState("");
    const [sending, setSending] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const res = await api.rapport(id);
            setR(res.data);
            setLastUpdated(new Date());
        } catch {
            if (!silent) navigate("/rapports");
        } finally {
            setIsRefreshing(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => { load(false); }, [load]);

    useEffect(() => {
        intervalRef.current = setInterval(() => load(true), REFRESH_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [load]);

    const handleFeedback = async () => {
        if (!feedback) return;
        setSending(true);
        try {
            await api.feedback(id, feedback);
            toast.success("تم إرسال التعليق وتصحيح المسار");
            setFeedback("");
            load(true);
        } catch { toast.error("خطأ في الإرسال"); }
        finally { setSending(false); }
    };

    if (!r) return <Spinner />;

    const bc = r.coherence_statut === "تناقض" ? C.incoh : r.coherence_statut === "شك" ? C.doubt : C.ok;
    const initials = r.nom_complet?.split(' ').map(w => w[0]).join('').slice(0, 2) || "؟";


    const scoresBar = [
        { name: "الإجمالي", val: r.score_total, fill: bc },
        { name: "الكفاءة", val: r.score_efficacite, fill: C.sari3 },
        { name: "النزاهة", val: r.score_integrite, fill: C.ok },
        { name: "السلوك", val: r.score_conduite, fill: C.mut },
    ];

    return (
        <div style={{ direction: "rtl" }}>
            {/* Back + header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.4rem", flexWrap: "wrap" }}>
                <button onClick={() => navigate("/rapports")}
                    style={{
                        padding: "7px 14px", background: "#f2f0ea", border: "0.5px solid #ddd",
                        borderRadius: 8, fontSize: 12, fontFamily: "'Tajawal',sans-serif",
                        cursor: "pointer", color: "#555"
                    }}>
                    ← العودة
                </button>
                <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: bc + "22", color: bc,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14, fontWeight: 600
                }}>
                    {initials}
                </div>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>{r.nom_complet}</h1>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{r.role} · {r.tribunal}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginRight: "auto", alignItems: "center" }}>
                    {lastUpdated && (
                        <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'Tajawal',sans-serif", marginLeft: 10 }}>
                            {lastUpdated.toLocaleTimeString("ar-MA")}
                        </span>
                    )}
                    <button onClick={() => load(false)} disabled={isRefreshing}
                        style={{
                            padding: "6px 12px", background: isRefreshing ? "#94a3b8" : C.navy,
                            color: "#fff", border: "none", borderRadius: 7, fontSize: 11,
                            fontFamily: "'Tajawal',sans-serif", cursor: isRefreshing ? "not-allowed" : "pointer",
                            transition: "background .2s", marginLeft: 15
                        }}>
                        تحديث
                    </button>
                    <Badge t={r.coherence_statut || ""} size="lg" />
                    <Badge t={r.prediction_finale || ""} size="lg" />
                    {r.anomalie && <Badge t="تنبيه خاص" size="lg" />}
                </div>
            </div>

            {/* Row 1: Info + Radar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 12 }}>
                <Card>
                    <SectionTitle>معلومات القاضي</SectionTitle>
                    {[
                        ["الاسم الكامل", r.nom_complet],
                        ["الدور", r.role],
                        ["المحكمة", r.tribunal],
                        ["الدرجة", r.grade],
                        ["نقاط التطور", r.points_evolution],
                        ["سنة التقييم", r.annee_evaluation],
                        ["المعدل المحصّل", `${r.note_obtenue}/10`],
                    ].map(([l, v]) => (
                        <div key={l} style={{
                            display: "flex", justifyContent: "space-between",
                            padding: "6px 0", borderBottom: "0.5px solid #f0ede8", fontSize: 13
                        }}>
                            <span style={{ color: "#888" }}>{l}</span>
                            <span style={{ fontWeight: 500, color: C.navy }}>{v}</span>
                        </div>
                    ))}
                </Card>

            </div>

            {/* Row 2: Score vs Description — le cœur de l'app */}
            <Card style={{ borderRight: `4px solid ${bc}`, borderRadius: "0 12px 12px 0", marginBottom: 12 }}>
                <SectionTitle>المقارنة الأساسية: النقاط مقابل الوصف</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>

                    {/* Gauche: score */}
                    <div>
                        <ScoreGauge score={r.score_total} />
                        <div style={{ marginTop: 12 }}>
                            <ResponsiveContainer width="100%" height={130}>
                                <BarChart data={scoresBar} barSize={26} layout="vertical">
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#888" }} width={55} />
                                    <Tooltip formatter={v => [`${v}/100`]} />
                                    <Bar dataKey="val" radius={[0, 4, 4, 0]}>
                                        {scoresBar.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Droite: description */}
                    <div>
                        <div style={{
                            background: "#fafaf7", border: "0.5px solid #e8e4da",
                            borderRadius: 10, padding: "14px 16px", marginBottom: 12
                        }}>
                            <div style={{
                                fontSize: 10, color: "#aaa", marginBottom: 6, textTransform: "uppercase",
                                letterSpacing: ".04em"
                            }}>وصف وتعليق التقييم الكامل</div>
                            <div style={{ fontSize: 14, lineHeight: 2.1, color: "#333", fontStyle: "italic" }}>
                                "{r.description_evaluation}"
                            </div>
                        </div>

                        {/* Sentiment */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                marginBottom: 5
                            }}>
                                <span style={{ fontSize: 11, color: "#aaa" }}>تحليل الشعور (NLP عربي)</span>
                                <Badge t={r.sentiment_label || ""} />
                            </div>
                            <SentimentBar
                                posP={r.sentiment_label === "إيجابي" ? 72 : 10}
                                neuP={r.sentiment_label === "محايد" ? 72 : 20}
                                negP={r.sentiment_label === "سلبي" ? 72 : 10} />
                        </div>

                        {/* TF-IDF keywords */}
                        {r.tfidf_top_words && (
                            <div style={{
                                background: "#f8f7f2", borderRadius: 8,
                                padding: "8px 12px", fontSize: 12, color: "#666"
                            }}>
                                <span style={{ color: "#aaa" }}>كلمات TF-IDF الأبرز: </span>
                                {r.tfidf_top_words.split(" | ").map((w, i) => (
                                    <span key={i} style={{
                                        background: C.navy + "11", color: C.navy,
                                        padding: "2px 7px", borderRadius: 4,
                                        margin: "2px", display: "inline-block", fontSize: 11
                                    }}>
                                        {w}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Coherence meter */}
                        <div style={{ marginTop: 10 }}>
                            <div style={{
                                display: "flex", justifyContent: "space-between",
                                fontSize: 11, color: "#aaa", marginBottom: 5
                            }}>
                                <span>مقياس التماسك (الوصف مقابل النقاط)</span>
                                <span style={{ color: bc, fontWeight: 600 }}>{r.coherence_pct}%</span>
                            </div>
                            <CoherenceBar pct={r.coherence_pct || 0} statut={r.coherence_statut} />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Verdict IA */}
            <Card style={{
                background: r.coherence_statut === "تناقض" ? "#fef8f8" : r.coherence_statut === "شك" ? "#fefaf3" : "#f3fcf7",
                border: `0.5px solid ${bc}55`, marginBottom: 12
            }}>
                <SectionTitle>الاستنتاج التحليلي — فحص الثقة والاتساق</SectionTitle>
                <div style={{ fontSize: 14, color: "#333", lineHeight: 1.9 }}>{r.verdict_texte}</div>

                {/* Feedback Loop Section */}
                <div style={{ marginTop: 20, paddingTop: 15, borderTop: "1px dashed #ddd" }}>
                    <SectionTitle>حلقة التعلم (Feedback Loop) — للمشرف فقط</SectionTitle>
                    <div style={{ display: "flex", gap: 10 }}>
                        <input
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="هل الحكم غير دقيق؟ أدخل التصحيح هنا..."
                            style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "'Tajawal', sans-serif" }}
                        />
                        <button
                            onClick={handleFeedback}
                            disabled={sending || !feedback}
                            style={{ padding: "8px 20px", background: C.navy, color: "#fff", border: "none", borderRadius: 8, cursor: (sending || !feedback) ? "not-allowed" : "pointer" }}
                        >
                            {sending ? "إرسال..." : "تصحيح"}
                        </button>
                    </div>
                    <p style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>
                        * سيتم استخدام هذا التعليق لإعادة تدريب النماذج وتحسين دقتها مستقبلاً.
                    </p>
                </div>
            </Card>

            {/* ML Models Results */}
            <Card style={{ marginBottom: 12 }}>
                <SectionTitle>التحليل الإحصائي المتقدم</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                    <MLChip label="التوقع التحليلي" value={r.rf_prediction || "—"} color={C.navy} />
                    <MLChip label="درجة الموثوقية" value={`${Math.round((r.rf_confidence || 0) * 100)}%`} color={C.ok} />
                    <MLChip label="تصنيف الأداء" value={r.cluster_label || "—"} color={C.sari3} />
                    <MLChip label="رقم الفئة" value={`Group ${r.cluster_id ?? 0}`} color={C.mut} />
                    <MLChip label="تحليل التباين" value={r.anomalie ? "حالة غير عادية" : "طبيعي"} color={r.anomalie ? C.purple : C.ok} />
                    <MLChip label="مؤشر الاختلاف" value={r.anomalie_score?.toFixed(3) || "—"} color={C.purple} />
                    <MLChip label="التقييم المقترح" value={r.prediction_finale || "—"} color={bc} />
                    <MLChip label="نسبة التوافق" value={`${r.coherence_pct || 0}%`} color={bc} />
                </div>
            </Card>

            {/* Taraqqi */}
            <Card>
                <SectionTitle>حساب الترقي — الأنساق</SectionTitle>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                    <Badge t={r.nasaq_type || ""} size="lg" />
                </div>
                <div style={{
                    position: "relative", height: 28, borderRadius: 9, overflow: "hidden",
                    display: "flex", gap: 1
                }}>
                    {[
                        { label: "الأقدمية", flex: r.M_value || 1, bg: "#FAC775", tc: "#633806" },
                        { label: "المتوسط", flex: (r.R_prime_value || 1) - (r.M_value || 0), bg: "#C0DD97", tc: "#27500A" },
                        { label: "السريع", flex: Math.max(5, (r.R_value || 1) - (r.R_prime_value || 0) + 10), bg: "#B5D4F4", tc: "#0C447C" },
                    ].map(z => (
                        <div key={z.label} style={{
                            flex: z.flex, background: z.bg, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 500, color: z.tc
                        }}>
                            {z.label}
                        </div>
                    ))}
                </div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>
                    نقاط التطور: <strong>{r.points_evolution}</strong> · المعدل المحصّل: <strong>{r.note_obtenue}/10</strong>
                </div>
            </Card>
        </div>
    );
}
