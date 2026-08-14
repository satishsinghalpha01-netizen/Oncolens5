import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, LineChart, Line, BarChart, Bar, Cell, AreaChart, Area
} from "recharts";
import * as d3 from "d3";
import Papa from "papaparse";
import {
  Dna, Search, Sun, Moon, ChevronRight, Activity, Network, TrendingUp,
  FlaskConical, Database, Info, FileText, Upload, Download, X, Check,
  AlertTriangle, Loader2, Sliders, Copy, ArrowUpRight, ArrowDownRight,
  Minus, Menu, ExternalLink, ShieldAlert, Microscope, GitBranch, Layers,
  Printer, ChevronDown, CircleDot
} from "lucide-react";

/* ============================================================================
   DESIGN TOKENS
   bg-void #0A0E14 / panel #10161F / panel-2 #151D29 / line rgba(255,255,255,.08)
   accent cyan #22D3EE (expression/data) · accent magenta #F472B6 (biomarker/up)
   accent amber #FBBF24 (caution/demo) · accent violet #A78BFA (pathway)
   down-reg blue #60A5FA
   Light: bg #F5F7FA / panel #FFFFFF / panel-2 #F0F3F7 / text #131A24
   Fonts: Space Grotesk (display), IBM Plex Sans (body), IBM Plex Mono (data)
   Signature: animated genomic "locus map" hero — a horizontal chromosome
   ideogram with a scanning read-out beam and live-plotted variant ticks.
============================================================================ */

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

function useTheme() {
  const [dark, setDark] = useState(true);
  const t = dark
    ? {
        mode: "dark",
        void: "#0A0E14", panel: "#10161F", panel2: "#141C27", panel3: "#1A2330",
        line: "rgba(255,255,255,0.08)", lineStrong: "rgba(255,255,255,0.14)",
        text: "#E7ECF3", textDim: "#8B96A8", textFaint: "#5C6577",
        cyan: "#22D3EE", magenta: "#F472B6", amber: "#FBBF24", violet: "#A78BFA",
        blue: "#60A5FA", green: "#34D399", red: "#FB7185",
        gradA: "linear-gradient(135deg,#0A0E14 0%,#0E1420 45%,#111A2B 100%)",
        glass: "rgba(20,28,39,0.6)",
      }
    : {
        mode: "light",
        void: "#F3F5F9", panel: "#FFFFFF", panel2: "#F7F9FC", panel3: "#EEF1F7",
        line: "rgba(19,26,36,0.08)", lineStrong: "rgba(19,26,36,0.14)",
        text: "#131A24", textDim: "#5B6577", textFaint: "#8C94A3",
        cyan: "#0891B2", magenta: "#DB2777", amber: "#B45309", violet: "#7C3AED",
        blue: "#2563EB", green: "#059669", red: "#E11D48",
        gradA: "linear-gradient(135deg,#F3F5F9 0%,#EDF1F8 45%,#E7ECF6 100%)",
        glass: "rgba(255,255,255,0.7)",
      };
  return { dark, setDark, t };
}

/* ============================================================================
   SEEDED RNG + DEMO DATA
============================================================================ */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function gaussian(rng, mean, sd) {
  const u = 1 - rng(), v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const CANCER_TYPES = [
  { code: "BRCA", name: "Breast Invasive Carcinoma", tissue: "Breast epithelium", samples: 1098, normal: 113,
    desc: "The most common cancer among women worldwide, arising from ductal or lobular breast epithelial cells." },
  { code: "LUAD", name: "Lung Adenocarcinoma", tissue: "Lung / bronchial epithelium", samples: 585, normal: 59,
    desc: "The most frequent histological subtype of non-small-cell lung cancer, often linked to smoking history." },
  { code: "COAD", name: "Colon Adenocarcinoma", tissue: "Colon mucosa", samples: 461, normal: 41,
    desc: "A gastrointestinal malignancy typically originating from adenomatous polyps in the colon lining." },
  { code: "LIHC", name: "Liver Hepatocellular Carcinoma", tissue: "Hepatocytes", samples: 371, normal: 50,
    desc: "The predominant form of primary liver cancer, frequently associated with cirrhosis and viral hepatitis." },
  { code: "PRAD", name: "Prostate Adenocarcinoma", tissue: "Prostate glandular epithelium", samples: 498, normal: 52,
    desc: "A hormone-sensitive malignancy of the prostate gland, one of the most diagnosed cancers in men." },
];

const GENES = [
  { symbol: "TP53", name: "Tumor protein p53", loc: "17p13.1", func: "Master tumor-suppressor transcription factor; guards genome integrity by triggering cell-cycle arrest, senescence or apoptosis after DNA damage." },
  { symbol: "BRCA1", name: "BRCA1 DNA repair associated", loc: "17q21.31", func: "E3 ubiquitin ligase central to homologous-recombination repair of DNA double-strand breaks; germline loss elevates breast/ovarian cancer risk." },
  { symbol: "BRCA2", name: "BRCA2 DNA repair associated", loc: "13q13.1", func: "Loads RAD51 onto resected DNA ends during homologous recombination; essential for faithful repair of double-strand breaks." },
  { symbol: "EGFR", name: "Epidermal growth factor receptor", loc: "7p11.2", func: "Receptor tyrosine kinase activating RAS/MAPK and PI3K/AKT growth signaling; commonly amplified or mutated in epithelial tumors." },
  { symbol: "KRAS", name: "KRAS proto-oncogene, GTPase", loc: "12p12.1", func: "Small GTPase relaying signals from receptor tyrosine kinases to downstream proliferation pathways; a frequently mutated oncogene." },
  { symbol: "MYC", name: "MYC proto-oncogene, bHLH TF", loc: "8q24.21", func: "Master transcription factor driving cell growth, proliferation and metabolism; broadly deregulated across cancer types." },
  { symbol: "PTEN", name: "Phosphatase and tensin homolog", loc: "10q23.31", func: "Lipid phosphatase that antagonizes PI3K/AKT signaling; one of the most commonly inactivated tumor suppressors." },
  { symbol: "PIK3CA", name: "PI3K catalytic subunit alpha", loc: "3q26.32", func: "Catalytic subunit of PI3K, generating PIP3 to activate AKT/mTOR signaling for growth and survival." },
];
const GENE_POOL = [...GENES.map(g=>g.symbol),
  "CDKN2A","RB1","APC","VHL","ATM","CHEK2","MDM2","CCND1","ERBB2","MET",
  "STK11","SMAD4","NOTCH1","FBXW7","ARID1A","IDH1","CTNNB1","NRAS","BRAF","AKT1",
  "MLH1","MSH2","PALB2","RAD51","BAP1","NF1","GATA3","FOXA1","CDH1","ESR1"];

function buildExpressionDataset(cancerCode, geneSymbol) {
  const rng = mulberry32(hashSeed(cancerCode + geneSymbol));
  const baseline = 6 + rng() * 3;
  const effect = (rng() - 0.45) * 4; // shift for tumor vs normal
  const nTumor = 24, nNormal = 12;
  const tumor = Array.from({ length: nTumor }, () => Math.max(0, gaussian(rng, baseline + effect, 1.1)));
  const normal = Array.from({ length: nNormal }, () => Math.max(0, gaussian(rng, baseline, 0.7)));
  return { tumor, normal };
}
function statsOf(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const q = (p) => { const idx = (s.length - 1) * p; const lo = Math.floor(idx), hi = Math.ceil(idx); return s[lo] + (s[hi]-s[lo]) * (idx-lo); };
  const mean = s.reduce((a,b)=>a+b,0)/s.length;
  return { min: s[0], max: s[s.length-1], q1: q(0.25), median: q(0.5), q3: q(0.75), mean };
}

function buildDegTable(cancerCode) {
  const rng = mulberry32(hashSeed("deg_" + cancerCode));
  return GENE_POOL.map((sym) => {
    const log2FC = gaussian(rng, 0, 2.1);
    const raw = rng();
    const padj = Math.max(1e-6, Math.pow(raw, 3.2));
    let reg = "Not significant";
    if (Math.abs(log2FC) >= 1 && padj < 0.05) reg = log2FC > 0 ? "Upregulated" : "Downregulated";
    return { gene: sym, log2FC: +log2FC.toFixed(2), pvalue: +(padj * (1.2+rng())).toFixed(6), padj: +padj.toFixed(6), reg };
  }).sort((a,b)=>a.padj-b.padj);
}

const GO_KEGG = [
  { id: "GO:0006281", cat: "GO Biological Process", name: "DNA repair", count: 34 },
  { id: "GO:0007049", cat: "GO Biological Process", name: "Cell cycle", count: 51 },
  { id: "GO:0008283", cat: "GO Biological Process", name: "Cell population proliferation", count: 46 },
  { id: "GO:0006915", cat: "GO Biological Process", name: "Apoptotic process", count: 29 },
  { id: "GO:0004672", cat: "GO Molecular Function", name: "Protein kinase activity", count: 22 },
  { id: "GO:0005515", cat: "GO Molecular Function", name: "Protein binding", count: 88 },
  { id: "GO:0003700", cat: "GO Molecular Function", name: "DNA-binding transcription factor activity", count: 19 },
  { id: "GO:0005634", cat: "GO Cellular Component", name: "Nucleus", count: 63 },
  { id: "GO:0005886", cat: "GO Cellular Component", name: "Plasma membrane", count: 41 },
  { id: "hsa04110", cat: "KEGG Pathway", name: "Cell cycle", count: 27 },
  { id: "hsa04151", cat: "KEGG Pathway", name: "PI3K-Akt signaling pathway", count: 38 },
  { id: "hsa05200", cat: "KEGG Pathway", name: "Pathways in cancer", count: 60 },
  { id: "hsa04010", cat: "KEGG Pathway", name: "MAPK signaling pathway", count: 33 },
];
function buildPathwayEnrichment(cancerCode, geneSymbol) {
  const rng = mulberry32(hashSeed("path_" + cancerCode + geneSymbol));
  return GO_KEGG.map((p) => {
    const negLogP = 0.5 + rng() * 6;
    const genes = Array.from(new Set(Array.from({length: 3+Math.floor(rng()*5)}, () => GENE_POOL[Math.floor(rng()*GENE_POOL.length)])));
    if (!genes.includes(geneSymbol)) genes.unshift(geneSymbol);
    return { ...p, negLogP: +negLogP.toFixed(2), genes };
  }).sort((a,b)=>b.negLogP-a.negLogP);
}

const PPI_FUNCTIONS = ["DNA damage response","Cell cycle control","Transcriptional regulation","Signal transduction","Apoptosis regulation","Chromatin remodeling"];
function buildPPINetwork(geneSymbol) {
  const rng = mulberry32(hashSeed("ppi_" + geneSymbol));
  const n = 10 + Math.floor(rng()*5);
  const partners = Array.from(new Set(Array.from({length:n*2}, ()=>GENE_POOL[Math.floor(rng()*GENE_POOL.length)]))).filter(g=>g!==geneSymbol).slice(0,n);
  const nodes = [{ id: geneSymbol, hub: true, fn: "Hub gene", degree: partners.length }, ...partners.map(p => ({ id: p, hub: false, fn: PPI_FUNCTIONS[Math.floor(rng()*PPI_FUNCTIONS.length)], degree: 1+Math.floor(rng()*4) }))];
  const links = partners.map(p => ({ source: geneSymbol, target: p, weight: +(0.4+rng()*0.6).toFixed(2) }));
  // add a few secondary edges among partners for network richness
  for (let i=0;i<Math.floor(partners.length*0.4);i++){
    const a = partners[Math.floor(rng()*partners.length)], b = partners[Math.floor(rng()*partners.length)];
    if (a!==b) links.push({ source:a, target:b, weight:+(0.3+rng()*0.4).toFixed(2) });
  }
  return { nodes, links };
}

function buildSurvival(cancerCode, geneSymbol) {
  const rng = mulberry32(hashSeed("surv_" + cancerCode + geneSymbol));
  const months = Array.from({length: 21}, (_,i)=>i*3);
  const hi = [1]; const lo = [1];
  const hiDrop = 0.03 + rng()*0.05, loDrop = 0.015 + rng()*0.03;
  for (let i=1;i<months.length;i++){
    hi.push(Math.max(0.02, hi[i-1] * (1 - hiDrop*(0.6+rng()*0.8))));
    lo.push(Math.max(0.05, lo[i-1] * (1 - loDrop*(0.6+rng()*0.8))));
  }
  const pvalue = +(0.001 + rng()*0.08).toFixed(4);
  const data = months.map((m,i)=>({ month: m, high: +hi[i].toFixed(3), low: +lo[i].toFixed(3) }));
  return { data, pvalue, worse: hiDrop > loDrop ? "high" : "low" };
}

/* ============================================================================
   SMALL UI PRIMITIVES
============================================================================ */
function Panel({ t, children, style, className }) {
  return <div className={className} style={{ background: t.panel, border: `1px solid ${t.line}`, borderRadius: 16, ...style }}>{children}</div>;
}
function Badge({ t, color, children }) {
  return <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:0.4, padding:"3px 9px", borderRadius:999, color, background: color+"1A", border:`1px solid ${color}40` }}>{children}</span>;
}
function DemoTag({ t }) {
  return <Badge t={t} color={t.amber}><CircleDot size={10}/> DEMO DATA</Badge>;
}
function SectionTitle({ t, icon: Icon, title, sub }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {Icon && <Icon size={20} color={t.cyan} />}
        <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, fontSize:22, color:t.text, margin:0 }}>{title}</h2>
      </div>
      {sub && <p style={{ color:t.textDim, fontSize:13.5, marginTop:6, maxWidth:640, lineHeight:1.5 }}>{sub}</p>}
    </div>
  );
}
function StatCard({ t, label, value, icon: Icon, accent }) {
  return (
    <Panel t={t} style={{ padding:"18px 20px", flex:1, minWidth:140 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:26, fontWeight:600, color:t.text }}>{value}</div>
          <div style={{ fontSize:12.5, color:t.textDim, marginTop:4 }}>{label}</div>
        </div>
        <Icon size={18} color={accent} />
      </div>
    </Panel>
  );
}
function GhostButton({ t, onClick, children, active, style }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:10, cursor:"pointer",
      fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13.5, fontWeight:500,
      background: active ? t.cyan+"1A" : "transparent", color: active ? t.cyan : t.textDim,
      border: `1px solid ${active ? t.cyan+"55" : "transparent"}`, transition:"all .15s", ...style
    }}>{children}</button>
  );
}
function PrimaryButton({ t, onClick, children, color, style }) {
  const c = color || t.cyan;
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:10, cursor:"pointer",
      fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13.5, fontWeight:600, color: "#08131A",
      background: c, border:"none", boxShadow:`0 4px 20px ${c}33`, ...style
    }}>{children}</button>
  );
}
function OutlineButton({ t, onClick, children, style }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:10, cursor:"pointer",
      fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13.5, fontWeight:600, color:t.text,
      background:"transparent", border:`1px solid ${t.lineStrong}`, ...style
    }}>{children}</button>
  );
}
function Toast({ t, msg, onClose }) {
  useEffect(()=>{ const id=setTimeout(onClose, 2600); return ()=>clearTimeout(id); }, [msg]);
  if (!msg) return null;
  return (
    <div style={{ position:"fixed", bottom:22, right:22, zIndex:200, background:t.panel3, border:`1px solid ${t.lineStrong}`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, color:t.text, fontSize:13, boxShadow:"0 10px 30px rgba(0,0,0,.35)" }}>
      <Check size={15} color={t.green} /> {msg}
    </div>
  );
}
function Skeleton({ t, h=16, w="100%" }) {
  return <div style={{ height:h, width:w, borderRadius:6, background:`linear-gradient(90deg,${t.panel2},${t.panel3},${t.panel2})`, backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }} />;
}
function EmptyState({ t, icon: Icon, text }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 20px", color:t.textFaint }}>
      <Icon size={28} style={{ marginBottom:10, opacity:.6 }} />
      <div style={{ fontSize:13 }}>{text}</div>
    </div>
  );
}
function tooltipStyle(t){ return { background:t.panel3, border:`1px solid ${t.lineStrong}`, borderRadius:10, fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:t.text, padding:"8px 10px" }; }

