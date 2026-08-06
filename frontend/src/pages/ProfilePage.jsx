import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Edit2, Link2, Globe, Zap, Flame, Trophy, Save, X, RefreshCw, Star, AlertCircle, Loader2, Code2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/authService'
import { progressService } from '@/services/progressService'
import githubService from '@/services/githubService'
import PageWrapper from '@/components/layout/PageWrapper'
import Avatar from '@/components/ui/Avatar'
import AnimatedCounter from '@/components/ui/AnimatedCounter'

/* ─── GitHub SVG ────────────────────────────────────────────────────── */
const Github = (props) => (
  <svg viewBox="0 0 24 24" width={props.size || 24} height={props.size || 24} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

/* ─── Config ────────────────────────────────────────────────────────── */
const RANK_META = {
  explorer:  { label: 'Explorer',  icon: '🧭', color: '#94a3b8', accent: '#475569', bg: 'rgba(148,163,184,0.08)', desc: 'Just getting started' },
  builder:   { label: 'Builder',   icon: '🔨', color: '#34d399', accent: '#10b981', bg: 'rgba(52,211,153,0.08)',  desc: 'Building solid foundations' },
  creator:   { label: 'Creator',   icon: '🎨', color: '#60a5fa', accent: '#3b82f6', bg: 'rgba(96,165,250,0.08)', desc: 'Creating impactful projects' },
  architect: { label: 'Architect', icon: '🏛️', color: '#a78bfa', accent: '#8b5cf6', bg: 'rgba(167,139,250,0.08)', desc: 'Designing complex systems' },
  legend:    { label: 'Legend',    icon: '👑', color: '#fbbf24', accent: '#f59e0b', bg: 'rgba(251,191,36,0.08)',  desc: 'At the top of the game' },
}
const RANK_THRESHOLDS = {
  explorer:  [0, 500],
  builder:   [500, 2000],
  creator:   [2000, 5000],
  architect: [5000, 15000],
  legend:    [15000, 15000],
}
const S = {
  card: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 18,
    position: 'relative',
    overflow: 'hidden',
    transition: 'background-color 0.4s ease, border-color 0.4s ease',
  },
  modalField: {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px', borderRadius: 10, fontSize: 13,
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    color: 'var(--text-color)', outline: 'none', display: 'block',
    transition: 'all 0.3s ease',
  }
}

import LimitExceededModal from '@/components/ui/LimitExceededModal'

