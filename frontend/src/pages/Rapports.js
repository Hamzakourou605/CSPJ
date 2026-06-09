import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { C, Badge, Card, SectionTitle, PageHeader, Spinner, ScoreGauge, SentimentBar, CoherenceBar, MLChip } from "../Components/designe";
import toast from "react-hot-toast";

const REFRESH_INTERVAL = 30000;

export default function Rapports() {
    const [rapports, setRapports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const intervalRef = useRef(null);
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("status");
    const [expanded, setExpanded] = useState({});
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        try {
            const res = await api.rapports();
            const newRapports = (res.data.rapports || []).map(r => ({
                ...r,
                // Normalize Arabic strings to prevent invisible RTL marks / spaces
                coherence_statut: (r.coherence_statut || "").trim(),
                sentiment_label:  (r.sentiment_label  || "").trim(),
                nasaq_type:       (r.nasaq_type        || "").trim(),
            }));

            console.log("[Rapports] Chargé:", newRapports.length, "rapports");

            setRapports(prev => {
                if (prev.length > 0 && newRapports.length !== prev.length) {
                    toast.success(`تم تحديث التقارير: ${newRapports.length} تقرير`, { id: "rapports-sync" });
                }
                return newRapports;
            });
            setLastUpdated(new Date());
        } catch (err) {
            console.error("[Rapports] Erreur chargement:", err);
            if (!silent) toast.error("خطأ في التحميل: " + (err.message || "unknown"));
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const f = params.get("f");
        if (f) setFilter(f.trim());
        load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stable interval — does not reset on every data change
    useEffect(() => {
        intervalRef.current = setInterval(() => load(true), REFRESH_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [load]);

    const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

    // Strings are already .trim()-ed in load(); safe to compare directly
    let data = filter === "all" ? rapports : rapports.filter(r => r.coherence_statut === filter);
    if (sort === "score_desc") data = [...data].sort((a, b) => b.score_total - a.score_total);
    else if (sort === "score_asc") data = [...data].sort((a, b) => a.score_total - b.score_total);
    else data = [...data].sort((a, b) => {
        const o = { "تناقض": 0, "شك": 1, "متسق": 2 };
        return (o[a.coherence_statut] ?? 3) - (o[b.coherence_statut] ?? 3);
    });

    const cnt = {
        all: rapports.length,
        incoh: rapports.filter(r => r.coherence_statut === "تناقض").length,
        doubt: rapports.filter(r => r.coherence_statut === "شك").length,
        ok: rapports.filter(r => r.coherence_statut === "متسق").length,
    };

    if (loading) return <Spinner />;

    return (
        <div style={{ direction: "rtl" }}>
            <PageHeader
                title="التقارير والتناقضات"
                sub="مقارنة وصف التقييم بالنقاط الإجمالية لكل قاضٍ — الوصف vs النقاط"
            action={
                    <div style={{ display: "flex", alignItems: "center", gap: 10, direction: "rtl" }}>
                        <select value={filter} onChange={e => setFilter(e.target.value)}
                            style={{
                                fontFamily: "'Tajawal',sans-serif", fontSize: 12, padding: "6px 10px",
                                borderRadius: 8, border: "0.5px solid #ddd", background: "#fff",
                                color: "#333", cursor: "pointer"
                            }}>
                            <option value="all">الكل ({cnt.all})</option>
                            <option value="تناقض">تناقض ({cnt.incoh})</option>
                            <option value="شك">شك ({cnt.doubt})</option>
                            <option value="متسق">متسق ({cnt.ok})</option>
                        </select>
                        <select value={sort} onChange={e => setSort(e.target.value)}
                            style={{
                                fontFamily: "'Tajawal',sans-serif", fontSize: 12, padding: "6px 10px",
                                borderRadius: 8, border: "0.5px solid #ddd", background: "#fff",
                                color: "#333", cursor: "pointer"
                            }}>
                            <option value="status">ترتيب: الحالة</option>
                            <option value="score_desc">النقاط ↓</option>
                            <option value="score_asc">النقاط ↑</option>
                        </select>
                        {lastUpdated && (
                            <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'Tajawal',sans-serif" }}>
                                {lastUpdated.toLocaleTimeString("ar-MA")}
                            </span>
                        )}
                        <button onClick={() => load(false)} disabled={isRefreshing}
                            style={{
                                padding: "7px 16px", background: isRefreshing ? "#94a3b8" : C.navy,
                                color: "#fff", border: "none", borderRadius: 9, fontSize: 13,
                                fontFamily: "'Tajawal',sans-serif", cursor: isRefreshing ? "not-allowed" : "pointer",
                                transition: "background .2s"
                            }}>
                            تحديث
                        </button>
                    </div>
                }
            />

            {/* Stats summary bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: "1rem" }}>
                {[
                    ["الكل", cnt.all, C.navy],
                    ["تناقض", cnt.incoh, C.incoh],
                    ["شك", cnt.doubt, C.doubt],
                    ["متسق", cnt.ok, C.ok],
                ].map(([l, v, c]) => (
                    <div key={l} onClick={() => setFilter(l === "الكل" ? "all" : l)}
                        style={{
                            background: "#fff", borderRadius: 9, border: `0.5px solid ${filter === (l === "الكل" ? "all" : l) ? c : "#e8e4da"}`,
                            padding: "9px 12px", cursor: "pointer", transition: "border-color .15s"
                        }}>
                        <div style={{ fontSize: 10, color: "#aaa" }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Rapports list */}
            {data.map(r => {
                const bc = r.coherence_statut === "تناقض" ? C.incoh : r.coherence_statut === "شك" ? C.doubt : C.ok;
                const isOpen = expanded[r.rapport_id];
                const avBg = r.coherence_statut === "تناقض" ? "#fcebeb" : r.coherence_statut === "شك" ? "#faeeda" : "#e1f5ee";
                const avCol = r.coherence_statut === "تناقض" ? "#a32d2d" : r.coherence_statut === "شك" ? "#854f0b" : "#0f6e56";
                const initials = r.nom_complet?.split(' ').map(w => w[0]).join('').slice(0, 2) || "؟";

                return (
                    <div key={r.rapport_id}
                        style={{
                            background: "#fff", borderRadius: "0 12px 12px 0",
                            border: "0.5px solid #e8e4da", borderRight: `4px solid ${bc}`,
                            marginBottom: 9, overflow: "hidden"
                        }}>

                        {/* ─── Header ─── */}
                        <div onClick={() => toggle(r.rapport_id)}
                            style={{
                                display: "flex", alignItems: "center", padding: "11px 14px",
                                cursor: "pointer", gap: 10, transition: "background .12s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fafaf7"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                            <div style={{
                                width: 36, height: 36, borderRadius: "50%", background: avBg,
                                color: avCol, display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0
                            }}>
                                {initials}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 600, fontSize: 14, color: C.navy, whiteSpace: "nowrap",
                                    overflow: "hidden", textOverflow: "ellipsis"
                                }}>{r.nom_complet}</div>
                                <div style={{ fontSize: 11, color: "#aaa" }}>{r.role} · {r.tribunal}</div>
                            </div>

                            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                                <Badge t={r.coherence_statut || ""} />
                                <Badge t={r.sentiment_label || ""} />
                                <Badge t={r.nasaq_type || ""} />
                                {r.anomalie ? <Badge t="تنبيه خاص" /> : null}
                                <span style={{
                                    background: C.navy, color: "#fff", padding: "4px 12px",
                                    borderRadius: 20, fontSize: 13, fontWeight: 700
                                }}>
                                    {r.score_total}/100
                                </span>
                                <span style={{ fontSize: 16, color: "#ccc", userSelect: "none" }}>{isOpen ? "−" : "+"}</span>
                            </div>
                        </div>

                        {/* ─── Body expandable ─── */}
                        {isOpen && (
                            <div style={{ padding: "0 14px 16px" }}>

                                {/* Score vs Description */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>

                                    {/* Gauche: scores */}
                                    <div>
                                        <div style={{
                                            fontSize: 11, color: "#aaa", marginBottom: 6, fontWeight: 600,
                                            textTransform: "uppercase", letterSpacing: ".04em"
                                        }}>
                                            النقاط الإجمالية
                                        </div>
                                        <ScoreGauge score={r.score_total} />
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                                            {[["الكفاءة", r.score_efficacite], ["النزاهة", r.score_integrite],
                                            ["السلوك", r.score_conduite], ["المعدل", `${r.note_obtenue}/10`]].map(([l, v]) => (
                                                <div key={l} style={{
                                                    background: "#f8f7f2", borderRadius: 7,
                                                    padding: "7px 10px", textAlign: "center"
                                                }}>
                                                    <div style={{ fontSize: 16, fontWeight: 600, color: C.navy }}>{v}</div>
                                                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{l}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Droite: description + NLP */}
                                    <div>
                                        <div style={{
                                            fontSize: 11, color: "#aaa", marginBottom: 6, fontWeight: 600,
                                            textTransform: "uppercase", letterSpacing: ".04em"
                                        }}>
                                            وصف وتعليق التقييم
                                        </div>
                                        <div style={{
                                            background: "#fafaf7", border: "0.5px solid #e8e4da",
                                            borderRadius: 10, padding: "12px 14px", marginBottom: 10
                                        }}>
                                            <div style={{ fontSize: 14, lineHeight: 2, color: "#333" }}>
                                                "{r.description_evaluation}"
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 5 }}>
                                            تحليل الشعور (NLP عربي):
                                        </div>
                                        <SentimentBar
                                            posP={r.sentiment_label === "إيجابي" ? 70 : 10}
                                            neuP={r.sentiment_label === "محايد" ? 70 : 20}
                                            negP={r.sentiment_label === "سلبي" ? 70 : 10} />
                                        {r.tfidf_top_words && (
                                            <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
                                                كلمات TF-IDF: <span style={{ color: C.navy, fontWeight: 500 }}>{r.tfidf_top_words}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Verdict IA */}
                                <div style={{
                                    background: r.coherence_statut === "تناقض" ? "#fef8f8" : r.coherence_statut === "شك" ? "#fefaf3" : "#f3fcf7",
                                    border: `0.5px solid ${bc}44`, borderRadius: 9,
                                    padding: "10px 14px", marginBottom: 10
                                }}>
                                    <div style={{
                                        fontSize: 11, fontWeight: 600, color: "#999",
                                        textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 5
                                    }}>
                                        الاستنتاج التحليلي
                                    </div>
                                    <div style={{ fontSize: 13, color: "#333", lineHeight: 1.8 }}>{r.verdict_texte}</div>
                                </div>

                                {/* ML Results */}
                                <div style={{
                                    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                                    gap: 8, marginBottom: 10
                                }}>
                                    <MLChip label="التوقع التحليلي" value={r.rf_prediction || "—"} color={C.navy} />
                                    <MLChip label="درجة الموثوقية" value={`${Math.round((r.rf_confidence || 0) * 100)}%`} color={C.ok} />
                                    <MLChip label="تصنيف الأداء" value={r.cluster_label || "—"} color={C.sari3} />
                                    <MLChip label="تحليل" value={r.anomalie ? "حالة غير عادية" : "طبيعي"} color={r.anomalie ? C.purple : C.ok} />
                                    <MLChip label="نسبة التوافق" value={`${r.coherence_pct || 0}%`} color={bc} />
                                </div>

                                {/* Taraqqi + action */}
                                <div style={{
                                    display: "flex", alignItems: "center",
                                    justifyContent: "space-between", flexWrap: "wrap", gap: 8
                                }}>
                                    <div style={{ fontSize: 12, color: "#888" }}>
                                        <Badge t={r.nasaq_type || ""} />
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); navigate(`/rapports/${r.rapport_id}`); }}
                                        style={{
                                            padding: "7px 16px", background: C.navy, color: "#fff", border: "none",
                                            borderRadius: 8, fontSize: 12, fontFamily: "'Tajawal',sans-serif",
                                            cursor: "pointer"
                                        }}>
                                        عرض الكامل ←
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
