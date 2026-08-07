import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  Menu, X, Zap, ChevronDown, ChevronLeft, ChevronRight,
  LogOut, User, Trophy, Sun, Moon, Search, Users,
  Swords, FlaskConical, Map, Palette, BarChart3, FileText,
  Gamepad2, Bell, CheckSquare, Trash2, BookMarked, Cpu, MapPin, GitPullRequestArrow
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import Avatar from '@/components/ui/Avatar'
import { notificationService } from '@/services/notificationService'

const NAV_LINKS = [
  { to: '/challenges', label: 'Challenges',   Icon: Swords,              tourId: 'tour-challenges' },
  { to: '/arena',      label: 'Code Arena',    Icon: Gamepad2,            tourId: 'tour-arena' },
  { to: '/interview',  label: 'Interview Lab', Icon: FlaskConical,        tourId: 'tour-interview' },
  { to: '/roadmap',    label: 'My Roadmap',    Icon: Map,                 tourId: 'tour-roadmap' },
  { to: '/codereview', label: 'Code Review',   Icon: GitPullRequestArrow, tourId: 'tour-codereview' },
  { to: '/resume',     label: 'Resume Hub',    Icon: FileText,            tourId: 'tour-resume' },
  { to: '/peer-review',label: 'Peer Review',   Icon: Users,               tourId: 'tour-peerreview' },
  { to: '/revision',   label: 'Revision Hub',  Icon: BookMarked,          tourId: 'tour-revision' },
  { to: '/showcase',   label: 'Showcase',      Icon: Palette,             tourId: 'tour-showcase' },
  { to: '/progress',   label: 'Progress',      Icon: BarChart3,           tourId: 'tour-progress' },
]

const RANK_COLOR = { explorer:'#94a3b8', builder:'#34d399', creator:'#60a5fa', architect:'#a78bfa', legend:'#fbbf24' }
const RANK_XP    = { explorer:[0,500], builder:[500,2000], creator:[2000,5000], architect:[5000,15000], legend:[15000,15000] }

function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [showPopover, setShowPopover] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const buttonRef = useRef(null)

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // Note 1: A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      
      osc.start(ctx.currentTime)
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(1318.51, ctx.currentTime) // Note 2: E6
        gain2.gain.setValueAtTime(0.08, ctx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        osc2.start(ctx.currentTime)
        osc2.stop(ctx.currentTime + 0.4)
      }, 80)
      
      osc.stop(ctx.currentTime + 0.3)
    } catch (e) {}
  }

  const loadNotifications = async (silent = false) => {
    try {
      const res = await notificationService.getAll()
      const data = res.data.results || res.data
      const unreads = data.filter(n => !n.is_read).length
      setUnreadCount(unreads)

      if (!silent) {
        setNotifications(prev => {
          const prevMaxId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) : 0
          const newMaxId = data.length > 0 ? Math.max(...data.map(d => d.id)) : 0
          if (prevMaxId > 0 && newMaxId > prevMaxId) {
            const hasNewUnread = data.some(d => d.id > prevMaxId && !d.is_read)
            if (hasNewUnread) {
              playNotificationSound()
            }
          }
          return data
        })
      } else {
        setNotifications(data)
      }
    } catch (e) {
      console.error("Error loading notifications:", e)
    }
  }

  useEffect(() => {
    loadNotifications(true) // Load silently on mount
    const interval = setInterval(() => {
      loadNotifications(false) // Play sound on new unread notifications
    }, 60000) // Poll every 60s instead of 15s to reduce server load
    return () => clearInterval(interval)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await notificationService.readAll()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error(e)
    }
  }

  const handleReadNotification = async (id) => {
    try {
      await notificationService.read(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }

  const handleClearAll = async () => {
    try {
      await notificationService.clear()
      setNotifications([])
      setUnreadCount(0)
    } catch (e) {
      console.error(e)
    }
  }

  const rect = buttonRef.current ? buttonRef.current.getBoundingClientRect() : null
  const isMobile = window.innerWidth <= 900

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => {
          setShowPopover(p => !p)
        }}
        style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: showPopover ? 'rgba(99,102,241,0.15)' : 'var(--glass-bg)',
          border: `1px solid ${showPopover ? 'rgba(99,102,241,0.3)' : 'var(--glass-border)'}`,
          color: unreadCount > 0 ? '#818cf8' : 'var(--text-muted)',
          outline: 'none', position: 'relative', transition: 'all 0.2s'
        }}
        onMouseEnter={e => {
          if (!showPopover) {
            e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'
          }
        }}
        onMouseLeave={e => {
          if (!showPopover) {
            e.currentTarget.style.background = 'var(--glass-bg)'
            e.currentTarget.style.borderColor = 'var(--glass-border)'
          }
        }}
      >
        <Bell size={15} className={unreadCount > 0 ? "bell-ringing" : ""} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3, width: 8, height: 8,
            borderRadius: '50%', background: '#ef4444',
            boxShadow: '0 0 8px #ef4444'
          }} />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {showPopover && (
            <>
              {/* Overlay to close popover when clicking outside */}
              <div onClick={() => setShowPopover(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 240, background: 'transparent' }} />
              
              <motion.div
                key="notification-popover"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                style={{
                  position: 'fixed', zIndex: 250,
                  background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                  borderRadius: 16, overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  display: 'flex', flexDirection: 'column',
                  maxHeight: 400,
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  ...(isMobile ? {
                    top: '70px', left: '50%', transform: 'translateX(-50%)',
                    width: 'calc(100vw - 32px)', maxWidth: '340px'
                  } : {
                    top: Math.max(10, Math.min(rect ? rect.top - 10 : 10, window.innerHeight - 420)),
                    left: rect ? rect.right + 12 : 280,
                    width: 320
                  })
                }}
              >
                {/* Popover Header */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bell size={13} style={{ color: '#818cf8' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{ padding: '1px 5px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} title="Mark all read" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                        <CheckSquare size={13} />
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={handleClearAll} title="Clear all" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Popover List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }} className="no-scrollbar">
                  {notifications.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) handleReadNotification(n.id)
                        }}
                        style={{
                          padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.02)',
                          cursor: n.is_read ? 'default' : 'pointer',
                          background: n.is_read ? 'transparent' : 'rgba(99,102,241,0.05)',
                          transition: 'background 0.2s', display: 'flex', gap: 8, alignItems: 'flex-start'
                        }}
                      >
                        {/* Unread indicator */}
                        {!n.is_read && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', flexShrink: 0, marginTop: 6 }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4, marginBottom: 2 }}>
                            <span style={{ fontSize: 12.5, fontWeight: n.is_read ? 600 : 700, color: 'var(--text-heading)' }}>{n.title}</span>
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: 11.5, color: 'var(--text-color)', lineHeight: 1.4, margin: 0 }}>{n.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}