/* ============================================================================
   HERO — animated chromosome ideogram signature
============================================================================ */
function ChromosomeIdeogram({ t }) {
  const ref = useRef(null);
  const [ticks, setTicks] = useState([]);
  useEffect(() => {
    const rng = mulberry32(7);
    setTicks(Array.from({length:46}, () => ({ x: rng()*100, sig: rng() > 0.82 })));
  }, []);
  return (
    <svg viewBox="0 0 600 90" style={{ width:"100%", height:"auto", overflow:"visible" }}>
      <defs>
        <linearGradient id="beam" x1="0" x2="1">
          <stop offset="0%" stopColor={t.cyan} stopOpacity="0" />
          <stop offset="50%" stopColor={t.cyan} stopOpacity="0.9" />
          <stop offset="100%" stopColor={t.cyan} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="38" width="600" height="14" rx="7" fill={t.panel3} stroke={t.line} />
      {ticks.map((tk,i)=>(
        <rect key={i} x={tk.x*5.9} y={tk.sig?32:36} width={2} height={tk.sig?26:18} rx={1}
          fill={tk.sig ? t.magenta : t.textFaint} opacity={tk.sig?0.95:0.45} />
      ))}
      <rect x="0" y="30" width="70" height="30" fill="url(#beam)">
        <animate attributeName="x" from="-70" to="600" dur="4.5s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

function Hero({ t, onStart, onDemo }) {
  return (
    <div style={{ position:"relative", overflow:"hidden", background:t.gradA, borderBottom:`1px solid ${t.line}` }}>
      <div style={{ position:"absolute", inset:0, opacity:t.mode==="dark"?0.5:0.3, backgroundImage:`radial-gradient(circle at 15% 20%, ${t.cyan}22, transparent 40%), radial-gradient(circle at 85% 15%, ${t.magenta}1c, transparent 45%), radial-gradient(circle at 50% 90%, ${t.violet}18, transparent 40%)` }} />
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"88px 28px 56px", position:"relative" }}>
        <Badge t={t} color={t.cyan}><Dna size={11}/> Computational Cancer Genomics</Badge>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:"clamp(36px,6vw,64px)", color:t.text, margin:"18px 0 6px", letterSpacing:-1 }}>OncoLens</h1>
        <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, fontSize:"clamp(15px,2vw,19px)", color:t.cyan, margin:"0 0 14px" }}>
          Interactive Cancer Genomics &amp; Biomarker Discovery
        </p>
        <p style={{ maxWidth:600, color:t.textDim, fontSize:15, lineHeight:1.6, marginBottom:30 }}>
          Explore cancer-associated gene expression, pathways, molecular interactions and prognostic signals through an interactive bioinformatics workflow.
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:48 }}>
          <PrimaryButton t={t} onClick={onStart}>Start Analysis <ArrowUpRight size={15} /></PrimaryButton>
          <OutlineButton t={t} onClick={onDemo}>Explore Demo Dataset <FlaskConical size={15} /></OutlineButton>
        </div>
        <Panel t={t} style={{ padding:"18px 20px 22px", background:t.glass, backdropFilter:"blur(14px)" }}>
          <div style={{ fontSize:11, color:t.textFaint, fontFamily:"'IBM Plex Mono',monospace", marginBottom:10, letterSpacing:0.5 }}>LOCUS SCAN — CHR17 · DEMO TRACK</div>
          <ChromosomeIdeogram t={t} />
        </Panel>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginTop:28 }}>
          <StatCard t={t} label="Cancer Types" value="5" icon={Microscope} accent={t.cyan} />
          <StatCard t={t} label="Curated Genes" value="38" icon={Dna} accent={t.magenta} />
          <StatCard t={t} label="Pathway Terms" value="13" icon={GitBranch} accent={t.violet} />
          <StatCard t={t} label="Public Data Sources" value="8" icon={Database} accent={t.amber} />
        </div>
        <div style={{ marginTop:10, fontSize:11.5, color:t.textFaint }}>Stats reflect the demo dataset bundled with this build — not live registry totals.</div>
      </div>
    </div>
  );
}

