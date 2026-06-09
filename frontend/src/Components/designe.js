export const C = {
  navy:"#1a3a5c", gold:"#c8a84b", bg:"#f2f0ea",
  incoh:"#E24B4A", doubt:"#EF9F27", ok:"#1D9E75",
  sari3:"#378ADD", mut:"#639922", aqd:"#BA7517",
  pos:"#1D9E75", neu:"#888780", neg:"#E24B4A",
  purple:"#7b1fa2",
};

const BADGE_CONF = {
  "تناقض":         { bg:"#fcebeb", color:"#a32d2d" },
  "شك":            { bg:"#faeeda", color:"#854f0b" },
  "متسق":          { bg:"#e1f5ee", color:"#0f6e56" },
  "السريع":        { bg:"#e6f1fb", color:"#185fa5" },
  "المتوسط":       { bg:"#eaf3de", color:"#3b6d11" },
  "الأقدمية":      { bg:"#faeeda", color:"#854f0b" },
  "إيجابي":        { bg:"#e1f5ee", color:"#0f6e56" },
  "محايد":         { bg:"#f1efe8", color:"#5f5e5a" },
  "سلبي":          { bg:"#fcebeb", color:"#a32d2d" },
  "مراجعة مطلوبة": { bg:"#fcebeb", color:"#a32d2d" },
  "قيد المراقبة":  { bg:"#faeeda", color:"#854f0b" },
  "موثوق":         { bg:"#e1f5ee", color:"#0f6e56" },
  "شذوذ AI":       { bg:"#f3e5f5", color:"#7b1fa2" },
};

export function Badge({ t, size="sm" }) {
  const c = BADGE_CONF[t] || { bg:"#eee", color:"#333" };
  const fs = size === "lg" ? 13 : 12;
  const p  = size === "lg" ? "4px 12px" : "3px 9px";
  return (
    <span style={{ background:c.bg, color:c.color, padding:p,
                   borderRadius:20, fontSize:fs, fontWeight:500,
                   display:"inline-block", whiteSpace:"nowrap" }}>
      {t}
    </span>
  );
}

export function Card({ children, style={} }) {
  return (
    <div style={{ background:"#fff", borderRadius:12,
                  border:"0.5px solid #e8e4da", padding:"14px 18px", ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:600, color:"#999",
                  textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, color, sub, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:"#fff", borderRadius:11, border:"0.5px solid #e8e4da",
               padding:"14px 16px", cursor: onClick ? "pointer" : "default",
               transition:"border-color .15s, box-shadow .15s" }}
      onMouseEnter={e => { if(onClick) { e.currentTarget.style.borderColor="#1a3a5c"; e.currentTarget.style.boxShadow="0 2px 12px rgba(26,58,92,.08)"; }}}
      onMouseLeave={e => { e.currentTarget.style.borderColor="#e8e4da"; e.currentTarget.style.boxShadow="none"; }}>
      <div style={{ fontSize:11, color:"#999", marginBottom:5, fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700, color: color || C.navy, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#bbb", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export function ScoreGauge({ score }) {
  const col = score >= 80 ? C.ok : score >= 60 ? C.mut : score >= 40 ? C.doubt : C.incoh;
  const bg  = score >= 80 ? "#e1f5ee" : score >= 60 ? "#eaf3de" : score >= 40 ? "#faeeda" : "#fcebeb";
  const lbl = score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : score >= 40 ? "متوسط" : "ضعيف";
  return (
    <div style={{ background:bg, borderRadius:10, padding:"14px", textAlign:"center" }}>
      <div style={{ fontSize:36, fontWeight:700, color:col, lineHeight:1 }}>{score}</div>
      <div style={{ fontSize:11, color:col, marginTop:3 }}>/100 · {lbl}</div>
      <div style={{ height:5, background:"rgba(0,0,0,.1)", borderRadius:3, marginTop:9, overflow:"hidden" }}>
        <div style={{ width:`${score}%`, height:"100%", background:col, borderRadius:3 }}/>
      </div>
    </div>
  );
}

export function CoherenceBar({ pct, statut }) {
  const col = statut === "تناقض" ? C.incoh : statut === "شك" ? C.doubt : C.ok;
  return (
    <div>
      <div style={{ display:"flex", gap:2, marginBottom:3 }}>
        {Array.from({ length:10 }, (_, i) => (
          <div key={i} style={{ flex:1, height:5, borderRadius:2,
            background: i < Math.round(pct / 10) ? col : "#e8e4da" }}/>
        ))}
      </div>
      <div style={{ fontSize:11, color:col, fontWeight:500, textAlign:"left" }}>{pct}%</div>
    </div>
  );
}

export function SentimentBar({ posP=30, neuP=40, negP=30 }) {
  return (
    <div>
      <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden", gap:1 }}>
        <div style={{ flex:posP, background:C.pos }}/>
        <div style={{ flex:neuP, background:C.neu }}/>
        <div style={{ flex:negP, background:C.neg }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#aaa", marginTop:2 }}>
        <span>إيجابي</span><span>محايد</span><span>سلبي</span>
      </div>
    </div>
  );
}

export function MLChip({ label, value, color }) {
  return (
    <div style={{ background:"#f8f7f2", borderRadius:8, padding:"8px 12px",
                  border:"0.5px solid #e8e4da", textAlign:"center" }}>
      <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:600, color: color || C.navy }}>{value}</div>
    </div>
  );
}

export function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
                  marginBottom:"1.4rem", gap:12 }}>
      <div>
        <h1 style={{ fontSize:20, fontWeight:700, color:C.navy, margin:0 }}>{title}</h1>
        {sub && <p style={{ fontSize:12, color:"#aaa", marginTop:4 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ textAlign:"center", padding:"3rem 0", color:"#aaa", fontSize:13 }}>
      جارٍ التحميل...
    </div>
  );
}
