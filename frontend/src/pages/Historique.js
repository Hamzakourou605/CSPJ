import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import { C, Badge, Card, SectionTitle, MetricCard, CoherenceBar, PageHeader, Spinner } from "../Components/designe";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie
} from "recharts";
import { ScoreGauge, SentimentBar, MLChip } from "../Components/designe";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const REFRESH_INTERVAL = 30000;

export default function Historique() {
    const [hist, setHist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const intervalRef = useRef(null);
    const [filterAnomalie, setFilterAnomalie] = useState(false);
    const [selectedNasaq, setSelectedNasaq] = useState(null);
    const [expanded, setExpanded] = useState({});
    const navigate = useNavigate();

    const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        try {
            const res = await api.historique();
            const newHist = res.data.historique || [];

            console.log("[Historique] API Response:", res.data);
            console.log("[Historique] Chargé:", newHist.length, "enregistrements");
            
            if (newHist.length === 0) {
                console.warn("[Historique] Aucun enregistrement trouvé. Le backend retourne une liste vide.");
            }

            // Détecter les changements
            if (hist.length > 0 && newHist.length !== hist.length) {
                toast.success(`تم تحديث السجل: ${newHist.length} تحليل`, { id: "hist-sync" });
            } else if (!silent && newHist.length === 0) {
                toast.info("السجل فارغ - حاول تحليل التقارير أولاً", { duration: 3000 });
            }

            setHist(newHist);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("[Historique] Erreur chargement:", err);
            if (!silent) {
                const errMsg = err.response?.data?.error || err.message || "unknown error";
                toast.error("خطأ في تحميل السجل: " + errMsg);
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }

    }, [hist]);

    useEffect(() => { load(false); }, []);

    useEffect(() => {
        intervalRef.current = setInterval(() => load(true), REFRESH_INTERVAL);
        return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hist]);

    if (loading) return <Spinner />;

   
    const total = hist?.length || 0;
    const incoh = hist?.filter(h => h?.coherence_statut === "تناقض").length || 0;
    const doute = hist?.filter(h => h?.coherence_statut === "شك").length || 0;
    const ok = hist?.filter(h => h?.coherence_statut === "متسق").length || 0;
    const revision = hist?.filter(h => h?.prediction_finale === "مراجعة مطلوبة").length || 0;
    const anomalies = hist?.filter(h => h?.anomalie).length || 0;


    const displayHist = filterAnomalie ? hist?.filter(h => h?.anomalie) : hist;

    const cohPie = [
        { name: "تناقض", val: incoh, fill: C.incoh },
        { name: "شك", val: doute, fill: C.doubt },
        { name: "متسق", val: ok, fill: C.ok },
    ].filter(d => d.val > 0);

    const nasaqCounts = {};
    hist?.forEach(h => { if (h?.nasaq_type) nasaqCounts[h.nasaq_type] = (nasaqCounts[h.nasaq_type] || 0) + 1; });
    const nasaqBar = Object.entries(nasaqCounts).map(([name, val]) => ({
        name, val,
        fill: name === "السريع" ? C.sari3 : name === "المتوسط" ? C.mut : C.aqd
    }));

    const handleExport = async () => {
        const token = localStorage.getItem("cspj_token");
        const id = toast.loading("جاري تحضير ملف CSV...");
        try {
            const resp = await fetch("http://127.0.0.1:5000/api/export/csv", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.msg || errData.error || "Export failed");
            }

            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `rapport_cspj_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("تم تحميل ملف CSV بنجاح", { id });
        } catch (err) {
            toast.error(err.message === "Aucune donnée à exporter" ? "لا توجد بيانات للتصدير" : "خطأ dans l'export CSV", { id });
        }
    };

    const handleExportPDF = async () => {
        const token = localStorage.getItem("cspj_token");
        const id = toast.loading("جاري توليد ملف PDF...");
        try {
            const resp = await fetch("http://127.0.0.1:5000/api/export/pdf", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.msg || errData.error || "Export failed");
            }

            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `rapport_cspj_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("تم تحميل ملف PDF بنجاح", { id });
        } catch (err) {
            toast.error(err.message === "Aucune donnée trouvée pour l'export" ? "لا توجد بيانات للتصدير" : "خطأ في تصدير PDF", { id });
        }
    };

    return (
        <div style={{ direction: "rtl" }}>
            <PageHeader
                title="السجل"
                sub={`${total} تحليل محفوظ — سجل الأنشطة على المنصة`}
            action={
                    <div style={{ display: "flex", alignItems: "center", gap: 10, direction: "rtl" }}>
                        <button onClick={handleExportPDF}
                            style={{
                                padding: "8px 16px", background: "#E24B4A", color: "#fff", border: "none",
                                borderRadius: 9, fontSize: 13, fontFamily: "'Tajawal',sans-serif", cursor: "pointer"
                            }}>
                            تصدير PDF
                        </button>
                        <button onClick={handleExport}
                            style={{
                                padding: "8px 16px", background: C.gold, color: "#fff", border: "none",
                                borderRadius: 9, fontSize: 13, fontFamily: "'Tajawal',sans-serif", cursor: "pointer"
                            }}>
                            تصدير CSV
                        </button>
                        {lastUpdated && (
                            <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'Tajawal',sans-serif" }}>
                                {lastUpdated.toLocaleTimeString("ar-MA")}
                            </span>
                        )}
                        <button onClick={() => load(false)} disabled={isRefreshing}
                            style={{
                                padding: "8px 16px", background: isRefreshing ? "#94a3b8" : C.navy,
                                color: "#fff", border: "none", borderRadius: 9, fontSize: 13,
                                fontFamily: "'Tajawal',sans-serif", cursor: isRefreshing ? "not-allowed" : "pointer",
                                transition: "background .2s"
                            }}>
                            تحديث
                        </button>
                    </div>
                }
            />

            {/* KPIs */}
            <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
                gap: 9, marginBottom: "1.2rem"
            }}>
                {[
                    ["إجمالي التحليلات", total, C.navy],
                    ["تناقضات", incoh, C.incoh],
                    ["حالات شك", doute, C.doubt],
                    ["متسق", ok, C.ok],
                    ["مراجعة مطلوبة", revision, C.incoh],
                    ["شذوذات AI", anomalies, C.purple],
                ].map(([l, v, c]) => (
                    <div key={l} onClick={() => l === "شذوذات AI" && setFilterAnomalie(!filterAnomalie)}
                        style={{
                            background: "#fff", borderRadius: 10, cursor: l === "شذوذات AI" ? "pointer" : "default",
                            border: filterAnomalie && l === "شذوذات AI" ? `1.5px solid ${c}` : "0.5px solid #e8e4da", padding: "12px 14px"
                        }}>
                        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            {total > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <Card>
                        <SectionTitle>توزيع حالات التماسك</SectionTitle>
                        <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            {cohPie.map(d => (
                                <span key={d.name} style={{
                                    display: "flex", alignItems: "center",
                                    gap: 4, fontSize: 11, color: "#666"
                                }}>
                                    <span style={{
                                        width: 8, height: 8, borderRadius: 2,
                                        background: d.fill, display: "inline-block"
                                    }} />
                                    {d.name} ({d.val})
                                </span>
                            ))}
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie data={cohPie} dataKey="val" nameKey="name"
                                    cx="50%" cy="50%" outerRadius={65} innerRadius={30}
                                    label={({ percent }) => `${Math.round(percent * 100)}%`} labelLine={false}>
                                    {cohPie.map((e, i) => (
                                        <Cell key={i} fill={e.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>

                    <Card>
                        <SectionTitle>
                            توزيع الأنساق في التحليلات
                            <span style={{ fontSize: 10, color: "#aaa", fontWeight: 400, marginRight: 6 }}>
                                (انقر على شريط لعرض القضاة)
                            </span>
                        </SectionTitle>
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={nasaqBar} barSize={36}>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} />
                                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                                <Tooltip />
                                <Bar dataKey="val" radius={[4, 4, 0, 0]}
                                    cursor="pointer"
                                    onClick={(data) => setSelectedNasaq(prev => prev === data.name ? null : data.name)}>
                                    {nasaqBar.map((e, i) => (
                                        <Cell key={i}
                                            fill={e.fill}
                                            opacity={selectedNasaq && selectedNasaq !== e.name ? 0.35 : 1}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {/* Nasaq Drill-Down Panel */}
            {selectedNasaq && (() => {
                const people = hist.filter(h => h?.nasaq_type === selectedNasaq);
                const col = selectedNasaq === "السريع" ? C.sari3 : selectedNasaq === "المتوسط" ? C.mut : C.aqd;
                return (
                    <Card style={{ marginBottom: 12, borderRight: `4px solid ${col}`, borderRadius: "0 12px 12px 0", animation: "fadeIn .2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <SectionTitle>
                                قضاة نسق <span style={{ color: col }}>{selectedNasaq}</span>
                                &nbsp;— {people.length} قاضٍ
                            </SectionTitle>
                            <button onClick={() => setSelectedNasaq(null)}
                                style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#aaa" }}>✕</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8 }}>
                            {people.map((h, i) => (
                                <div key={i} style={{
                                    background: col + "11", border: `0.5px solid ${col}44`,
                                    borderRadius: 9, padding: "10px 12px"
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1a3a5c", marginBottom: 3 }}>
                                        {h.user_id || "—"}
                                    </div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: "#888" }}>النقاط: <strong style={{ color: col }}>{h.score_total}</strong>/100</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                        <Badge t={h.coherence_statut || ""} />
                                        <Badge t={h.sentiment_label || ""} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                );
            })()}

            {/* Table / List */}
            <Card>
                <SectionTitle>جدول السجل الكامل</SectionTitle>
                {hist.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem", color: "#aaa", fontSize: 13 }}>
                        لا يوجد سجل بعد — استخدم المحلل الفوري لإنشاء سجلات
                    </div>
                ) : (
                    <div style={{ marginTop: 10 }}>
                        {displayHist.map((r, index) => {
                            const id_key = r.rapport_id || r.hist_id || index; // Fallback for key 
                            const bc = r.coherence_statut === "تناقض" ? C.incoh : r.coherence_statut === "شك" ? C.doubt : C.ok;
                            const isOpen = expanded[id_key];
                            const avBg = r.coherence_statut === "تناقض" ? "#fcebeb" : r.coherence_statut === "شك" ? "#faeeda" : "#e1f5ee";
                            const avCol = r.coherence_statut === "تناقض" ? "#a32d2d" : r.coherence_statut === "شك" ? "#854f0b" : "#0f6e56";
                            const initials = r.nom_complet?.split(' ').map(w => w[0]).join('').slice(0, 2) || "؟";

                            return (
                                <div key={id_key}
                                    style={{
                                        background: "#fff", borderRadius: "0 12px 12px 0",
                                        border: "0.5px solid #e8e4da", borderRight: `4px solid ${bc}`,
                                        marginBottom: 9, overflow: "hidden"
                                    }}>

                                    {/* ─── Header ─── */}
                                    <div onClick={() => toggle(id_key)}
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
                                            <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{r.analyse_le ? new Date(r.analyse_le).toLocaleString("ar-MA") : "—"}</div>
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
                                                            "{r.description_evaluation || r.description}"
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
                                                <button onClick={e => { e.stopPropagation(); if(r.rapport_id) navigate(`/rapports/${r.rapport_id}`); }}
                                                    style={{
                                                        padding: "7px 16px", background: C.navy, color: "#fff", border: "none",
                                                        borderRadius: 8, fontSize: 12, fontFamily: "'Tajawal',sans-serif",
                                                        cursor: r.rapport_id ? "pointer" : "not-allowed",
                                                        opacity: r.rapport_id ? 1 : 0.5
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
                )}
            </Card>
        </div>
    );
}