/* ============================================================================
   OVERVIEW PAGE
============================================================================ */
function WorkflowDiagram({ t }) {
  const steps = ["Raw Data","QC","Normalization","Diff. Expression","Pathway Analysis","PPI","Survival","Biomarker"];
  return (
    <div style={{ display:"flex", alignItems:"center", overflowX:"auto", padding:"6px 2px 14px", gap:0 }}>
      {steps.map((s,i)=>(
        <React.Fragment key={s}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:104 }}>
            <div style={{ width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center",
              background: t.panel3, border:`1px solid ${t.lineStrong}`, color:t.cyan, fontFamily:"'IBM Plex Mono',monospace", fontWeight:600 }}>
              {String(i+1).padStart(2,"0")}
            </div>
            <div style={{ fontSize:11.5, color:t.textDim, marginTop:8, textAlign:"center", maxWidth:98 }}>{s}</div>
          </div>
          {i<steps.length-1 && <ChevronRight size={16} color={t.textFaint} style={{ flexShrink:0, margin:"0 2px 26px" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}
function CentralDogmaFlow({ t }) {
  const items = [
    {l:"Cancer", i: Microscope, c:t.red}, {l:"DNA", i: Dna, c:t.cyan}, {l:"RNA", i: Activity, c:t.violet},
    {l:"Protein", i: Layers, c:t.magenta}, {l:"Pathway", i: GitBranch, c:t.amber}, {l:"Phenotype", i: TrendingUp, c:t.green},
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:8 }}>
      {items.map((it,i)=>(
        <React.Fragment key={it.l}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", borderRadius:999, background:it.c+"14", border:`1px solid ${it.c}40` }}>
            <it.i size={14} color={it.c} /><span style={{ fontSize:12.5, color:t.text, fontFamily:"'IBM Plex Mono',monospace" }}>{it.l}</span>
          </div>
          {i<items.length-1 && <ChevronRight size={14} color={t.textFaint} />}
        </React.Fragment>
      ))}
    </div>
  );
}
function OverviewPage({ t, nav }) {
  return (
    <div>
      <SectionTitle t={t} icon={Activity} title="Overview" sub="OncoLens walks a single gene or cancer cohort through the full in-silico biomarker discovery pipeline, end to end." />
      <Panel t={t} style={{ padding:24, marginBottom:20 }}>
        <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:6, fontFamily:"'IBM Plex Mono',monospace" }}>ANALYSIS PIPELINE</div>
        <WorkflowDiagram t={t} />
      </Panel>
      <Panel t={t} style={{ padding:24, marginBottom:20 }}>
        <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:14, fontFamily:"'IBM Plex Mono',monospace" }}>CENTRAL DOGMA → CLINICAL PHENOTYPE</div>
        <CentralDogmaFlow t={t} />
      </Panel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
        {[
          { k:"explorer", i:Microscope, title:"Cancer Explorer", d:"Browse TCGA-style cohorts by tissue and sample composition." },
          { k:"expression", i:Dna, title:"Gene Expression", d:"Search a gene, compare tumor vs normal expression." },
          { k:"deg", i:Activity, title:"Differential Expression", d:"Volcano, heatmap and PCA views with adjustable thresholds." },
          { k:"pathways", i:GitBranch, title:"Pathway Analysis", d:"GO and KEGG enrichment for the selected gene." },
          { k:"ppi", i:Network, title:"PPI Network", d:"Interactive protein interaction graph around the hub gene." },
          { k:"survival", i:TrendingUp, title:"Survival Analysis", d:"Kaplan–Meier comparison of high vs low expression." },
        ].map(c=>(
          <Panel key={c.k} t={t} style={{ padding:18, cursor:"pointer" }} onClick={()=>nav(c.k)}>
            <c.i size={18} color={t.cyan} />
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, color:t.text, marginTop:10, fontSize:14.5 }}>{c.title}</div>
            <div style={{ color:t.textDim, fontSize:12.5, marginTop:5, lineHeight:1.5 }}>{c.d}</div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   CANCER EXPLORER
============================================================================ */
function CancerExplorer({ t, cancer, setCancer }) {
  const c = CANCER_TYPES.find(x=>x.code===cancer);
  return (
    <div>
      <SectionTitle t={t} icon={Microscope} title="Cancer Explorer" sub="Select a cancer cohort to scope the rest of the analysis workflow." />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:24 }}>
        {CANCER_TYPES.map(ct=>(
          <Panel key={ct.code} t={t} onClick={()=>setCancer(ct.code)} style={{
            padding:16, cursor:"pointer", borderColor: cancer===ct.code ? t.cyan+"80" : t.line,
            background: cancer===ct.code ? t.cyan+"0F" : t.panel }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontWeight:600, color: cancer===ct.code ? t.cyan : t.text, fontSize:15 }}>{ct.code}</div>
            <div style={{ fontSize:12, color:t.textDim, marginTop:4, lineHeight:1.4 }}>{ct.name}</div>
          </Panel>
        ))}
      </div>
      {c && (
        <Panel t={t} style={{ padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:20, color:t.text }}>{c.code} — {c.name}</div>
              <div style={{ color:t.textDim, fontSize:13.5, marginTop:8, maxWidth:600, lineHeight:1.6 }}>{c.desc}</div>
            </div>
            <DemoTag t={t} />
          </div>
          <div style={{ display:"flex", gap:14, marginTop:20, flexWrap:"wrap" }}>
            <StatCard t={t} label="Tissue of Origin" value={c.tissue.split(" ")[0]} icon={Layers} accent={t.violet} />
            <StatCard t={t} label="Tumor Samples" value={c.samples} icon={Database} accent={t.cyan} />
            <StatCard t={t} label="Normal Samples" value={c.normal} icon={Database} accent={t.green} />
          </div>
          <div style={{ marginTop:16, fontSize:12.5, color:t.textFaint }}>Sample counts reflect representative TCGA project scale for {c.code}; underlying records used here are locally bundled demo values, not a live GDC query.</div>
        </Panel>
      )}
    </div>
  );
}

