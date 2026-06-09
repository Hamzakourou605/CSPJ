import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { C, Badge, Card, SectionTitle, MetricCard, CoherenceBar, PageHeader, Spinner } from "../Components/designe";
import toast from "react-hot-toast";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie,
    ScatterChart, Scatter, CartesianGrid, Legend
} from "recharts";
import { ScoreGauge, SentimentBar, MLChip } from "../Components/designe";

const REFRESH_INTERVAL = 30000; // 30 secondes

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [rapports, setRapports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const intervalRef = useRef(null);
    const [expanded, setExpanded] = useState({});
    const navigate = useNavigate();
    
    const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        try {
            console.log("[Dashboard] Chargement stats et rapports...");
            const [sr, rr] = await Promise.all([api.stats(), api.rapports()]);
            const newStats = sr.data || {};
            const newRapports = rr.data?.rapports || [];

            console.log("[Dashboard] ✓ Stats reçues:", {
                total_juges: newStats.total_juges,
                nb_rapports: newStats.nb_rapports,
                nb_incoherents: newStats.nb_incoherents,
                nb_doute: newStats.nb_doute,
                nb_coherents: newStats.nb_coherents,
                nb_positif: newStats.nb_positif,
                nb_negatif: newStats.nb_negatif,
                nb_neutre: newStats.nb_neutre,
            });
            console.log("[Dashboard] ✓ Rapports reçus:", newRapports.length, "rapports");

            if (newRapports.length > 0) {
                const firstRapport = newRapports[0];
                console.log("[Dashboard] Premier rapport:", {
                    nom: firstRapport.nom_complet,
                    score: firstRapport.score_total,
                    coherence: firstRapport.coherence_statut,
                    sentiment: firstRapport.sentiment_label,
                    nasaq: firstRapport.nasaq_type
                });
            }

            if (stats && newStats.total_juges !== stats.total_juges) {
                toast.success(`تم تحديث البيانات: ${newStats.total_juges} قاضٍ`);
            }

            setStats(newStats);
            setRapports(newRapports);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("[Dashboard] ✗ Erreur:", {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            if (!silent) {
                const errMsg = err.response?.data?.error || err.message || "خطأ غير معروف";
                toast.error("خطأ في تحميل البيانات: " + errMsg);
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }

    }, [stats]);

    // Chargement initial
    useEffect(() => { load(false); }, []);

    // Auto-refresh toutes les 30 secondes
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            load(true); // silent = true → pas de spinner complet
        }, REFRESH_INTERVAL);

        return () => clearInterval(intervalRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stats]);

    if (loading) return <Spinner />;

    // Valeurs par défaut pour chaque stat pour éviter les undefined
    const s = {
        total_juges: 0,
        nb_rapports: 0,
        nb_incoherents: 0,
        nb_doute: 0,
        nb_coherents: 0,
        nb_positif: 0,
        nb_negatif: 0,
        nb_neutre: 0,
        nb_sari3: 0,
        nb_mutawasit: 0,
        nb_aqdamiya: 0,
        nb_anomalies: 0,
        nb_revision: 0,
        moy_score: 0,
        max_score: 0,
        moy_efficacite: 0,
        moy_integrite: 0,
        moy_conduite: 0,
        ...stats
    };

    // Data for charts - Remplir nasaqData à partir des rapports
    const nasaqCounts = {};
    rapports.forEach(r => {
        if (r?.nasaq_type) {
            nasaqCounts[r.nasaq_type] = (nasaqCounts[r.nasaq_type] || 0) + 1;
        }
    });
    const nasaqData = Object.entries(nasaqCounts).map(([name, val]) => ({
        name,
        val: parseInt(val) || 0,
        fill: name === "السريع" ? C.sari3 : name === "المتوسط" ? C.mut : C.aqd
    })).filter(d => d.val > 0);

    // Données sentiments - avec valeurs numériques sûres
    const sentData = [
        { name: "إيجابي", val: Math.max(0, parseInt(s.nb_positif) || 0), fill: C.pos },
        { name: "محايد", val: Math.max(0, parseInt(s.nb_neutre) || 0), fill: C.neu },
        { name: "سلبي", val: Math.max(0, parseInt(s.nb_negatif) || 0), fill: C.neg },
    ].filter(d => d.val > 0);

    // Données cohérence - avec valeurs numériques sûres
    const cohData = [
        { name: "تناقض", val: Math.max(0, parseInt(s.nb_incoherents) || 0), fill: C.incoh },
        { name: "شك", val: Math.max(0, parseInt(s.nb_doute) || 0), fill: C.doubt },
        { name: "متسق", val: Math.max(0, parseInt(s.nb_coherents) || 0), fill: C.ok },
    ].filter(d => d.val > 0);

    console.log("[Dashboard] Stats loaded:", { nasaqData, sentData, cohData, stats: s });
    const scoresBar = rapports.map(r => ({
        name: r.nom_complet?.split(' ').slice(0, 2).join(' ') || "",
        score: r.score_total,
        eff: r.score_efficacite,
        int: r.score_integrite,
        fill: r.coherence_statut === "تناقض" ? C.incoh : r.coherence_statut === "شك" ? C.doubt : C.ok,
    }));
    const clusterData = rapports.map(r => ({
        x: r.score_total, y: r.coherence_pct || 50,
        cluster: r.cluster_id || 0, name: r.nom_complet,
        fill: [C.incoh, C.doubt, C.ok][r.cluster_id || 0] || C.ok,
    }));

    const incoherents = rapports.filter(r => r.coherence_statut === "تناقض");

    const PieCard = ({ title, data }) => {
        if (!data || data.length === 0) {
            return (
                <Card>
                    <SectionTitle>{title}</SectionTitle>
                    <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        height: 200, 
                        color: "#999", 
                        fontSize: 12,
                        flexDirection: "column",
                        gap: 8
                    }}>
                        <div>📊 لا توجد بيانات متاحة</div>
                        <div style={{ fontSize: 11, color: "#bbb" }}>قد تحتاج إلى تحليل التقارير أولاً</div>
                    </div>
                </Card>
            );
        }
        return (
            <Card>
                <SectionTitle>{title}</SectionTitle>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    {data.map(d => (
                        <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#666" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, display: "inline-block" }} />
                            {d.name} ({d.val})
                        </span>
                    ))}
                </div>
                <ResponsiveContainer width="100%" height={165}>
                    <PieChart>
                        <Pie data={data} dataKey="val" nameKey="name" cx="50%" cy="50%"
                            outerRadius={65} innerRadius={32}
                            label={({ percent }) => `${Math.round(percent * 100)}%`} labelLine={false}>
                            {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                </ResponsiveContainer>
            </Card>
        );
    };

    return (
        <div style={{ direction: "rtl" }}>
            <PageHeader
                title="لوحة القيادة"
                sub={`السنة التقييمية 2024 · ${s.total_juges || 0} قاضٍ · rapport_des_juges`}
                action={
                    <div style={{ display: "flex", alignItems: "center", gap: 10, direction: "rtl" }}>
                        {lastUpdated && (
                            <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'Tajawal',sans-serif" }}>
                                آخر تحديث: {lastUpdated.toLocaleTimeString("ar-MA")}
                            </span>
                        )}
                        <button onClick={() => load(false)}
                            disabled={isRefreshing}
                            style={{
                                padding: "7px 16px",
                                background: isRefreshing ? "#94a3b8" : C.navy,
                                color: "#fff", border: "none",
                                borderRadius: 9, fontSize: 13,
                                fontFamily: "'Tajawal',sans-serif",
                                cursor: isRefreshing ? "not-allowed" : "pointer",
                                transition: "background .2s",
                                display: "flex", alignItems: "center", gap: 6
                            }}>
                            تحديث فوري
                        </button>
                    </div>
                }
            />

            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 9, marginBottom: "1.2rem" }}>
                <MetricCard label="إجمالي القضاة" value={s.total_juges || 0} color={C.navy} sub="في القاعدة" onClick={() => navigate("/rapports")} />
                <MetricCard label="تناقضات" value={s.nb_incoherents || 0} color={C.incoh} sub="تستوجب مراجعة" onClick={() => navigate("/rapports?f=تناقض")} />
                <MetricCard label="حالات شك" value={s.nb_doute || 0} color={C.doubt} sub="قيد المراقبة" />
                <MetricCard label="متسقون" value={s.nb_coherents || 0} color={C.ok} sub="لا توجد مشكلة" />
                <MetricCard label="متوسط النقاط" value={`${Math.round(s.moy_score || 0)}`} color={C.navy} sub="من 100" />
                <MetricCard label="تنبيهات خاصة" value={s.nb_anomalies || 0} color={C.purple} sub="Isolation Forest" />
                <MetricCard label="مراجعة مطلوبة" value={s.nb_revision || 0} color={C.incoh} sub="حالة حرجة" />
                <MetricCard label="أعلى نقاط" value={`${Math.round(s.max_score || 0)}`} color={C.ok} sub="من 100" />
            </div>

            {/* 3 Pie Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <PieCard title="توزيع الأنساق" data={nasaqData} />
                <PieCard title="توزيع المشاعر" data={sentData} />
                <PieCard title="التماسك والتناقضات" data={cohData} />
            </div>

            {/* Scores Bar + Radar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 10 }}>
                <Card>
                    <SectionTitle>النقاط الإجمالية لكل قاضٍ (اللون = حالة التماسك)</SectionTitle>
                    {scoresBar.length === 0 ? (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: 200,
                            color: "#999",
                            fontSize: 12
                        }}>
                             لا توجد بيانات للعرض
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={scoresBar} barSize={20}>
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#888" }} interval={0} angle={-25} textAnchor="end" height={48} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} />
                                <Tooltip formatter={v => [`${v}/100`, "النقاط"]} />
                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                    {scoresBar.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            {/* Cluster Scatter */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <Card>
                    <SectionTitle>توزيع القضاة حسب النقاط والتماسك</SectionTitle>
                    {clusterData.length === 0 ? (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: 180,
                            color: "#999",
                            fontSize: 12
                        }}>
                            لا توجد بيانات للعرض
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 11, color: "#888" }}>
                                {[["أداء ضعيف", C.incoh], ["أداء متوسط", C.doubt], ["أداء ممتاز", C.ok]].map(([l, c]) => (
                                    <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                                        {l}
                                    </span>
                                ))}
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                                <ScatterChart>
                                    <CartesianGrid stroke="#f0ede8" />
                                    <XAxis dataKey="x" name="النقاط" domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} label={{ value: "النقاط", position: "bottom", fontSize: 10, fill: "#aaa" }} />
                                    <YAxis dataKey="y" name="التماسك" domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} />
                                    <Tooltip cursor={{ strokeDasharray: "3 3" }}
                                        content={({ active, payload }) => active && payload?.length ? (
                                            <div style={{ background: "#fff", border: "0.5px solid #e8e4da", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                                                <div style={{ fontWeight: 600, color: C.navy }}>{payload[0]?.payload?.name}</div>
                                                <div>النقاط: {payload[0]?.value}</div>
                                                <div>التماسك: {payload[1]?.value}%</div>
                                            </div>
                                        ) : null} />
                                    <Scatter data={clusterData} dataKey="y">
                                        {clusterData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </>
                    )}
                </Card>

                <Card>
                    <SectionTitle>مقارنة الكفاءة والنزاهة</SectionTitle>
                    {scoresBar.length === 0 ? (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: 180,
                            color: "#999",
                            fontSize: 12
                        }}>
                             لا توجد بيانات للعرض
                        </div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={scoresBar} barSize={10} barGap={2}>
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#888" }} interval={0} angle={-25} textAnchor="end" height={48} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} />
                                    <Tooltip formatter={(v, n) => [`${v}/100`, n === "eff" ? "الكفاءة" : "النزاهة"]} />
                                    <Bar dataKey="eff" fill={C.sari3} radius={[3, 3, 0, 0]} name="eff" />
                                    <Bar dataKey="int" fill={C.ok} radius={[3, 3, 0, 0]} name="int" />
                                </BarChart>
                            </ResponsiveContainer>
                            <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "#888" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: C.sari3, display: "inline-block" }} />الكفاءة
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: C.ok, display: "inline-block" }} />النزاهة
                                </span>
                            </div>
                        </>
                    )}
                </Card>
            </div>

            {/* Full List of Data Like In Rapports Page */}
            <Card style={{ marginBottom: 10 }}>
                <SectionTitle>جميع البيانات التفصيلية للقضاة</SectionTitle>
                {rapports.length === 0 ? (
                    <div style={{
                        padding: "20px",
                        background: "#f5f3f0",
                        borderRadius: 8,
                        color: "#666",
                        textAlign: "center",
                        fontSize: 13
                    }}>
                    لا توجد تقارير متاحة. تأكد من وجود بيانات في قاعدة البيانات.
                    </div>
                ) : (
                    <div style={{ marginTop: 10 }}>
                        {rapports.map(r => {
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
                )}
            </Card>

            {/* DEBUG SECTION - Affiche les données brutes pour diagnostiquer les problèmes */}
            <Card style={{ marginBottom: 10, background: "#fafaf7", border: "0.5px solid #e8e4da" }}>
                <SectionTitle style={{ fontSize: 12, color: "#999", textTransform: "uppercase" }}>
                    🔧 معلومات التشخيص | Debug Info
                </SectionTitle>
                <div style={{ fontSize: 11, lineHeight: 1.8, color: "#666", fontFamily: "monospace" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                        
                        <div>
                            <div style={{ fontWeight: 600, color: "#333", marginBottom: 8 }}> الإحصائيات الرئيسية</div>
                            <div>إجمالي القضاة: <strong>{s.total_juges}</strong></div>
                            <div>عدد التقارير: <strong>{s.nb_rapports}</strong></div>
                            <div>متوسط النقاط: <strong>{Math.round(s.moy_score || 0)}</strong></div>
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "0.5px solid #ddd" }}>
                                <div style={{ fontWeight: 600, color: "#333", marginBottom: 4 }}>التماسك</div>
                                <div>تناقضات: <strong>{s.nb_incoherents}</strong></div>
                                <div>حالات شك: <strong>{s.nb_doute}</strong></div>
                                <div>متسقون: <strong>{s.nb_coherents}</strong></div>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontWeight: 600, color: "#333", marginBottom: 8 }}> المشاعر والأحكام</div>
                            <div>إيجابي: <strong>{s.nb_positif}</strong></div>
                            <div>سلبي: <strong>{s.nb_negatif}</strong></div>
                            <div>محايد: <strong>{s.nb_neutre}</strong></div>
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "0.5px solid #ddd" }}>
                                <div style={{ fontWeight: 600, color: "#333", marginBottom: 4 }}>الأنساق</div>
                                <div>السريع: <strong>{s.nb_sari3}</strong></div>
                                <div>المتوسط: <strong>{s.nb_mutawasit}</strong></div>
                                <div>الأقدمية: <strong>{s.nb_aqdamiya}</strong></div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 15, paddingTop: 15, borderTop: "0.5px solid #ddd" }}>
                        <div style={{ fontSize: 10, color: "#aaa" }}>
                            ✓ البيانات المحملة بنجاح {lastUpdated ? ` · آخر تحديث: ${lastUpdated.toLocaleTimeString("ar-MA")}` : ""}
                        </div>
                        <div style={{ fontSize: 10, color: "#aaa" }}>
                             افتح "مدير الأدوات للمطورين" (F12) وانظر إلى "Console" لرؤية السجلات التفصيلية
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
