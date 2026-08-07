import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/layout/Sidebar'
import LandingNavbar from '@/components/layout/LandingNavbar'
import Footer from '@/components/layout/Footer'
import GuidedTour from '@/components/ui/GuidedTour'

// Pages
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ChallengesPage from '@/pages/ChallengesPage'
import ChallengeDetailPage from '@/pages/ChallengeDetailPage'
import InterviewLabPage from '@/pages/InterviewLabPage'
import InterviewSessionPage from '@/pages/InterviewSessionPage'
import DevMentorPage from '@/pages/DevMentorPage'
import ShowcasePage from '@/pages/ShowcasePage'
import ProgressPage from '@/pages/ProgressPage'
import ProfilePage from '@/pages/ProfilePage'
import RoadmapPage from '@/pages/RoadmapPage'
import RoadmapLearnPage from '@/pages/RoadmapLearnPage'
import CodeReviewPage from '@/pages/CodeReviewPage'
import PeerCodeReviewPage from '@/pages/PeerCodeReviewPage'
import ResumePage from '@/pages/ResumePage'
import CodeArenaPage from '@/pages/CodeArenaPage'
import FundamentalsPage from '@/pages/FundamentalsPage'
import RevisionPage from '@/pages/RevisionPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PrivacyPage from '@/pages/PrivacyPage'
import TermsPage from '@/pages/TermsPage'
import AboutPage from '@/pages/AboutPage'
import ContactPage from '@/pages/ContactPage'
import CommandPalette from '@/components/ui/CommandPalette'
import DevMentorWidget from '@/components/ui/DevMentorWidget'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  if (!isAuthenticated) {
    sessionStorage.setItem('nexora_redirect_after_login', location.pathname + location.search)
    return <Navigate to="/login" replace />
  }
  return children
}

// Redirects guests to the landing page spotlight section instead of showing the app page
function GuestGuard({ children, hash }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  return isAuthenticated ? children : <Navigate to={`/#${hash}`} replace />
}

const VALID_ROUTES = [
  '/', '/login', '/register', '/challenges', '/arena', '/fundamentals', '/interview', '/showcase', '/mentor', '/progress', '/profile', '/roadmap', '/codereview', '/peer-review', '/resume', '/privacy', '/terms', '/about', '/contact', '/revision'
]

const isRouteValid = (pathname) => {
  if (VALID_ROUTES.includes(pathname)) return true
  if (pathname.startsWith('/challenges/')) return true
  if (pathname.startsWith('/interview/')) return true
  if (pathname.startsWith('/roadmap/learn/')) return true
  if (pathname.startsWith('/peer-review')) return true
  return false
}