/* ============================================================================
   GENE SEARCH (shared) + GENE EXPRESSION PAGE
============================================================================ */
function GeneSearch({ t, gene, setGene }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const matches = q.length===0 ? [] : GENES.filter(g=>g.symbol.toLowerCase().includes(q.toLowerCase()) || g.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ position:"relative", maxWidth:420 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, background:t.panel2, border:`1px solid ${t.lineStrong}`, borderRadius:10, padding:"9px 12px" }}>
        <Search size={15} color={t.textFaint} />
        <input value={q} onChange={e=>{setQ(e.target.value); setOpen(true);}} onFocus={()=>setOpen(true)}
          placeholder="Search gene symbol e.g. TP53"
          style={{ background:"transparent", border:"none", outline:"none", color:t.text, fontFamily:"'IBM Plex Mono',monospace", fontSize:13.5, width:"100%" }} />
        {q && <X size={14} color={t.textFaint} style={{cursor:"pointer"}} onClick={()=>{setQ("");setOpen(false);}} />}
      </div>
      {open && matches.length>0 && (
        <div style={{ position:"absolute", top:"110%", left:0, right:0, background:t.panel3, border:`1px solid ${t.lineStrong}`, borderRadius:10, overflow:"hidden", zIndex:20, boxShadow:"0 12px 30px rgba(0,0,0,.3)" }}>
          {matches.map(g=>(
            <div key={g.symbol} onClick={()=>{setGene(g.symbol); setQ(""); setOpen(false);}}
              style={{ padding:"10px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background=t.panel2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", color:t.cyan, fontSize:13 }}>{g.symbol}</div>
                <div style={{ fontSize:11.5, color:t.textDim }}>{g.name}</div>
              </div>
              <ChevronRight size={14} color={t.textFaint} />
            </div>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
        {GENES.map(g=>(
          <button key={g.symbol} onClick={()=>setGene(g.symbol)} style={{
            fontFamily:"'IBM Plex Mono',monospace", fontSize:11.5, padding:"5px 10px", borderRadius:8, cursor:"pointer",
            background: gene===g.symbol ? t.cyan+"1F" : t.panel2, color: gene===g.symbol ? t.cyan : t.textDim,
            border:`1px solid ${gene===g.symbol ? t.cyan+"55" : t.line}` }}>{g.symbol}</button>
        ))}
      </div>
    </div>
  );
}

function BoxPlotSVG({ t, tumorStats, normalStats, tumorPts, normalPts, width=520, height=260 }) {
  const allVals = [...tumorPts, ...normalPts];
  const min = Math.min(...allVals)*0.9, max = Math.max(...allVals)*1.1;
  const y = (v) => height-34 - ((v-min)/(max-min))*(height-70);
  const groups = [
    { label:"Tumor", stats:tumorStats, pts:tumorPts, x:width*0.3, color:t.magenta },
    { label:"Normal", stats:normalStats, pts:normalPts, x:width*0.7, color:t.blue },
  ];
  const rng = mulberry32(3);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      {[0,0.25,0.5,0.75,1].map(f=>(
        <line key={f} x1={40} x2={width-20} y1={34+f*(height-70)} y2={34+f*(height-70)} stroke={t.line} />
      ))}
      {groups.map(g=>{
        const boxW=64;
        return (
          <g key={g.label}>
            <line x1={g.x} x2={g.x} y1={y(g.stats.min)} y2={y(g.stats.max)} stroke={g.color} strokeWidth={1.5} opacity={0.6}/>
            <rect x={g.x-boxW/2} y={y(g.stats.q3)} width={boxW} height={Math.max(2,y(g.stats.q1)-y(g.stats.q3))} fill={g.color+"22"} stroke={g.color} strokeWidth={1.5} rx={4} />
            <line x1={g.x-boxW/2} x2={g.x+boxW/2} y1={y(g.stats.median)} y2={y(g.stats.median)} stroke={g.color} strokeWidth={2.2} />
            {g.pts.map((p,i)=>(
              <circle key={i} cx={g.x + (rng()-0.5)*boxW*0.7} cy={y(p)} r={2.4} fill={g.color} opacity={0.55} />
            ))}
            <text x={g.x} y={height-10} textAnchor="middle" fill={t.textDim} fontSize={12} fontFamily="IBM Plex Sans">{g.label}</text>
          </g>
        );
      })}
      <text x={10} y={20} fill={t.textFaint} fontSize={10} fontFamily="IBM Plex Mono">log2(TPM+1)</text>
    </svg>
  );
}

function GeneExpressionPage({ t, gene, setGene, cancer, toast }) {
  const [dataset, setDataset] = useState("RNA-seq (TCGA-style)");
  const g = GENES.find(x=>x.symbol===gene);
  const { tumor, normal } = useMemo(()=>buildExpressionDataset(cancer, gene), [cancer, gene]);
  const tStats = statsOf(tumor), nStats = statsOf(normal);
  const barData = [{name:"Tumor", value:+tStats.mean.toFixed(2), fill:t.magenta},{name:"Normal", value:+nStats.mean.toFixed(2), fill:t.blue}];

  function downloadCSV(){
    const rows = [["sample_group","expression_log2_tpm"], ...tumor.map(v=>["Tumor",v.toFixed(3)]), ...normal.map(v=>["Normal",v.toFixed(3)])];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${gene}_${cancer}_expression.csv`; a.click();
    toast(`Downloaded ${gene} expression data`);
  }

  return (
    <div>
      <SectionTitle t={t} icon={Dna} title="Gene Expression" sub="Search a gene and compare tumor vs normal expression for the selected cancer cohort." />
      <GeneSearch t={t} gene={gene} setGene={setGene} />
      {!g ? <EmptyState t={t} icon={Search} text="No data available — search or select a gene above." /> : (
        <div style={{ marginTop:24 }}>
          <Panel t={t} style={{ padding:22, marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontWeight:700, fontSize:22, color:t.cyan }}>{g.symbol}</div>
                <div style={{ color:t.text, fontSize:14, marginTop:2 }}>{g.name}</div>
              </div>
              <DemoTag t={t}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginTop:16 }}>
              <div><div style={{fontSize:11,color:t.textFaint}}>CHROMOSOMAL LOCATION</div><div style={{fontFamily:"'IBM Plex Mono',monospace",color:t.text,fontSize:13,marginTop:3}}>{g.loc}</div></div>
              <div><div style={{fontSize:11,color:t.textFaint}}>CANCER ASSOCIATION</div><div style={{fontFamily:"'IBM Plex Mono',monospace",color:t.text,fontSize:13,marginTop:3}}>{cancer}</div></div>
              <div><div style={{fontSize:11,color:t.textFaint}}>MEAN Δ (TUMOR−NORMAL)</div><div style={{fontFamily:"'IBM Plex Mono',monospace",color: tStats.mean>nStats.mean?t.magenta:t.blue,fontSize:13,marginTop:3}}>{(tStats.mean-nStats.mean).toFixed(2)} log2</div></div>
            </div>
            <p style={{ color:t.textDim, fontSize:13, lineHeight:1.6, marginTop:14 }}>{g.func}</p>
          </Panel>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:12 }}>
            <div style={{ display:"flex", gap:8 }}>
              {["RNA-seq (TCGA-style)","Microarray (demo)"].map(d=>(
                <GhostButton key={d} t={t} active={dataset===d} onClick={()=>setDataset(d)}>{d}</GhostButton>
              ))}
            </div>
            <OutlineButton t={t} onClick={downloadCSV}><Download size={14}/> Download data</OutlineButton>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:16 }}>
            <Panel t={t} style={{ padding:20 }}>
              <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:8, fontFamily:"'IBM Plex Mono',monospace" }}>EXPRESSION BOX PLOT · TUMOR VS NORMAL</div>
              <BoxPlotSVG t={t} tumorStats={tStats} normalStats={nStats} tumorPts={tumor} normalPts={normal} />
            </Panel>
            <Panel t={t} style={{ padding:20 }}>
              <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:8, fontFamily:"'IBM Plex Mono',monospace" }}>MEAN EXPRESSION</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <CartesianGrid stroke={t.line} vertical={false} />
                  <XAxis dataKey="name" tick={{fill:t.textDim, fontSize:12}} axisLine={{stroke:t.line}} tickLine={false} />
                  <YAxis tick={{fill:t.textDim, fontSize:11}} axisLine={{stroke:t.line}} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle(t)} cursor={{fill:t.panel2}} />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {barData.map((b,i)=><Cell key={i} fill={b.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   DIFFERENTIAL EXPRESSION
============================================================================ */
function DataTable({ t, rows, columns, pageSize=8 }) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(columns[0].key);
  const [sortDir, setSortDir] = useState(1);
  const [filter, setFilter] = useState("");
  const filtered = rows.filter(r => String(r[columns[0].key]).toLowerCase().includes(filter.toLowerCase()));
  const sorted = [...filtered].sort((a,b)=> (a[sortKey]>b[sortKey]?1:-1)*sortDir);
  const totalPages = Math.max(1, Math.ceil(sorted.length/pageSize));
  const view = sorted.slice(page*pageSize, page*pageSize+pageSize);
  function exportCSV(){
    const csv = [columns.map(c=>c.key).join(","), ...sorted.map(r=>columns.map(c=>r[c.key]).join(","))].join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download="oncolens_deg_table.csv"; a.click();
  }
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:10 }}>
        <input value={filter} onChange={e=>{setFilter(e.target.value); setPage(0);}} placeholder="Filter by gene symbol…"
          style={{ background:t.panel2, border:`1px solid ${t.lineStrong}`, borderRadius:8, padding:"7px 11px", color:t.text, fontFamily:"'IBM Plex Mono',monospace", fontSize:12.5, outline:"none" }} />
        <OutlineButton t={t} onClick={exportCSV} style={{padding:"7px 12px", fontSize:12.5}}><Download size={13}/> Export CSV</OutlineButton>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr>
              {columns.map(c=>(
                <th key={c.key} onClick={()=>{ setSortKey(c.key); setSortDir(sortKey===c.key?-sortDir:1); }}
                  style={{ textAlign:"left", padding:"8px 10px", color:t.textFaint, fontFamily:"'IBM Plex Mono',monospace", fontWeight:500, cursor:"pointer", borderBottom:`1px solid ${t.lineStrong}`, whiteSpace:"nowrap" }}>
                  {c.label} {sortKey===c.key ? (sortDir===1?"↑":"↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${t.line}` }}>
                {columns.map(c=>(
                  <td key={c.key} style={{ padding:"8px 10px", color: c.key==="gene"?t.cyan:t.text, fontFamily:"'IBM Plex Mono',monospace" }}>
                    {c.render ? c.render(r[c.key], r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
        <span style={{ fontSize:11.5, color:t.textFaint }}>{sorted.length} genes</span>
        <div style={{ display:"flex", gap:6 }}>
          <GhostButton t={t} onClick={()=>setPage(Math.max(0,page-1))}>Prev</GhostButton>
          <span style={{ fontSize:12, color:t.textDim, padding:"6px 4px" }}>{page+1}/{totalPages}</span>
          <GhostButton t={t} onClick={()=>setPage(Math.min(totalPages-1,page+1))}>Next</GhostButton>
        </div>
      </div>
    </div>
  );
}

function DifferentialExpressionPage({ t, cancer, gene }) {
  const [lfcThresh, setLfcThresh] = useState(1);
  const [padjThresh, setPadjThresh] = useState(0.05);
  const [topN, setTopN] = useState(20);
  const raw = useMemo(()=>buildDegTable(cancer), [cancer]);
  const deg = useMemo(()=>raw.map(r=>{
    let reg = "Not significant";
    if (Math.abs(r.log2FC) >= lfcThresh && r.padj < padjThresh) reg = r.log2FC>0 ? "Upregulated" : "Downregulated";
    return { ...r, reg };
  }), [raw, lfcThresh, padjThresh]);
  const up = deg.filter(d=>d.reg==="Upregulated").length;
  const down = deg.filter(d=>d.reg==="Downregulated").length;
  const top = [...deg].sort((a,b)=>a.padj-b.padj).slice(0, topN);

  const volcanoGroups = ["Upregulated","Downregulated","Not significant"].map(reg=>({
    reg, color: reg==="Upregulated"?t.magenta:reg==="Downregulated"?t.blue:t.textFaint,
    data: deg.filter(d=>d.reg===reg).map(d=>({ x:d.log2FC, y:+(-Math.log10(d.padj)).toFixed(2), gene:d.gene, padj:d.padj }))
  }));

  const pcaRng = mulberry32(hashSeed("pca"+cancer));
  const pcaData = Array.from({length:20}, (_,i)=>{
    const tumor = i<12;
    return { x: gaussian(pcaRng, tumor?2.2:-2.2, 1.4), y: gaussian(pcaRng, 0, 1.6), group: tumor?"Tumor":"Normal" };
  });

  const heatGenes = top.slice(0,12);
  const samples = ["T1","T2","T3","T4","N1","N2","N3","N4"];
  const heatRng = mulberry32(hashSeed("heat"+cancer));
  function heatColor(v){
    const c = v>0 ? t.magenta : t.blue;
    const alpha = Math.min(0.9, Math.abs(v)/3);
    return c + Math.round(alpha*255).toString(16).padStart(2,"0");
  }

  return (
    <div>
      <SectionTitle t={t} icon={Activity} title="Differential Gene Expression" sub={`Tumor vs normal DEG analysis for ${cancer}. Adjust thresholds to explore significance.`} />
      <Panel t={t} style={{ padding:20, marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <Sliders size={15} color={t.cyan} /><span style={{ fontSize:12.5, color:t.textFaint, fontFamily:"'IBM Plex Mono',monospace" }}>THRESHOLD CONTROLS</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20 }}>
          <div>
            <div style={{ fontSize:12, color:t.textDim, marginBottom:6 }}>|log2 Fold Change| ≥ <b style={{color:t.text}}>{lfcThresh.toFixed(1)}</b></div>
            <input type="range" min="0" max="3" step="0.1" value={lfcThresh} onChange={e=>setLfcThresh(+e.target.value)} style={{ width:"100%", accentColor:t.cyan }} />
          </div>
          <div>
            <div style={{ fontSize:12, color:t.textDim, marginBottom:6 }}>Adjusted p-value &lt; <b style={{color:t.text}}>{padjThresh}</b></div>
            <input type="range" min="0.001" max="0.1" step="0.001" value={padjThresh} onChange={e=>setPadjThresh(+e.target.value)} style={{ width:"100%", accentColor:t.cyan }} />
          </div>
          <div>
            <div style={{ fontSize:12, color:t.textDim, marginBottom:6 }}>Top N genes (heatmap) = <b style={{color:t.text}}>{topN}</b></div>
            <input type="range" min="6" max="30" step="1" value={topN} onChange={e=>setTopN(+e.target.value)} style={{ width:"100%", accentColor:t.cyan }} />
          </div>
        </div>
        <div style={{ fontSize:11.5, color:t.textFaint, marginTop:12 }}>Defaults (|log2FC| ≥ 1, padj &lt; 0.05) follow common RNA-seq DEG conventions balancing sensitivity and false-discovery control.</div>
      </Panel>

      <div style={{ display:"flex", gap:14, marginBottom:18, flexWrap:"wrap" }}>
        <StatCard t={t} label="Upregulated" value={up} icon={ArrowUpRight} accent={t.magenta} />
        <StatCard t={t} label="Downregulated" value={down} icon={ArrowDownRight} accent={t.blue} />
        <StatCard t={t} label="Not Significant" value={deg.length-up-down} icon={Minus} accent={t.textFaint} />
      </div>

      <Panel t={t} style={{ padding:20, marginBottom:18 }}>
        <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:8, fontFamily:"'IBM Plex Mono',monospace" }}>VOLCANO PLOT</div>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{top:10,right:20,bottom:10,left:0}}>
            <CartesianGrid stroke={t.line} />
            <XAxis type="number" dataKey="x" name="log2FC" tick={{fill:t.textDim,fontSize:11}} axisLine={{stroke:t.line}} label={{ value:"log2 Fold Change", position:"insideBottom", offset:-5, fill:t.textFaint, fontSize:11 }} />
            <YAxis type="number" dataKey="y" name="-log10(padj)" tick={{fill:t.textDim,fontSize:11}} axisLine={{stroke:t.line}} label={{ value:"-log10(padj)", angle:-90, position:"insideLeft", fill:t.textFaint, fontSize:11 }} />
            <ZAxis range={[26,26]} />
            <Tooltip contentStyle={tooltipStyle(t)} cursor={{ strokeDasharray:"3 3" }} formatter={(v,n,p)=>[v, n]} labelFormatter={()=>""} content={({active,payload})=>{
              if(!active||!payload||!payload.length) return null;
              const d = payload[0].payload;
              return <div style={tooltipStyle(t)}><b>{d.gene}</b><br/>log2FC: {d.x}<br/>padj: {d.padj}</div>;
            }} />
            <ReferenceLine x={lfcThresh} stroke={t.textFaint} strokeDasharray="4 4" />
            <ReferenceLine x={-lfcThresh} stroke={t.textFaint} strokeDasharray="4 4" />
            <ReferenceLine y={-Math.log10(padjThresh)} stroke={t.textFaint} strokeDasharray="4 4" />
            {volcanoGroups.map(g=>(
              <Scatter key={g.reg} name={g.reg} data={g.data} fill={g.color} fillOpacity={0.75} />
            ))}
            <Legend wrapperStyle={{ fontSize:12, color:t.textDim }} />
          </ScatterChart>
        </ResponsiveContainer>
      </Panel>

      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16, marginBottom:18 }}>
        <Panel t={t} style={{ padding:20, overflowX:"auto" }}>
          <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:10, fontFamily:"'IBM Plex Mono',monospace" }}>HEATMAP · TOP {heatGenes.length} SIGNIFICANT GENES</div>
          <table style={{ borderCollapse:"collapse", fontSize:11 }}>
            <thead><tr><th></th>{samples.map(s=><th key={s} style={{ padding:4, color:t.textFaint, fontFamily:"'IBM Plex Mono',monospace", fontWeight:500 }}>{s}</th>)}</tr></thead>
            <tbody>
              {heatGenes.map(g=>(
                <tr key={g.gene}>
                  <td style={{ padding:"3px 8px 3px 0", color:t.cyan, fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"nowrap" }}>{g.gene}</td>
                  {samples.map((s,i)=>{
                    const v = g.log2FC * (0.6+heatRng()*0.8) * (s[0]==="N" ? -0.4 : 1);
                    return <td key={s} style={{ width:28, height:22, background:heatColor(v), border:`1px solid ${t.void}` }} title={`${g.gene} · ${s}: ${v.toFixed(2)}`} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel t={t} style={{ padding:20 }}>
          <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:8, fontFamily:"'IBM Plex Mono',monospace" }}>PCA · SAMPLE CLUSTERING</div>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid stroke={t.line} />
              <XAxis type="number" dataKey="x" name="PC1" tick={{fill:t.textDim,fontSize:11}} axisLine={{stroke:t.line}} />
              <YAxis type="number" dataKey="y" name="PC2" tick={{fill:t.textDim,fontSize:11}} axisLine={{stroke:t.line}} />
              <Tooltip contentStyle={tooltipStyle(t)} />
              <Scatter name="Tumor" data={pcaData.filter(d=>d.group==="Tumor")} fill={t.magenta} />
              <Scatter name="Normal" data={pcaData.filter(d=>d.group==="Normal")} fill={t.blue} />
              <Legend wrapperStyle={{ fontSize:12, color:t.textDim }} />
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel t={t} style={{ padding:20 }}>
        <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:10, fontFamily:"'IBM Plex Mono',monospace" }}>DEG TABLE</div>
        <DataTable t={t} rows={deg} columns={[
          { key:"gene", label:"Gene" },
          { key:"log2FC", label:"log2FC" },
          { key:"pvalue", label:"p-value" },
          { key:"padj", label:"padj" },
          { key:"reg", label:"Regulation", render:(v)=>(
            <span style={{ color: v==="Upregulated"?t.magenta:v==="Downregulated"?t.blue:t.textFaint }}>{v}</span>
          )},
        ]} />
      </Panel>
    </div>
  );
}