/* ─── Main Component ────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, refreshUser, isPro, checkScanLimit, recordScanUsage } = useAuth()
  const [showScanLimitModal, setShowScanLimitModal] = useState(false)
  const [editOpen,     setEditOpen]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [summary,      setSummary]      = useState(null)
  const [form,         setForm]         = useState({ full_name:'', bio:'', github_url:'', linkedin_url:'', website_url:'' })
  const [errors,       setErrors]       = useState({})
  const [ghData,       setGhData]       = useState(null)
  const [ghLoading,    setGhLoading]    = useState(false)
  const [ghError,      setGhError]      = useState('')
  const [ghUsername,   setGhUsername]   = useState('')
  const [ghConnecting, setGhConnecting] = useState(false)
  const [ghExpanded,   setGhExpanded]   = useState(false)

  useEffect(() => {
    if (editOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [editOpen])

  useEffect(() => {
    if (user) {
      setForm({
        full_name:    user.full_name || '',
        bio:          user.profile?.bio || '',
        github_url:   user.profile?.github_url || '',
        linkedin_url: user.profile?.linkedin_url || '',
        website_url:  user.profile?.website_url || '',
      })
      setGhUsername(user.profile?.github_username || '')
      progressService.getSummary().then(s => setSummary(s.data)).catch(() => {})
      if (user.profile?.github_connected) {
        setGhLoading(true)
        githubService.scan().then(d => setGhData(d)).catch(() => {}).finally(() => setGhLoading(false))
      }
    }
  }, [user])

  if (!user) return null

  const profile  = user.profile || {}
  const rank     = profile.dev_rank || 'explorer'
  const xp       = profile.total_xp || 0
  const streak   = profile.streak_days || 0
  const rankMeta = RANK_META[rank] || RANK_META.explorer
  const [rankMin, rankMax] = RANK_THRESHOLDS[rank] || [0, 500]
  const rankPct  = rankMax > rankMin ? Math.min(100, Math.round(((xp - rankMin) / (rankMax - rankMin)) * 100)) : 100

  const handleSave = async () => {
    if (!form.full_name.trim()) { setErrors({ full_name: 'Name is required' }); return }
    setSaving(true)
    try { await authService.updateProfile(form); await refreshUser(); setEditOpen(false); setErrors({}) }
    catch { setErrors({ general: 'Failed to save. Please try again.' }) }
    finally { setSaving(false) }
  }

  const stats = [
    { icon:'⚔️', label:'Challenges',  value: summary?.challenges_completed || 0, color:'#818cf8', accent:'#6366f1', border:'rgba(99,102,241,0.2)'  },
    { icon:'🧪', label:'Interviews',  value: summary?.interviews_completed || 0, color:'#a78bfa', accent:'#8b5cf6', border:'rgba(139,92,246,0.2)'  },
    { icon:'🚀', label:'Projects',    value: summary?.projects_count || 0,       color:'#34d399', accent:'#10b981', border:'rgba(52,211,153,0.2)'  },
    { icon:'🔥', label:'Day Streak',  value: streak,                             color:'#fbbf24', accent:'#f59e0b', border:'rgba(251,191,36,0.2)'  },
  ]

  return (
    <PageWrapper noPadding>
      <div style={{ position:'relative', width:'100%', minHeight:'calc(100vh - 64px)', overflow:'hidden' }}>

        {/* ── Ambient Background ───────────────────────────────── */}
        <div style={{ position:'absolute', inset:0, zIndex:0, opacity:0.12, pointerEvents:'none',
          backgroundImage:'radial-gradient(var(--card-border) 1px, transparent 1px)', backgroundSize:'28px 28px' }} />
        <div style={{ position:'absolute', top:-200, right:'-10%', width:700, height:700, borderRadius:'50%',
          background:`radial-gradient(circle, ${rankMeta.accent}06 0%, transparent 70%)`,
          filter:'blur(90px)', pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'absolute', bottom:-100, left:'-5%', width:500, height:500, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)',
          filter:'blur(70px)', pointerEvents:'none', zIndex:0 }} />

        <div className="container" style={{ paddingTop:36, paddingBottom:64, position:'relative', zIndex:1 }}>

          {/* ══ HERO CARD ══════════════════════════════════════════ */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:20 }}>
            <div style={{
              ...S.card,
              borderColor: `${rankMeta.accent}25`,
              background: 'var(--card-bg)',
            }}>
              {/* Rank color top border */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
                background:`linear-gradient(90deg, transparent, ${rankMeta.accent}80, transparent)` }} />
              {/* Ambient radial inside card */}
              <div style={{ position:'absolute', top:0, right:0, width:300, height:200, pointerEvents:'none',
                background:`radial-gradient(ellipse at 100% 0%, ${rankMeta.accent}08 0%, transparent 70%)` }} />

              {/* Edit button */}
              <div style={{ position:'absolute', top:20, right:20, zIndex:5 }}>
                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                  onClick={() => setEditOpen(true)}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10,
                    background:'#000', border:'1px solid rgba(255,255,255,0.15)', color:'#fff',
                    fontSize:13, fontWeight:700, cursor:'pointer', outline:'none', transition:'all 0.3s',
                    boxShadow:'0 4px 12px rgba(0,0,0,0.3)' }}>
                  <Edit2 size={13} /> Edit Profile
                </motion.button>
              </div>

              <div style={{ padding:'32px 32px 28px', display:'flex', gap:28, flexWrap:'wrap', alignItems:'flex-start', position:'relative', zIndex:1 }}>
                {/* Avatar */}
                <div style={{ flexShrink:0 }}>
                  <div style={{ position:'relative', width:88, height:88 }}>
                    {/* Gradient ring */}
                    <div style={{
                      width:88, height:88, borderRadius:'50%', padding:3,
                      background:`linear-gradient(135deg, ${rankMeta.accent}, ${rankMeta.color})`,
                      boxShadow:`0 0 28px ${rankMeta.accent}35`
                    }}>
                      {/* Inner avatar */}
                      <div style={{
                        width:'100%', height:'100%', borderRadius:'50%', overflow:'hidden',
                        background: rankMeta.bg, border:'2px solid var(--card-bg)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:26, fontWeight:900, color: rankMeta.color,
                        letterSpacing:'0.02em',
                        background: profile.avatar ? undefined : `linear-gradient(135deg, ${rankMeta.accent}cc, ${rankMeta.color}cc)`,
                      }}>
                        {profile.avatar
                          ? <img src={profile.avatar} alt={user.full_name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : <span style={{ color:'#fff' }}>{(user.full_name||'?').trim().split(' ').slice(0,2).map(n=>n[0]?.toUpperCase()).join('')}</span>
                        }
                      </div>
                    </div>
                    {/* Online pip */}
                    <div style={{ position:'absolute', bottom:5, right:5, width:14, height:14, borderRadius:'50%',
                      background:'#10b981', border:'2.5px solid var(--card-bg)',
                      boxShadow:'0 0 8px #10b981' }} />
                  </div>
                </div>

                {/* Info block */}
                <div style={{ flex:1, minWidth:240 }}>
                  {/* Name + rank badge */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:6 }}>
                    <h1 style={{ fontSize:'clamp(22px,3.5vw,34px)', fontWeight:950, color:'var(--text-heading)',
                      margin:0, letterSpacing:'-0.03em', lineHeight:1 }}>
                      {user.full_name}
                    </h1>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px',
                      borderRadius:20, fontSize:12, fontWeight:800,
                      color: rankMeta.color, background: rankMeta.bg, border:`1px solid ${rankMeta.accent}30` }}>
                      {rankMeta.icon} {rankMeta.label}
                    </span>
                    {isPro && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px',
                        borderRadius:20, fontSize:12, fontWeight:800,
                        color: '#fff', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.4)', border: '1px solid rgba(255,255,255,0.3)' }}>
                        ✨ PRO ACCELERATED
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  <p style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.65, marginBottom:16, maxWidth:540,
                    fontStyle: profile.bio ? 'normal' : 'italic' }}>
                    {profile.bio || 'No bio provided yet. Click Edit Profile to add one.'}
                  </p>

                  {/* XP progress */}
                  <div style={{ maxWidth:380, marginBottom:18 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>Progress to next rank</span>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13, fontWeight:900, color: rankMeta.color, fontVariantNumeric:'tabular-nums' }}>
                          {xp.toLocaleString()} XP
                        </span>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>/ {rankMax.toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ height:7, borderRadius:99, background:'var(--card-border)', overflow:'hidden' }}>
                      <motion.div initial={{ width:0 }} animate={{ width:`${rankPct}%` }} transition={{ duration:1.3, ease:[0.4,0,0.2,1] }}
                        style={{ height:'100%', borderRadius:99,
                          background:`linear-gradient(90deg, ${rankMeta.accent}, ${rankMeta.color})`,
                          boxShadow:`0 0 10px ${rankMeta.accent}40` }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'var(--text-muted)' }}>
                      <span>{rankMin.toLocaleString()} XP</span>
                      <span>{rankPct}% complete</span>
                    </div>
                  </div>

                  {/* Social links */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {[
                      profile.github_url   && { href: profile.github_url,   label:'GitHub',   icon:<Github size={12} /> },
                      profile.linkedin_url && { href: profile.linkedin_url, label:'LinkedIn',  icon:<Link2  size={12} /> },
                      profile.website_url  && { href: profile.website_url,  label:'Website',   icon:<Globe  size={12} /> },
                    ].filter(Boolean).map(link => (
                      <a key={link.label} href={link.href} target="_blank" rel="noopener"
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8,
                          fontSize:12, fontWeight:600, color:'var(--text-muted)', background:'var(--glass-bg)',
                          border:'1px solid var(--glass-border)', textDecoration:'none', transition:'all 0.25s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = rankMeta.color; e.currentTarget.style.borderColor = `${rankMeta.accent}40` }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--glass-border)' }}>
                        {link.icon} {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ══ STATS ROW ══════════════════════════════════════════ */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}
            style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }} className="stats-grid">
            {stats.map((s, i) => (
              <div key={i} style={{
                ...S.card,
                borderLeft:`3px solid ${s.accent}`,
                padding:'18px 20px',
                display:'flex', alignItems:'center', gap:14,
              }}>
                <div style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:22, flexShrink:0, background:`${s.accent}10`, border:`1px solid ${s.accent}20` }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize:26, fontWeight:950, color: s.color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                    <AnimatedCounter value={s.value} />
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ══ RANK JOURNEY ═══════════════════════════════════════ */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.14 }}
            style={{ marginBottom:20 }}>
            <div style={{ ...S.card, padding:28 }}>
              <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:1,
                background:'linear-gradient(90deg,transparent,rgba(99,102,241,0.25),transparent)' }} />

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <h2 style={{ fontSize:16, fontWeight:900, color:'var(--text-heading)', margin:0,
                  display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                    background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', fontSize:15 }}>👑</div>
                  Rank Journey
                </h2>
                <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>
                  {xp.toLocaleString()} XP total
                </span>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:0, flexWrap:'wrap' }} className="journey-wrapper">
                {Object.entries(RANK_META).map(([r, meta], i, arr) => {
                  const thresholds = RANK_THRESHOLDS[r]
                  const isActive = r === rank
                  const isPast   = Object.keys(RANK_META).indexOf(r) < Object.keys(RANK_META).indexOf(rank)
                  return (
                    <div key={r} style={{ display:'flex', alignItems:'center', flex:1, minWidth:90 }}>
                      <motion.div
                        whileHover={{ y:-3 }}
                        style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flex:1,
                          transform: isActive ? 'scale(1.08)' : 'scale(1)', transition:'transform 0.2s',
                          cursor:'default' }}>
                        <div style={{
                          width:52, height:52, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
                          border: isActive ? `2px solid ${meta.color}` : isPast ? '2px solid rgba(52,211,153,0.4)' : '2px solid var(--glass-border)',
                          background: isActive ? `${meta.color}18` : isPast ? 'rgba(52,211,153,0.06)' : 'transparent',
                          boxShadow: isActive ? `0 0 20px ${meta.color}30` : 'none',
                          opacity: isActive ? 1 : isPast ? 0.8 : 0.35,
                          transition:'all 0.3s'
                        }}>
                          {isPast && !isActive
                            ? <CheckCircle size={22} style={{ color:'#34d399' }} />
                            : meta.icon}
                        </div>
                        <span style={{ fontSize:12, fontWeight:800, textTransform:'capitalize',
                          color: isActive ? meta.color : isPast ? '#34d399' : 'var(--text-muted)' }}>
                          {r}
                        </span>
                        <span style={{ fontSize:10, color:'var(--text-muted)', fontVariantNumeric:'tabular-nums' }}>
                          {thresholds[0].toLocaleString()}+ XP
                        </span>
                      </motion.div>
                      {i < arr.length - 1 && (
                        <div style={{ height:2, flex:1, margin:'0 2px', borderRadius:2, transition:'background 0.5s',
                          background: isPast
                            ? 'linear-gradient(90deg, rgba(52,211,153,0.4), rgba(52,211,153,0.15))'
                            : 'var(--card-border)' }} className="journey-connector" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>



          {/* ══ GITHUB CARD ════════════════════════════════════════ */}
          {/*
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
            <div style={{ ...S.card, padding:28 }}>
              <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:1,
                background:'linear-gradient(90deg,transparent,rgba(99,102,241,0.2),transparent)' }} />

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                <h2 style={{ fontSize:16, fontWeight:900, color:'var(--text-heading)', margin:0,
                  display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                    background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', fontSize:16 }}>🐙</div>
                  GitHub Integration
                  {profile.github_connected && (
                    <span style={{ fontSize:10, fontWeight:700, color:'#34d399',
                      background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)',
                      padding:'3px 9px', borderRadius:20, letterSpacing:0.5 }}>● CONNECTED</span>
                  )}
                </h2>
                {profile.github_connected && (
                  <div style={{ display:'flex', gap:8 }}>
                    <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
                      onClick={async () => {
                        if (!checkScanLimit()) {
                          setShowScanLimitModal(true)
                          return
                        }
                        setGhLoading(true); try { const d = await githubService.scan(); recordScanUsage(); setGhData(d) } catch {} finally { setGhLoading(false) }
                      }}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
                        background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
                        color:'#818cf8', cursor:'pointer', fontSize:12, fontWeight:700, outline:'none' }}>
                      <RefreshCw size={12} style={{ animation: ghLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                    </motion.button>
                    <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
                      onClick={async () => {
                        if (window.confirm('Disconnect GitHub?')) {
                          setGhLoading(true)
                          try { await githubService.disconnect(); setGhData(null); setGhUsername(''); await refreshUser() }
                          catch {} finally { setGhLoading(false) }
                        }
                      }}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
                        background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                        color:'#f87171', cursor:'pointer', fontSize:12, fontWeight:700, outline:'none' }}>
                      Disconnect
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Connect Form */}
              {!profile.github_connected && (
                <div>
                  <p style={{ color:'var(--text-muted)', fontSize:13.5, marginBottom:18, lineHeight:1.65, maxWidth:520 }}>
                    Connect your GitHub to get a <strong style={{ color:'var(--text-heading)' }}>Code Health Score</strong> for your repos — and earn XP credit for real-world code!
                  </p>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    <div style={{ position:'relative', flex:'1', minWidth:200 }}>
                      <Github size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
                      <input
                        placeholder="your-github-username"
                        value={ghUsername}
                        onChange={e => setGhUsername(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !ghConnecting && ghUsername.trim() && setGhConnecting(true)}
                        style={{ ...S.modalField, paddingLeft:34 }}
                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.45)'}
                        onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
                      />
                    </div>
                    <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                      disabled={!ghUsername.trim() || ghConnecting}
                      onClick={async () => {
                        if (!ghUsername.trim()) return
                        setGhConnecting(true); setGhError('')
                        try { const data = await githubService.connect(ghUsername.trim()); setGhData(data); await refreshUser() }
                        catch (e) { setGhError(e?.response?.data?.error || 'Could not connect. Check your username.') }
                        finally { setGhConnecting(false) }
                      }}
                      style={{ padding:'10px 22px', borderRadius:10, border:'1px solid rgba(255,255,255,0.15)', color:'#fff', fontSize:13, fontWeight:700,
                        cursor: ghConnecting ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap',
                        background:'#000',
                        boxShadow:'0 4px 14px rgba(0,0,0,0.3)',
                        opacity: ghConnecting ? 0.7 : 1 }}>
                      {ghConnecting ? <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> Scanning…</> : <><Github size={13} /> Connect</>}
                    </motion.button>
                  </div>
                  {ghError && <p style={{ fontSize:12, color:'#ef4444', marginTop:10, display:'flex', alignItems:'center', gap:4 }}><AlertCircle size={12} /> {ghError}</p>}
                </div>
              )}

              {/* Loading */}
              {ghLoading && !ghData && (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>
                  <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} />
                  Scanning your repositories…
                </div>
              )}

              {/* GitHub Data */}
              {ghData && (
                <div>
                  {/* Health score bar */}
                  <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:20, padding:'16px 20px',
                    borderRadius:14, background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.12)' }}>
                    <div style={{ textAlign:'center', flexShrink:0 }}>
                      <div style={{ fontSize:38, fontWeight:950, lineHeight:1, fontVariantNumeric:'tabular-nums',
                        color: ghData.code_health_score >= 70 ? '#34d399' : ghData.code_health_score >= 40 ? '#fbbf24' : '#ef4444' }}>
                        {ghData.code_health_score}
                      </div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, marginTop:2 }}>
                        Code Health
                      </div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-heading)' }}>@{ghData.username}</span>
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>{ghData.repo_count} repos scanned</span>
                      </div>
                      <div style={{ height:8, borderRadius:99, background:'var(--card-border)', overflow:'hidden', marginBottom:8 }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${ghData.code_health_score}%` }} transition={{ duration:1.2 }}
                          style={{ height:'100%', borderRadius:99,
                            background: ghData.code_health_score >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' :
                              ghData.code_health_score >= 40 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                              'linear-gradient(90deg,#ef4444,#f87171)' }} />
                      </div>
                      {ghData.top_languages?.length > 0 && (
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {ghData.top_languages.map(lang => (
                            <span key={lang} style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)',
                              background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
                              padding:'2px 9px', borderRadius:20 }}>{lang}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Repo toggle */}
                  <button onClick={() => setGhExpanded(e => !e)}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 0', background:'none', border:'none', cursor:'pointer',
                      color:'var(--text-muted)', fontSize:13, fontWeight:700 }}>
                    <span>Repositories ({ghData.repos?.length || 0})</span>
                    <span style={{ fontSize:10 }}>{ghExpanded ? '▲ Collapse' : '▼ Expand'}</span>
                  </button>

                  {ghExpanded && (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
                      {ghData.repos?.slice(0, 15).map(repo => (
                        <a key={repo.name} href={repo.url} target="_blank" rel="noopener"
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10,
                            background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
                            textDecoration:'none', transition:'all 0.25s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.3)'; e.currentTarget.style.transform='translateX(4px)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--glass-border)'; e.currentTarget.style.transform='translateX(0)' }}>
                          <Code2 size={13} color="var(--text-muted)" style={{ flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-heading)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{repo.name}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{repo.language}{repo.stars > 0 ? ` · ⭐ ${repo.stars}` : ''}</div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                            <div style={{ width:52, height:5, borderRadius:99, background:'var(--card-border)', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${repo.score}%`, borderRadius:99, transition:'width 0.5s',
                                background: repo.score >= 70 ? '#34d399' : repo.score >= 40 ? '#fbbf24' : '#94a3b8' }} />
                            </div>
                            <span style={{ fontSize:11, fontWeight:800, minWidth:26, textAlign:'right',
                              color: repo.score >= 70 ? '#34d399' : repo.score >= 40 ? '#fbbf24' : 'var(--text-muted)' }}>
                              {repo.score}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
          */}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .journey-wrapper { flex-direction: column !important; gap: 16px !important; align-items: stretch !important; }
          .journey-connector { display: none !important; }
        }
      `}</style>

      {/* ══ EDIT MODAL ═════════════════════════════════════════════ */}
      {createPortal(
        <AnimatePresence>
          {editOpen && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center',
                padding:20, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)' }}
              onClick={e => { if (e.target === e.currentTarget) setEditOpen(false) }}>
              <motion.div initial={{ scale:0.92, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.92, opacity:0 }}
                style={{ width:'100%', maxWidth:500, background:'var(--card-bg)',
                  border:'1px solid var(--card-border)', borderRadius:22, overflow:'hidden',
                  boxShadow:'0 32px 80px rgba(0,0,0,0.4)' }}>
                {/* Top accent */}
                <div style={{ height:3, background:'linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)' }} />

                <div style={{ padding:28 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                    <h2 style={{ fontSize:18, fontWeight:900, color:'var(--text-heading)', margin:0 }}>Edit Profile</h2>
                    <button onClick={() => setEditOpen(false)}
                      style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                        background:'var(--glass-bg)', border:'1px solid var(--glass-border)', color:'var(--text-muted)',
                        cursor:'pointer', outline:'none' }}>
                      <X size={15} />
                    </button>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {errors.general && (
                      <div style={{ padding:12, background:'rgba(251,113,133,0.08)', border:'1px solid rgba(251,113,133,0.2)',
                        borderRadius:10, fontSize:13, color:'#fb7185' }}>
                        {errors.general}
                      </div>
                    )}

                    {[
                      { label:'Full Name',    key:'full_name',    type:'input',    placeholder:'Your name' },
                      { label:'Bio',          key:'bio',          type:'textarea', placeholder:'Tell the community about yourself…' },
                      { label:'GitHub URL',   key:'github_url',   type:'input',    placeholder:'https://github.com/…' },
                      { label:'LinkedIn URL', key:'linkedin_url', type:'input',    placeholder:'https://linkedin.com/in/…' },
                      { label:'Website URL',  key:'website_url',  type:'input',    placeholder:'https://…' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6, letterSpacing:0.4, textTransform:'uppercase' }}>
                          {f.label}
                        </label>
                        {f.type === 'textarea'
                          ? <textarea value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder}
                              style={{ ...S.modalField, minHeight:80, resize:'vertical' }}
                              onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.5)'}
                              onBlur={e => e.target.style.borderColor='var(--glass-border)'} />
                          : <input value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder}
                              style={S.modalField}
                              onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.5)'}
                              onBlur={e => e.target.style.borderColor='var(--glass-border)'} />
                        }
                        {errors[f.key] && <span style={{ fontSize:12, color:'#fb7185', marginTop:4, display:'block' }}>{errors[f.key]}</span>}
                      </div>
                    ))}

                    <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                      onClick={handleSave} disabled={saving}
                      style={{ width:'100%', padding:'14px', borderRadius:13, fontSize:14, fontWeight:800,
                        color:'#fff', background:'#000', border:'1px solid rgba(255,255,255,0.15)',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                        boxShadow:'0 6px 20px rgba(0,0,0,0.4)', opacity: saving ? 0.7 : 1, marginTop:6 }}>
                      {saving ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save Profile</>}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      <LimitExceededModal
        featureName="Repository Scans"
        isOpen={showScanLimitModal}
        onClose={() => setShowScanLimitModal(false)}
      />
    </PageWrapper>
  )
}