/* ─────────────────────────────────────────────────
   SidebarInner — standalone component (no closures)
   ───────────────────────────────────────────────── */
function SidebarInner({
  collapsed, user, logout, isAuthenticated,
  theme, toggleTheme, navigate,
  setMobileOpen,
  isMobile, onStartTour,
}) {
  const isCollapsed = !isMobile && collapsed

  // ── Profile dropdown state — local per instance (desktop vs mobile) ──
  const [profileOpen, setProfileOpen] = useState(false)
  const [popupPos,    setPopupPos]    = useState({ bottom: 200, left: 10 })
  const menuRef       = useRef(null)
  const profileBtnRef = useRef(null)

  useEffect(() => {
    const handler = e => {
      // Only close if click is outside BOTH the dropdown AND the trigger button
      const inMenu = menuRef.current && menuRef.current.contains(e.target)
      const inBtn  = profileBtnRef.current && profileBtnRef.current.contains(e.target)
      if (!inMenu && !inBtn) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const profile   = user?.profile
  const rank      = profile?.dev_rank   || 'explorer'
  const xp        = profile?.total_xp   || 0
  const rankColor = RANK_COLOR[rank]    || '#94a3b8'
  const [rMin, rMax] = RANK_XP[rank]   || [0, 500]
  const rankPct = rMax > rMin ? Math.min(100, Math.round(((xp - rMin) / (rMax - rMin)) * 100)) : 100

  const SIDEBAR_W = collapsed ? 68 : 216   // must match aside width
  const POPUP_W   = isCollapsed ? 220 : SIDEBAR_W - 16  // 8px margin each side inside sidebar

  const handleProfileToggle = () => {
    if (!profileOpen && profileBtnRef.current) {
      const rect = profileBtnRef.current.getBoundingClientRect()
      const left = isCollapsed
        ? rect.right + 10                // to the right of collapsed icon bar
        : 8                              // 8px from left viewport edge (sidebar starts at 0)
      setPopupPos({ bottom: window.innerHeight - rect.top + 8, left })
    }
    setProfileOpen(p => !p)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setProfileOpen(false)
    setMobileOpen(false)
  }

  return (
    <div
      className="no-scrollbar"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: isCollapsed ? '20px 8px' : '20px 14px 20px 14px',
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehaviorY: 'contain',
      }}
    >
      {/* ── Brand ── */}
      <div style={{
        paddingBottom: 20,
        borderBottom: '1px solid var(--nav-border)',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        gap: 10,
      }}>
        <Link to="/" onClick={() => setMobileOpen(false)}
          data-tour="tour-logo"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}>
          <motion.div whileHover={{ scale: 1.08, rotate: 8 }}
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
            }}>
            <Zap size={16} color="#fff" strokeWidth={2.5} />
          </motion.div>
          {!isCollapsed && (
            <span className="gradient-text" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Nexora
            </span>
          )}
        </Link>
        {!isCollapsed && isAuthenticated && (
          <NotificationBell />
        )}
      </div>

      {/* If collapsed, show the bell button centered below the logo row */}
      {isCollapsed && isAuthenticated && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <NotificationBell />
        </div>
      )}

      {/* ── Ctrl+K Search Trigger ── */}
      <button
        onClick={() => {
          const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
          window.dispatchEvent(e)
        }}
        title="Quick navigation (Ctrl+K)"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          margin: '0 0 8px', padding: isCollapsed ? '8px' : '8px 12px',
          borderRadius: 10, border: '1px solid var(--glass-border)',
          background: 'rgba(99,102,241,0.06)', cursor: 'pointer',
          color: 'var(--text-muted)', width: '100%',
          transition: 'all 0.2s ease',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor = 'var(--glass-border)' }}
      >
        <Search size={15} style={{ flexShrink: 0, color: '#818cf8' }} />
        {!isCollapsed && (
          <>
            <span style={{ fontSize: 12, flex: 1, textAlign: 'left', color: 'var(--text-muted)' }}>Quick search...</span>
            <kbd style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.7 }}>Ctrl+K</kbd>
          </>
        )}
      </button>

      {/* ── Nav Links ── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV_LINKS.map(({ to, label, Icon, tourId }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
            data-tour={tourId}
            title={isCollapsed ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '11px 10px' : '9px 12px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              color: isActive ? 'var(--nav-text-active)' : 'var(--nav-text-inactive)',
              background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
              border: '1px solid transparent',
              position: 'relative',
              overflow: 'hidden',
            })}>
            {/* Active left indicator bar */}
            <span className="nav-active-bar" style={{
              position: 'absolute',
              left: 0, top: '20%', bottom: '20%',
              width: 3,
              borderRadius: '0 3px 3px 0',
              background: 'transparent',
              transition: 'background 0.2s',
            }} />
            <Icon size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom Section ── */}
      <div style={{ marginTop: 20, borderTop: '1px solid var(--nav-border)', paddingTop: 20 }}>

        {/* Theme toggle */}
        {isCollapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              style={{
                width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                color: 'var(--text-color)', outline: 'none',
              }}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        ) : (
          <div onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 10, background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)', marginBottom: 12,
              cursor: 'pointer',
            }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', userSelect: 'none' }}>
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div
              style={{
                width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--scrollbar-track)',
                color: 'var(--text-color)', pointerEvents: 'none',
              }}>
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </div>
          </div>
        )}


        {/* Auth section */}
        {isAuthenticated ? (
          <div style={{ position: 'relative' }}>

            {/* XP bar */}
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12, padding: '0 2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: rankColor, textTransform: 'capitalize' }}>{rank}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8' }}>{xp.toLocaleString()} XP</span>
                </div>
                <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(99,102,241,0.12)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${rankPct}%` }} transition={{ duration: 1.2 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 2 }} />
                </div>
              </div>
            )}

            {/* Profile dropdown — portal so it escapes overflowX:hidden */}
            {profileOpen && createPortal(
              <motion.div
                ref={menuRef}
                key="profile-popup"
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{
                  position: 'fixed',
                  bottom: popupPos.bottom,
                  left: popupPos.left,
                  width: POPUP_W,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
                  background: 'var(--card-bg)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid var(--card-border)',
                  zIndex: 9999,
                }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.full_name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </p>
                </div>
                {[
                  { icon: User,   label: 'My Profile', to: '/profile' },
                  { icon: Trophy, label: 'Progress',   to: '/progress' },
                ].map(item => (
                  <button key={item.label}
                    onClick={() => { navigate(item.to); setProfileOpen(false); setMobileOpen(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: 13, color: 'var(--text-color)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <item.icon size={14} style={{ color: 'var(--text-muted)' }} />
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => { setProfileOpen(false); onStartTour?.() }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: 13, color: 'var(--text-color)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                  Take a Tour
                </button>
                <div style={{ borderTop: '1px solid var(--card-border)' }}>
                  <button onClick={handleLogout}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: 13, color: '#fb7185', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,113,133,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </motion.div>,
              document.body
            )}


            {/* Profile trigger */}
            <button
              ref={profileBtnRef}
              onClick={handleProfileToggle}
              style={{
                display: 'flex', width: '100%', alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '8px' : '8px 12px',
                borderRadius: 10, cursor: 'pointer',
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(16px)', outline: 'none',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Avatar src={profile?.avatar} name={user?.full_name} rank={rank} size="sm" />
                {!isCollapsed && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.full_name?.split(' ')[0] || 'User'}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown size={13} style={{
                  color: 'var(--text-muted)', flexShrink: 0,
                  transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }} />
              )}
            </button>
          </div>
        ) : (
          /* Not authenticated */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isCollapsed ? (
              <Link to="/login" onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', justifyContent: 'center', padding: '10px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-color)' }}>
                <User size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  style={{ display: 'block', textAlign: 'center', padding: '10px', fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'none', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-heading)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--glass-border)' }}>
                  Sign In
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}
                  style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)', textDecoration: 'none' }}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────
   Sidebar — main export
───────────────────────────────────────────────── */
export default function Sidebar({ collapsed, onToggleCollapse, onHoverChange, onStartTour }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isHovered,  setIsHovered]  = useState(false)
  const { user, logout, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  // profileOpen/setProfileOpen moved into SidebarInner (per-instance)


  const handleMouseEnter = () => {
    setIsHovered(true)
    onHoverChange?.(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onHoverChange?.(false)
  }

  const sharedProps = {
    collapsed: collapsed, user, logout, isAuthenticated,
    theme, toggleTheme, navigate,
    setMobileOpen,
    onStartTour,
  }

  return (
    <>
      {/* ══════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════ */}
      <aside
        style={{
          width: collapsed ? 68 : 216,
          height: '100vh',
          position: 'fixed',
          left: 0, top: 0, bottom: 0,
          zIndex: 100,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--nav-border)',
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'visible',
        }} className="desktop-sidebar">
        <SidebarInner {...sharedProps} isMobile={false} />
      </aside>

      {/* ── Collapse Toggle Tab (always visible on desktop) ── */}
      <button
        onClick={onToggleCollapse}
        className="sidebar-collapse-tab"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'fixed',
          top: '50%',
          left: collapsed ? 68 : 216,
          transform: 'translateY(-50%)',
          zIndex: 200,
          width: 20,
          height: 48,
          borderRadius: '0 8px 8px 0',
          background: 'var(--nav-bg)',
          border: '1px solid var(--nav-border)',
          borderLeft: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          outline: 'none',
          transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s, color 0.2s',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(99,102,241,0.15)'
          e.currentTarget.style.color = '#818cf8'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--nav-bg)'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* ══════════════════════════════════════
          MOBILE TOP HEADER
      ══════════════════════════════════════ */}
      <header className="mobile-header" style={{
        display: 'none',
        height: 60,
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 90,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--nav-border)',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Zap size={14} color="#fff" />
          </div>
          <span className="gradient-text" style={{ fontSize: 18, fontWeight: 800 }}>Nexora</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTheme}
            style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-color)', outline: 'none' }}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => setMobileOpen(o => !o)}
            style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-color)', outline: 'none' }}>
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════
          MOBILE DRAWER SIDEBAR
      ══════════════════════════════════════ */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: 280,
        zIndex: 200,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--nav-border)',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }} className="mobile-drawer">
        <SidebarInner {...sharedProps} isMobile={true} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      )}

      {/* Responsive rules */}
      <style>{`
        @media (min-width: 901px) {
          .mobile-header  { display: none   !important; }
          .mobile-drawer  { display: block  !important; transform: translateX(-100%) !important; }
          .desktop-sidebar { display: flex  !important; }
          .sidebar-collapse-tab { display: flex !important; }
        }
        @media (max-width: 900px) {
          .desktop-sidebar { display: none  !important; }
          .sidebar-collapse-tab { display: none !important; }
          .mobile-header   { display: flex  !important; }
        }
        @keyframes ring {
          0% { transform: rotate(0); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-15deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-10deg); }
          50% { transform: rotate(5deg); }
          60% { transform: rotate(-5deg); }
          100% { transform: rotate(0); }
        }
        .bell-ringing {
          animation: ring 1.5s ease infinite;
        }
      `}</style>
    </>
  )
}