/* ============================================================================
   PATHWAYS
============================================================================ */
function PathwaysPage({ t, cancer, gene }) {
  const [catFilter, setCatFilter] = useState("All");
  const data = useMemo(()=>buildPathwayEnrichment(cancer, gene), [cancer, gene]);
  const cats = ["All", ...Array.from(new Set(GO_KEGG.map(g=>g.cat)))];
  const filtered = catFilter==="All" ? data : data.filter(d=>d.cat===catFilter);
  const catColor = (c) => c.includes("Biological")?t.cyan : c.includes("Molecular")?t.magenta : c.includes("Cellular")?t.violet : t.amber;

  return (
    <div>
      <SectionTitle t={t} icon={GitBranch} title="Pathway Analysis" sub={`GO and KEGG enrichment associated with ${gene} in ${cancer}.`} />
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        {cats.map(c=><GhostButton key={c} t={t} active={catFilter===c} onClick={()=>setCatFilter(c)}>{c}</GhostButton>)}
      </div>
      <Panel t={t} style={{ padding:20, marginBottom:18 }}>
        <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:8, fontFamily:"'IBM Plex Mono',monospace" }}>ENRICHMENT BUBBLE PLOT</div>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{top:10,right:20,bottom:20,left:0}}>
            <CartesianGrid stroke={t.line} />
            <XAxis type="number" dataKey="negLogP" name="-log10(p)" tick={{fill:t.textDim,fontSize:11}} axisLine={{stroke:t.line}} label={{ value:"-log10(p-value)", position:"insideBottom", offset:-8, fill:t.textFaint, fontSize:11 }} />
            <YAxis type="number" dataKey="count" name="Gene count" tick={{fill:t.textDim,fontSize:11}} axisLine={{stroke:t.line}} />
            <ZAxis type="number" dataKey="count" range={[60,400]} />
            <Tooltip contentStyle={tooltipStyle(t)} content={({active,payload})=>{
              if(!active||!payload||!payload.length) return null;
              const d = payload[0].payload;
              return <div style={tooltipStyle(t)}><b>{d.name}</b><br/>{d.id}<br/>genes: {d.count} · -log10(p): {d.negLogP}</div>;
            }} />
            {cats.filter(c=>c!=="All").map(c=>(
              <Scatter key={c} name={c} data={filtered.filter(d=>d.cat===c)} fill={catColor(c)} fillOpacity={0.7} />
            ))}
            <Legend wrapperStyle={{ fontSize:11, color:t.textDim }} />
          </ScatterChart>
        </ResponsiveContainer>
      </Panel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
        {filtered.map(p=>(
          <Panel key={p.id} t={t} style={{ padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <Badge t={t} color={catColor(p.cat)}>{p.cat.replace("GO ","")}</Badge>
              <span style={{ fontSize:11, color:t.textFaint, fontFamily:"'IBM Plex Mono',monospace" }}>{p.id}</span>
            </div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, color:t.text, fontSize:14.5, marginTop:10 }}>{p.name}</div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:12, color:t.textDim }}>
              <span>{p.count} genes</span><span>-log10(p) {p.negLogP}</span>
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10 }}>
              {p.genes.slice(0,5).map(g=><span key={g} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10.5, padding:"2px 7px", borderRadius:6, background:t.panel2, color: g===gene?t.cyan:t.textDim, border:g===gene?`1px solid ${t.cyan}55`:"none" }}>{g}</span>)}
            </div>
          </Panel>
        ))}
      </div>
      <div style={{ marginTop:16, fontSize:12, color:t.textFaint, display:"flex", gap:14, flexWrap:"wrap" }}>
        <a href="https://www.genome.jp/kegg/" target="_blank" rel="noreferrer" style={{ color:t.cyan, display:"flex", alignItems:"center", gap:4, textDecoration:"none" }}>KEGG <ExternalLink size={11}/></a>
        <a href="https://geneontology.org/" target="_blank" rel="noreferrer" style={{ color:t.cyan, display:"flex", alignItems:"center", gap:4, textDecoration:"none" }}>Gene Ontology <ExternalLink size={11}/></a>
      </div>
    </div>
  );
}