function AppRoutes() {
  const location = useLocation()

  // Public marketing & info pages → top navbar (no sidebar)
  const isPublicPage = ['/', '/about', '/privacy', '/terms', '/contact'].includes(location.pathname)
  // Auth pages → no nav at all
  const isAuth       = location.pathname === '/login' || location.pathname === '/register'
  // 404 Page → no sidebar
  const is404        = !isRouteValid(location.pathname)

  // Sidebar visible ONLY on internal app dashboard pages
  const showSidebar  = !isPublicPage && !isAuth && !is404

  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('nexora_sidebar_collapsed') === 'true'
  )
  // Suppress transition on initial mount to prevent layout flash
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('nexora_sidebar_collapsed', String(next))
      return next
    })
  }

  useEffect(() => {
    const handleSidebarEvent = (e) => {
      if (typeof e.detail?.collapsed === 'boolean') {
        setCollapsed(e.detail.collapsed)
      }
    }
    window.addEventListener('nexora_sidebar_collapse', handleSidebarEvent)
    return () => window.removeEventListener('nexora_sidebar_collapse', handleSidebarEvent)
  }, [])

  const { isAuthenticated } = useAuth()

  const sidebarW = collapsed ? 68 : 216

  // ── Guided Tour state ──
  const [tourActive, setTourActive] = useState(false)
  const [tourCollapsedBackup, setTourCollapsedBackup] = useState(null)

  // Auto-show tour for first-time users (only when sidebar is visible = authenticated)
  useEffect(() => {
    if (showSidebar && isAuthenticated && !localStorage.getItem('nexora_tour_done')) {
      sessionStorage.setItem('nexora_is_first_time_onboarding', 'true')
      const t = setTimeout(() => setTourActive(true), 800)
      return () => clearTimeout(t)
    }
  }, [showSidebar, isAuthenticated])

  const handleStartTour = () => {
    setTourActive(true)
  }

  const handleTourForceExpand = () => {
    if (collapsed) {
      setTourCollapsedBackup(true)
      setCollapsed(false)
    }
  }

  const handleTourClose = () => {
    setTourActive(false)
    // Restore original collapsed state
    if (tourCollapsedBackup) {
      setCollapsed(true)
      localStorage.setItem('nexora_sidebar_collapsed', 'true')
      setTourCollapsedBackup(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Global Command Palette — Ctrl+K */}
      <CommandPalette />
      {/* ── Floating Dev Mentor Bottom-Right Widget ── */}
      <DevMentorWidget />
      {/* ── Layout layer ── */}
      {isPublicPage && <LandingNavbar />}
      {showSidebar  && (
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onHoverChange={setSidebarHovered}
          onStartTour={handleStartTour}
        />
      )}

      {/* ── Main content ── */}
      <main style={{
        marginLeft: showSidebar ? `${sidebarW}px` : '0px',
        paddingTop: isPublicPage ? '68px' : '0px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: mounted ? 'margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
      }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"                   element={<LandingPage />} />
            <Route path="/login"              element={<LoginPage />} />
            <Route path="/register"           element={<RegisterPage />} />
            <Route path="/challenges"         element={<GuestGuard hash="challenges"><ChallengesPage /></GuestGuard>} />
            <Route path="/challenges/:id"     element={<GuestGuard hash="challenges"><ChallengeDetailPage /></GuestGuard>} />
            <Route path="/arena"              element={<ProtectedRoute><CodeArenaPage /></ProtectedRoute>} />
            <Route path="/fundamentals"       element={<Navigate to="/arena?mode=fundamentals" replace />} />
            <Route path="/interview"          element={<GuestGuard hash="interview"><InterviewLabPage /></GuestGuard>} />
            <Route path="/showcase"           element={<GuestGuard hash="showcase"><ShowcasePage /></GuestGuard>} />
            <Route path="/interview/:sessionId" element={
              <ProtectedRoute><InterviewSessionPage /></ProtectedRoute>
            } />
            <Route path="/mentor"   element={<GuestGuard hash="mentor"><DevMentorPage /></GuestGuard>} />
            <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/profile"  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/roadmap"  element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
            <Route path="/roadmap/learn/:taskId" element={
              <ProtectedRoute><RoadmapLearnPage /></ProtectedRoute>
            } />
            <Route path="/codereview" element={<ProtectedRoute><CodeReviewPage /></ProtectedRoute>} />
            <Route path="/peer-review" element={<ProtectedRoute><PeerCodeReviewPage /></ProtectedRoute>} />
            <Route path="/resume"     element={<ProtectedRoute><ResumePage /></ProtectedRoute>} />
            <Route path="/revision"   element={<ProtectedRoute><RevisionPage /></ProtectedRoute>} />
            <Route path="/privacy"            element={<PrivacyPage />} />
            <Route path="/terms"              element={<TermsPage />} />
            <Route path="/about"              element={<AboutPage />} />
            <Route path="/contact"            element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AnimatePresence>

        {/* Footer on all non-auth pages */}
        {!isAuth && <Footer />}
      </main>

      {/* Guided Tour — first-time user onboarding */}
      <GuidedTour
        isActive={tourActive && showSidebar}
        onClose={handleTourClose}
        onForceExpand={handleTourForceExpand}
      />

      {/* Mobile responsive: shift main content up when mobile header shows */}
      <style>{`
        @media (max-width: 900px) {
          main {
            margin-left: 0 !important;
            padding-top: ${showSidebar ? '60px' : isPublicPage ? '68px' : '0'} !important;
          }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