/* ============================================================================
   PPI NETWORK (d3-force)
============================================================================ */
function PPINetworkGraph({ t, network, highlight }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 600;
    const height = 420;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    const g = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.4, 3]).on("zoom", (ev) => g.attr("transform", ev.transform)));

    const nodes = network.nodes.map(d => ({ ...d }));
    const links = network.links.map(d => ({ ...d }));

    const color = (d) => d.hub ? t.magenta : {
      "DNA damage response": t.cyan, "Cell cycle control": t.violet, "Transcriptional regulation": t.amber,
      "Signal transduction": t.blue, "Apoptosis regulation": t.red, "Chromatin remodeling": t.green,
    }[d.fn] || t.textDim;

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(70).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width/2, height/2))
      .force("collide", d3.forceCollide().radius(d => d.hub ? 30 : 20));

    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", t.lineStrong).attr("stroke-width", d => 1 + d.weight*2);

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .style("cursor", "grab")
      .call(d3.drag()
        .on("start", (ev,d)=>{ if(!ev.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on("drag", (ev,d)=>{ d.fx=ev.x; d.fy=ev.y; })
        .on("end", (ev,d)=>{ if(!ev.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }));

    node.append("circle")
      .attr("r", d => d.hub ? 22 : 12 + d.degree*0.8)
      .attr("fill", d => color(d)+"33")
      .attr("stroke", d => color(d))
      .attr("stroke-width", d => highlight===d.id ? 3 : 1.6);

    node.append("text").text(d=>d.id)
      .attr("text-anchor","middle").attr("dy", d=>d.hub?-28:-16)
      .attr("fill", t.text).attr("font-size", d=>d.hub?12:10)
      .attr("font-family","IBM Plex Mono").style("pointer-events","none");

    node.append("title").text(d => `${d.id} — ${d.fn}`);

    sim.on("tick", () => {
      link.attr("x1", d=>d.source.x).attr("y1", d=>d.source.y).attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
      node.attr("transform", d=>`translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [network, t, highlight]);

  return <div ref={containerRef} style={{ width:"100%" }}><svg ref={svgRef} style={{ width:"100%", height:420 }} /></div>;
}

function PPIPage({ t, gene }) {
  const [search, setSearch] = useState("");
  const network = useMemo(()=>buildPPINetwork(gene), [gene]);
  const highlight = network.nodes.find(n=>n.id.toLowerCase()===search.toLowerCase())?.id;
  const legend = [["Hub gene",t.magenta],["DNA damage response",t.cyan],["Cell cycle control",t.violet],["Transcriptional regulation",t.amber],["Signal transduction",t.blue],["Apoptosis regulation",t.red],["Chromatin remodeling",t.green]];
  return (
    <div>
      <SectionTitle t={t} icon={Network} title="Protein–Protein Interaction Network" sub={`Interaction neighborhood around ${gene}. Drag nodes, scroll to zoom, pan to explore.`} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:12 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search node…"
          style={{ background:t.panel2, border:`1px solid ${t.lineStrong}`, borderRadius:8, padding:"8px 12px", color:t.text, fontFamily:"'IBM Plex Mono',monospace", fontSize:12.5, outline:"none", width:220 }} />
        <DemoTag t={t} />
      </div>
      <Panel t={t} style={{ padding:14 }}>
        <PPINetworkGraph t={t} network={network} highlight={highlight} />
      </Panel>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:14 }}>
        {legend.map(([l,c])=>(
          <div key={l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:t.textDim }}>
            <span style={{ width:9, height:9, borderRadius:99, background:c }} /> {l}
          </div>
        ))}
      </div>
      <div style={{ marginTop:14, fontSize:12, color:t.textFaint }}>Network topology and functional labels are locally generated for demonstration. A production build would query STRING-DB's public API for validated interactions.</div>
    </div>
  );
}

/* ============================================================================
   SURVIVAL ANALYSIS
============================================================================ */
function SurvivalPage({ t, cancer, gene }) {
  const { data, pvalue, worse } = useMemo(()=>buildSurvival(cancer, gene), [cancer, gene]);
  const significant = pvalue < 0.05;
  return (
    <div>
      <SectionTitle t={t} icon={TrendingUp} title="Survival / Prognostic Analysis" sub={`Kaplan–Meier comparison of ${gene}-high vs ${gene}-low expression groups in ${cancer}.`} />
      <Panel t={t} style={{ padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontSize:12.5, color:t.textFaint, fontFamily:"'IBM Plex Mono',monospace" }}>KAPLAN–MEIER CURVE</div>
          <DemoTag t={t} />
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{top:10,right:20,bottom:20,left:0}}>
            <CartesianGrid stroke={t.line} />
            <XAxis dataKey="month" tick={{fill:t.textDim,fontSize:11}} axisLine={{stroke:t.line}} label={{ value:"Time (months)", position:"insideBottom", offset:-8, fill:t.textFaint, fontSize:11 }} />
            <YAxis domain={[0,1]} tick={{fill:t.textDim,fontSize:11}} axisLine={{stroke:t.line}} label={{ value:"Survival probability", angle:-90, position:"insideLeft", fill:t.textFaint, fontSize:11 }} />
            <Tooltip contentStyle={tooltipStyle(t)} />
            <Legend wrapperStyle={{ fontSize:12, color:t.textDim }} />
            <Line type="stepAfter" dataKey="high" name={`${gene}-High`} stroke={t.magenta} strokeWidth={2.4} dot={false} />
            <Line type="stepAfter" dataKey="low" name={`${gene}-Low`} stroke={t.blue} strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
        <StatCard t={t} label="Log-rank p-value" value={pvalue} icon={Activity} accent={significant?t.green:t.textFaint} />
        <StatCard t={t} label="Statistical significance" value={significant?"p < 0.05":"n.s."} icon={significant?Check:Minus} accent={significant?t.green:t.amber} />
        <StatCard t={t} label={`Worse prognosis group`} value={`${gene}-${worse==="high"?"High":"Low"}`} icon={AlertTriangle} accent={t.red} />
      </div>
      <Panel t={t} style={{ padding:18, marginTop:16 }}>
        <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:6, fontFamily:"'IBM Plex Mono',monospace" }}>RISK INTERPRETATION</div>
        <p style={{ color:t.textDim, fontSize:13, lineHeight:1.6 }}>
          In this demo cohort, patients with {worse==="high"?"higher":"lower"} {gene} expression show a steeper decline in survival probability over the observed follow-up window
          {significant ? ", and the separation between curves is statistically significant at the conventional p < 0.05 threshold." : ", though the separation does not reach conventional statistical significance in this sample."}
          {" "}This is a computational, hypothesis-generating signal — not a validated clinical prognostic result.
        </p>
      </Panel>
    </div>
  );
}

/* ============================================================================
   BIOMARKER REPORT
============================================================================ */
function ScoreBar({ t, label, score, color }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, color:t.textDim, marginBottom:5 }}>
        <span>{label}</span><span style={{ fontFamily:"'IBM Plex Mono',monospace", color:t.text }}>{score}/5</span>
      </div>
      <div style={{ height:8, borderRadius:99, background:t.panel3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${score/5*100}%`, background:color, borderRadius:99 }} />
      </div>
    </div>
  );
}
function BiomarkerReportPage({ t, cancer, gene, degRow, pathwayTop, survival, toast }) {
  const reportRef = useRef(null);
  const degScore = degRow?.reg !== "Not significant" ? (Math.abs(degRow.log2FC) > 2 ? 5 : 4) : 2;
  const pathScore = pathwayTop ? Math.min(5, Math.round(pathwayTop.negLogP/1.5)) : 2;
  const ppiScore = 4;
  const survScore = survival.pvalue < 0.01 ? 5 : survival.pvalue < 0.05 ? 4 : 2;
  const total = degScore+pathScore+ppiScore+survScore;
  const overall = total>=17?"Strong":total>=12?"Moderate":"Weak";
  const overallColor = overall==="Strong"?t.green:overall==="Moderate"?t.amber:t.red;

  function downloadReport(){
    const lines = [
      "OncoLens — Computational Biomarker Report", "="+"=".repeat(40),
      `Generated: ${new Date().toISOString()}`,
      `Cancer type: ${cancer}`, `Candidate gene: ${gene}`, "",
      "-- Differential Expression --",
      degRow ? `log2FC: ${degRow.log2FC} | padj: ${degRow.padj} | Status: ${degRow.reg}` : "n/a",
      "", "-- Top Pathway Association --",
      pathwayTop ? `${pathwayTop.name} (${pathwayTop.id}) — -log10(p): ${pathwayTop.negLogP}` : "n/a",
      "", "-- Survival Association --",
      `Log-rank p-value: ${survival.pvalue} | Worse-prognosis group: ${gene}-${survival.worse==="high"?"High":"Low"}`,
      "", "-- Evidence Scorecard --",
      `Differential expression: ${degScore}/5`, `Pathway involvement: ${pathScore}/5`,
      `PPI network importance: ${ppiScore}/5`, `Survival association: ${survScore}/5`,
      `Overall: ${overall} computational candidate biomarker`, "",
      "This report reflects a Computational Candidate Biomarker. Findings are derived from demonstration/public-style datasets",
      "and must not be interpreted as clinical diagnosis, treatment guidance, or a validated clinical biomarker.",
    ];
    const blob = new Blob([lines.join("\n")], {type:"text/plain"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `OncoLens_${gene}_${cancer}_report.txt`; a.click();
    toast("Report downloaded");
  }

  return (
    <div>
      <SectionTitle t={t} icon={FileText} title="Biomarker Discovery Summary" sub="A consolidated, evidence-weighted view of the candidate gene across every analysis stage." />
      <Panel t={t} style={{ padding:26 }} className="report-panel">
        <div ref={reportRef}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14 }}>
            <div>
              <Badge t={t} color={t.violet}>Computational Candidate Biomarker</Badge>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontWeight:700, fontSize:30, color:t.cyan, marginTop:12 }}>{gene}</div>
              <div style={{ color:t.textDim, fontSize:13.5, marginTop:2 }}>{cancer} · generated {new Date().toLocaleDateString()}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11.5, color:t.textFaint }}>OVERALL SIGNAL</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:22, color:overallColor }}>{overall}</div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, margin:"24px 0" }}>
            <Panel t={t} style={{ padding:16, background:t.panel2 }}>
              <div style={{ fontSize:11.5, color:t.textFaint, marginBottom:6 }}>DIFFERENTIAL EXPRESSION</div>
              <div style={{ color:t.text, fontSize:13 }}>{degRow ? `${degRow.reg} · log2FC ${degRow.log2FC} · padj ${degRow.padj}` : "n/a"}</div>
            </Panel>
            <Panel t={t} style={{ padding:16, background:t.panel2 }}>
              <div style={{ fontSize:11.5, color:t.textFaint, marginBottom:6 }}>TOP PATHWAY</div>
              <div style={{ color:t.text, fontSize:13 }}>{pathwayTop ? `${pathwayTop.name}` : "n/a"}</div>
            </Panel>
            <Panel t={t} style={{ padding:16, background:t.panel2 }}>
              <div style={{ fontSize:11.5, color:t.textFaint, marginBottom:6 }}>PPI IMPORTANCE</div>
              <div style={{ color:t.text, fontSize:13 }}>Hub node, high connectivity</div>
            </Panel>
            <Panel t={t} style={{ padding:16, background:t.panel2 }}>
              <div style={{ fontSize:11.5, color:t.textFaint, marginBottom:6 }}>SURVIVAL ASSOCIATION</div>
              <div style={{ color:t.text, fontSize:13 }}>p = {survival.pvalue} · worse: {gene}-{survival.worse==="high"?"High":"Low"}</div>
            </Panel>
          </div>

          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:14, fontFamily:"'IBM Plex Mono',monospace" }}>EVIDENCE SCORECARD</div>
            <ScoreBar t={t} label="Differential expression strength" score={degScore} color={t.magenta} />
            <ScoreBar t={t} label="Pathway involvement" score={pathScore} color={t.violet} />
            <ScoreBar t={t} label="PPI network importance" score={ppiScore} color={t.cyan} />
            <ScoreBar t={t} label="Survival association" score={survScore} color={t.amber} />
          </div>

          <Panel t={t} style={{ padding:16, marginTop:20, background:t.amber+"0D", borderColor:t.amber+"40" }}>
            <div style={{ display:"flex", gap:10 }}>
              <ShieldAlert size={17} color={t.amber} style={{flexShrink:0, marginTop:2}} />
              <p style={{ fontSize:12.5, color:t.textDim, lineHeight:1.6, margin:0 }}>
                {gene} is presented here as a <b style={{color:t.text}}>Computational Candidate Biomarker</b> based on demonstration data. This is a research/educational output only — it is not a clinically validated biomarker and should not inform diagnosis or treatment.
              </p>
            </div>
          </Panel>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20, flexWrap:"wrap" }}>
          <PrimaryButton t={t} onClick={downloadReport}><Download size={15}/> Download Report (.txt)</PrimaryButton>
          <OutlineButton t={t} onClick={()=>window.print()}><Printer size={15}/> Print / Save as PDF</OutlineButton>
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================================
   DATA SOURCES / ABOUT / UPLOAD
============================================================================ */
function DataSourcesPage({ t }) {
  const sources = [
    { name:"GDC / TCGA", used:"Cohort structure & terminology reference", url:"https://portal.gdc.cancer.gov/", live:false },
    { name:"NCBI Gene", used:"Gene nomenclature & summaries reference", url:"https://www.ncbi.nlm.nih.gov/gene/", live:false },
    { name:"Ensembl", used:"Chromosomal location reference", url:"https://www.ensembl.org/", live:false },
    { name:"UniProt", used:"Protein function reference", url:"https://www.uniprot.org/", live:false },
    { name:"Gene Ontology", used:"GO term reference", url:"https://geneontology.org/", live:false },
    { name:"KEGG", used:"Pathway reference", url:"https://www.genome.jp/kegg/", live:false },
    { name:"STRING", used:"PPI network concept reference", url:"https://string-db.org/", live:false },
    { name:"cBioPortal", used:"Survival analysis concept reference", url:"https://www.cbioportal.org/", live:false },
  ];
  return (
    <div>
      <SectionTitle t={t} icon={Database} title="Data Sources" sub="This build runs entirely client-side against locally bundled demo datasets modeled on these public resources — no live API calls are made, so nothing below should be read as real-time data." />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
        {sources.map(s=>(
          <Panel key={s.name} t={t} style={{ padding:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, color:t.text }}>{s.name}</div>
              <Badge t={t} color={t.amber}>REFERENCE ONLY</Badge>
            </div>
            <div style={{ fontSize:12.5, color:t.textDim, marginTop:8, lineHeight:1.5 }}>{s.used}</div>
            <a href={s.url} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:10, fontSize:12, color:t.cyan, textDecoration:"none" }}>Visit source <ExternalLink size={11}/></a>
          </Panel>
        ))}
      </div>
    </div>
  );
}
function AboutPage({ t }) {
  return (
    <div>
      <SectionTitle t={t} icon={Info} title="About This Project" sub="What OncoLens is, and what it deliberately is not." />
      <Panel t={t} style={{ padding:24, marginBottom:16 }}>
        <p style={{ color:t.textDim, fontSize:13.5, lineHeight:1.7 }}>
          OncoLens is a frontend-only portfolio project demonstrating a mid-level bioinformatics workflow: cancer cohort selection,
          gene-level expression review, differential expression analysis, pathway enrichment, protein-protein interaction context,
          and Kaplan–Meier survival comparison, ending in a consolidated candidate-biomarker summary. It runs entirely in the browser
          with no custom backend, database, or authentication server.
        </p>
      </Panel>
      <Panel t={t} style={{ padding:24, marginBottom:16, borderColor:t.red+"40", background:t.red+"08" }}>
        <div style={{ display:"flex", gap:10 }}>
          <ShieldAlert size={18} color={t.red} style={{flexShrink:0}} />
          <p style={{ color:t.text, fontSize:13, lineHeight:1.7, margin:0 }}>
            This application is intended for research and educational purposes. Computational findings should not be interpreted as
            clinical diagnosis, treatment recommendations, or validated clinical biomarkers.
          </p>
        </div>
      </Panel>
      <Panel t={t} style={{ padding:24 }}>
        <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:10, fontFamily:"'IBM Plex Mono',monospace" }}>STACK</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["React","Recharts","D3.js","PapaParse","Lucide Icons"].map(s=><Badge key={s} t={t} color={t.cyan}>{s}</Badge>)}
        </div>
      </Panel>
    </div>
  );
}

function DataUploadPage({ t, toast }) {
  const [fastaResult, setFastaResult] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  function parseFasta(text) {
    const seqs = text.split(">").filter(Boolean).map(block => {
      const [header, ...rest] = block.split("\n");
      const seq = rest.join("").replace(/\s/g,"").toUpperCase();
      const counts = { A:0,T:0,G:0,C:0,N:0,other:0 };
      for (const ch of seq) { if (counts[ch]!==undefined) counts[ch]++; else counts.other++; }
      const len = seq.length || 1;
      return { header, length: seq.length,
        gc: (((counts.G+counts.C)/len)*100).toFixed(1),
        at: (((counts.A+counts.T)/len)*100).toFixed(1),
        n: counts.N };
    });
    return seqs;
  }
  function handleFiles(files) {
    const file = files[0]; if (!file) return;
    const isFasta = /\.(fa|fasta|fna)$/i.test(file.name);
    const isTabular = /\.(csv|tsv|txt)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (isFasta) { setFastaResult(parseFasta(text)); setCsvResult(null); toast(`Parsed ${file.name}`); }
      else if (isTabular) {
        Papa.parse(text, { header:true, skipEmptyLines:true, complete: (res) => { setCsvResult({ name:file.name, rows: res.data, fields: res.meta.fields }); setFastaResult(null); toast(`Parsed ${file.name}`); } });
      } else toast("Unsupported file type");
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <SectionTitle t={t} icon={Upload} title="Data Upload" sub="Parse your own FASTA sequences or expression CSV/TSV files entirely in your browser — nothing leaves your device." />
      <Panel t={t} onDragOver={e=>{e.preventDefault(); setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{ e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        style={{ padding:36, textAlign:"center", borderStyle:"dashed", borderColor: dragOver?t.cyan:t.lineStrong, background: dragOver?t.cyan+"0A":t.panel }}>
        <Upload size={26} color={t.cyan} style={{ marginBottom:10 }} />
        <div style={{ color:t.text, fontSize:14, marginBottom:6 }}>Drag & drop a .fasta, .csv or .tsv file here</div>
        <div style={{ color:t.textFaint, fontSize:12, marginBottom:16 }}>Or choose a file — processed locally, never uploaded to a server</div>
        <label>
          <input type="file" accept=".fa,.fasta,.fna,.csv,.tsv,.txt" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)} />
          <span style={{ display:"inline-block" }}><OutlineButton t={t} style={{ display:"inline-flex" }}>Choose File</OutlineButton></span>
        </label>
      </Panel>

      {fastaResult && (
        <Panel t={t} style={{ padding:20, marginTop:18 }}>
          <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:10, fontFamily:"'IBM Plex Mono',monospace" }}>FASTA SEQUENCE STATISTICS</div>
          <DataTable t={t} rows={fastaResult.map((s,i)=>({ header: s.header||`seq_${i+1}`, ...s }))} columns={[
            { key:"header", label:"Sequence ID" }, { key:"length", label:"Length (bp)" },
            { key:"gc", label:"GC %" }, { key:"at", label:"AT %" }, { key:"n", label:"N count" },
          ]} pageSize={6} />
        </Panel>
      )}
      {csvResult && (
        <Panel t={t} style={{ padding:20, marginTop:18 }}>
          <div style={{ fontSize:12.5, color:t.textFaint, marginBottom:10, fontFamily:"'IBM Plex Mono',monospace" }}>PREVIEW — {csvResult.name} ({csvResult.rows.length} rows)</div>
          <DataTable t={t} rows={csvResult.rows} columns={(csvResult.fields||[]).slice(0,6).map(f=>({ key:f, label:f }))} pageSize={6} />
        </Panel>
      )}
      {!fastaResult && !csvResult && <EmptyState t={t} icon={FileText} text="No file parsed yet" />}
    </div>
  );
}

/* ============================================================================
   SHELL: SIDEBAR / TOPNAV / APP
============================================================================ */
const NAV = [
  { key:"overview", label:"Overview", icon:Activity },
  { key:"explorer", label:"Cancer Explorer", icon:Microscope },
  { key:"expression", label:"Gene Expression", icon:Dna },
  { key:"deg", label:"Differential Expression", icon:TrendingUp },
  { key:"pathways", label:"Pathways", icon:GitBranch },
  { key:"ppi", label:"PPI Network", icon:Network },
  { key:"survival", label:"Survival Analysis", icon:Activity },
  { key:"report", label:"Biomarker Report", icon:FileText },
  { key:"upload", label:"Data Upload", icon:Upload },
  { key:"sources", label:"Data Sources", icon:Database },
  { key:"about", label:"About Project", icon:Info },
];

function Sidebar({ t, page, setPage, mobileOpen, setMobileOpen }) {
  return (
    <>
      {mobileOpen && <div onClick={()=>setMobileOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:40 }} />}
      <aside style={{
        width:224, background:t.panel, borderRight:`1px solid ${t.line}`, padding:"20px 12px", flexShrink:0,
        position: "fixed", top:0, bottom:0, left: mobileOpen ? 0 : "-240px", zIndex:50, transition:"left .2s", overflowY:"auto",
      }} className="sidebar-desktop">
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 10px 20px" }}>
          <Dna size={20} color={t.cyan} />
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, color:t.text, fontSize:16 }}>OncoLens</span>
        </div>
        {NAV.map(n=>(
          <div key={n.key} onClick={()=>{setPage(n.key); setMobileOpen(false);}} style={{
            display:"flex", alignItems:"center", gap:11, padding:"9px 12px", borderRadius:10, cursor:"pointer", marginBottom:2,
            background: page===n.key ? t.cyan+"16" : "transparent", color: page===n.key ? t.cyan : t.textDim,
            fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", fontWeight: page===n.key?600:400,
            borderLeft: page===n.key ? `2px solid ${t.cyan}` : "2px solid transparent" }}>
            <n.icon size={15} /> {n.label}
          </div>
        ))}
      </aside>
    </>
  );
}

function TopNav({ t, cancer, setCancer, dark, setDark, setMobileOpen, geneQuick, setGeneQuick }) {
  const [showSearch, setShowSearch] = useState(false);
  return (
    <div style={{ position:"sticky", top:0, zIndex:30, display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"12px 20px", background:t.glass, backdropFilter:"blur(12px)", borderBottom:`1px solid ${t.line}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Menu size={20} color={t.textDim} style={{ cursor:"pointer" }} className="menu-btn" onClick={()=>setMobileOpen(o=>!o)} />
        <select value={cancer} onChange={e=>setCancer(e.target.value)} style={{
          background:t.panel2, color:t.text, border:`1px solid ${t.lineStrong}`, borderRadius:9, padding:"7px 10px",
          fontFamily:"'IBM Plex Mono',monospace", fontSize:12.5, outline:"none" }}>
          {CANCER_TYPES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>
        <Badge t={t} color={t.green}><span style={{width:6,height:6,borderRadius:99,background:t.green,display:"inline-block"}}/> Demo mode online</Badge>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ position:"relative" }} className="topnav-search">
          <div style={{ display:"flex", alignItems:"center", gap:6, background:t.panel2, border:`1px solid ${t.lineStrong}`, borderRadius:9, padding:"6px 10px" }}>
            <Search size={13} color={t.textFaint} />
            <input value={geneQuick} onChange={e=>setGeneQuick(e.target.value.toUpperCase())} placeholder="Quick gene jump…"
              style={{ background:"transparent", border:"none", outline:"none", color:t.text, fontFamily:"'IBM Plex Mono',monospace", fontSize:12, width:120 }} />
          </div>
        </div>
        <div onClick={()=>setDark(!dark)} style={{ cursor:"pointer", width:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", background:t.panel2, border:`1px solid ${t.lineStrong}` }}>
          {dark ? <Sun size={15} color={t.amber} /> : <Moon size={15} color={t.violet} />}
        </div>
        <div title="Help" style={{ cursor:"pointer", width:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", background:t.panel2, border:`1px solid ${t.lineStrong}` }}>
          <Info size={15} color={t.textDim} />
        </div>
      </div>
    </div>
  );
}

function Footer({ t }) {
  return (
    <footer style={{ borderTop:`1px solid ${t.line}`, padding:"26px 20px", textAlign:"center", color:t.textFaint, fontSize:12 }}>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", color:t.textDim, fontWeight:600, marginBottom:4 }}>OncoLens — Cancer Genomics &amp; Biomarker Discovery Platform</div>
      <div>Developed by Satish Kumar Singh</div>
      <div style={{ marginTop:8, maxWidth:640, marginInline:"auto", lineHeight:1.6 }}>
        This application is intended for research and educational purposes. Computational findings should not be interpreted as clinical diagnosis, treatment recommendations, or validated clinical biomarkers.
      </div>
    </footer>
  );
}

export default function App() {
  const { dark, setDark, t } = useTheme();
  const [entered, setEntered] = useState(false);
  const [page, setPage] = useState("overview");
  const [cancer, setCancer] = useState("BRCA");
  const [gene, setGene] = useState("TP53");
  const [geneQuick, setGeneQuick] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (m) => setToastMsg(m);

  useEffect(()=>{
    if (geneQuick && GENE_POOL.includes(geneQuick)) {
      if (!GENES.find(g=>g.symbol===geneQuick)) return; // only jump to genes with full detail records
      setGene(geneQuick); setPage("expression");
    }
  }, [geneQuick]);

  const degTable = useMemo(()=>buildDegTable(cancer), [cancer]);
  const degRow = degTable.find(d=>d.gene===gene);
  const pathways = useMemo(()=>buildPathwayEnrichment(cancer, gene), [cancer, gene]);
  const survival = useMemo(()=>buildSurvival(cancer, gene), [cancer, gene]);

  if (!entered) {
    return (
      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", background:t.void, minHeight:"100vh" }}>
        <style>{FONT_IMPORT}{`* { box-sizing: border-box; } body{margin:0;} ::selection{background:${t.cyan}44;}
          @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
          input[type=range]{height:4px;}
        `}</style>
        <Hero t={t} onStart={()=>setEntered(true)} onDemo={()=>setEntered(true)} />
        <div style={{ maxWidth:1180, margin:"0 auto", padding:"48px 28px 60px" }}>
          <SectionTitle t={t} icon={GitBranch} title="How the analysis flows" sub="Every page in the dashboard connects to the next stage of the same pipeline." />
          <WorkflowDiagram t={t} />
        </div>
        <Footer t={t} />
      </div>
    );
  }

  const pageProps = { t, cancer, setCancer, gene, setGene, toast };
  return (
    <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", background:t.void, minHeight:"100vh", color:t.text }}>
      <style>{FONT_IMPORT}{`
        * { box-sizing: border-box; }
        body { margin:0; }
        ::selection{ background:${t.cyan}44; }
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        input[type=range]{ height:4px; }
        @media (min-width: 900px) {
          .sidebar-desktop { left:0 !important; }
          .menu-btn { display:none; }
          .main-content { margin-left:224px; }
        }
        @media (max-width: 899px) {
          .topnav-search { display:none; }
        }
        @media print {
          .sidebar-desktop, .no-print { display:none !important; }
          .main-content { margin-left:0 !important; }
        }
        a:hover { text-decoration: underline !important; }
      `}</style>
      <Sidebar t={t} page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="main-content">
        <div className="no-print">
          <TopNav t={t} cancer={cancer} setCancer={setCancer} dark={dark} setDark={setDark} setMobileOpen={setMobileOpen} geneQuick={geneQuick} setGeneQuick={setGeneQuick} />
        </div>
        <div style={{ maxWidth:1180, margin:"0 auto", padding:"28px 20px 20px" }}>
          {page==="overview" && <OverviewPage t={t} nav={setPage} />}
          {page==="explorer" && <CancerExplorer t={t} cancer={cancer} setCancer={setCancer} />}
          {page==="expression" && <GeneExpressionPage {...pageProps} />}
          {page==="deg" && <DifferentialExpressionPage t={t} cancer={cancer} gene={gene} />}
          {page==="pathways" && <PathwaysPage t={t} cancer={cancer} gene={gene} />}
          {page==="ppi" && <PPIPage t={t} gene={gene} />}
          {page==="survival" && <SurvivalPage t={t} cancer={cancer} gene={gene} />}
          {page==="report" && <BiomarkerReportPage t={t} cancer={cancer} gene={gene} degRow={degRow} pathwayTop={pathways[0]} survival={survival} toast={toast} />}
          {page==="upload" && <DataUploadPage t={t} toast={toast} />}
          {page==="sources" && <DataSourcesPage t={t} />}
          {page==="about" && <AboutPage t={t} />}
        </div>
        <div className="no-print"><Footer t={t} /></div>
      </div>
      <Toast t={t} msg={toastMsg} onClose={()=>setToastMsg("")} />
    </div>
  );
}
