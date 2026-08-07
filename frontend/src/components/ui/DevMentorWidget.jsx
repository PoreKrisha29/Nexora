import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BrainCircuit, X, Maximize2, Send, Bot, User, Sparkles, Mic, MicOff,
  Volume2, VolumeX, Loader2, Plus, MessageSquare, ChevronDown
} from 'lucide-react'
import { mentorService } from '@/services/mentorService'
import { useAuth } from '@/context/AuthContext'

const PERSONAS = {
  advisor: {
    id: 'advisor',
    name: 'AI Career Advisor',
    icon: '🧭',
    accent: '#06b6d4',
    desc: 'Career guidance, target roles & roadmap advice.',
    welcome: 'Hello! I am your AI Career Advisor. Ask me anything about tech career paths, interview prep, or your study plan.',
    seedPrompts: [
      "Review my progress and recommend next steps.",
      "What skills do Big Tech companies look for?",
      "How to target Meta in 3 months?"
    ]
  },
  design: {
    id: 'design',
    name: 'System Design Critic',
    icon: '⚙️',
    accent: '#fbbf24',
    desc: 'Architecture, microservices & scalability.',
    welcome: 'Welcome to System Design. Share an architecture blueprint or scaling problem to critique.',
    seedPrompts: [
      "PostgreSQL vs DynamoDB for real-time chat?",
      "Explain consistent hashing partition mapping.",
      "How to design a scalable notification system?"
    ]
  },
  coder: {
    id: 'coder',
    name: 'Algorithms & DSA Coach',
    icon: '💻',
    accent: '#818cf8',
    desc: 'Data structures, algorithms & optimization.',
    welcome: 'Algorithm coach ready! Share a coding problem or complexity bottleneck to optimize.',
    seedPrompts: [
      "Compare Mergesort vs Quicksort complexity.",
      "Explain the sliding window pattern.",
      "Optimize a recursive DFS function."
    ]
  },
  star: {
    id: 'star',
    name: 'STAR Behavioral Coach',
    icon: '🤝',
    accent: '#ec4899',
    desc: 'Leadership stories & behavioral questions.',
    welcome: 'Behavioral prep session active. Share your project story to format using STAR.',
    seedPrompts: [
      "Audit: 'Conflict with a tech lead'",
      "How to highlight leadership as a junior?",
      "Draft a STAR story for fixing a prod bug."
    ]
  },
  resume: {
    id: 'resume',
    name: 'Resume ATS Auditor',
    icon: '📄',
    accent: '#10b981',
    desc: 'Resume bullets & ATS keyword optimization.',
    welcome: 'Resume audit active. Paste experience bullets to scan against ATS filters.',
    seedPrompts: [
      "How to rephrase bullets to show business outcomes?",
      "Keywords to pass Google ATS filters?",
      "Critique my experience bullet points."
    ]
  }
}

export default function DevMentorWidget() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const [assistantRole, setAssistantRole] = useState('advisor')
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)
  const [showPersonaMenu, setShowPersonaMenu] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  // Web Speech Recognition Init
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript
        setInput(prev => prev ? `${prev} ${transcript}` : transcript)
      }
      recognition.onerror = () => setIsListening(false)
      recognitionRef.current = recognition
    }
  }, [])

  // Auto-fetch conversations when widget opens
  useEffect(() => {
    if (isOpen && isAuthenticated && conversations.length === 0) {
      setLoading(true)
      mentorService.getConversations()
        .then(r => {
          const convs = r.data.results || r.data
          setConversations(convs)
          if (convs.length > 0) {
            loadConversation(convs[0].id)
          } else {
            createNewConversation()
          }
        })
        .catch(() => setLoading(false))
    }
  }, [isOpen, isAuthenticated])

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, typing, isOpen])

  // Stop speech when closing widget or switching route
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [isOpen, location.pathname])

  const loadConversation = async (id) => {
    setActiveConvId(id)
    setLoading(true)
    try {
      const { data } = await mentorService.getConversation(id)
      setMessages(data.messages || [])
    } catch {}
    finally {
      setLoading(false)
    }
  }

  const createNewConversation = async () => {
    setLoading(true)
    try {
      const { data } = await mentorService.createConversation({ title: 'New Consultation' })
      setConversations(prev => [data, ...prev])
      setActiveConvId(data.id)
      setMessages([])
    } catch {}
    finally {
      setLoading(false)
    }
  }

  const cleanTextForSpeech = (text) => {
    if (!text) return ''
    let clean = text.replace(/\*\*|__|\*|_/g, '')
    clean = clean.replace(/#+\s+/g, '')
    clean = clean.replace(/```[\s\S]*?```/g, '')
    clean = clean.replace(/`([^`]+)`/g, '$1')
    clean = clean.replace(/^\s*[\-\*\+]\s+/gm, '')
    return clean
  }

  const speakMessage = (msg) => {
    if (!window.speechSynthesis) return
    if (speakingId === msg.id) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }
    window.speechSynthesis.cancel()
    setTimeout(() => {
      const cleanedText = cleanTextForSpeech(msg.content)
      const utterance = new SpeechSynthesisUtterance(cleanedText)
      utterance.onend = () => setSpeakingId(null)
      utterance.onerror = () => setSpeakingId(null)
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')))
      if (preferredVoice) utterance.voice = preferredVoice
      setSpeakingId(msg.id)
      window.speechSynthesis.speak(utterance)
    }, 50)
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }
    if (isListening) {
      recognitionRef.current.abort()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const sendMessage = async (textToSend) => {
    const content = textToSend || input.trim()
    if (!content) return

    if (isListening && recognitionRef.current) {
      recognitionRef.current.abort()
      setIsListening(false)
    }

    let targetConvId = activeConvId
    if (!targetConvId) {
      try {
        const { data } = await mentorService.createConversation({ title: content.slice(0, 40) })
        setConversations(prev => [data, ...prev])
        targetConvId = data.id
        setActiveConvId(data.id)
      } catch {
        return
      }
    }

    setInput('')
    const userMsg = { id: Date.now(), role: 'user', content, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)

    try {
      const { data } = await mentorService.sendMessage(targetConvId, { message: content })
      setMessages(prev => [...prev, data.ai_message])
      setConversations(prev => prev.map(c =>
        c.id === targetConvId ? { ...c, title: content.slice(0, 40), last_message: data.ai_message.content.slice(0, 60) } : c
      ))
      speakMessage(data.ai_message)
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again.",
        created_at: new Date().toISOString()
      }])
    } finally {
      setTyping(false)
    }
  }

  const currentPersona = PERSONAS[assistantRole] || PERSONAS.advisor

  // Don't render on /mentor page if already open full screen (optional, or render floating anyway)
  // We can let floating button be accessible from everywhere
  if (!isAuthenticated) return null

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, fontFamily: 'inherit' }}>
      <AnimatePresence>
        {/* Floating Chat Widget Window */}
        {isOpen && (
          <motion.div
            key="dev-mentor-widget"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'absolute',
              bottom: 68,
              right: 0,
              width: '420px',
              maxWidth: 'calc(100vw - 32px)',
              height: '580px',
              maxHeight: 'calc(100vh - 110px)',
              background: 'var(--card-bg)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--card-border)',
              borderRadius: 20,
              boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 40px rgba(99,102,241,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              background: `linear-gradient(135deg, ${currentPersona.accent}15, rgba(99,102,241,0.08))`,
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                }}>
                  <BrainCircuit size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>
                      Dev Mentor
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 800, background: `${currentPersona.accent}20`, color: currentPersona.accent, border: `1px solid ${currentPersona.accent}40`, padding: '1px 6px', borderRadius: 10, textTransform: 'uppercase' }}>
                      AI Copilot
                    </span>
                  </div>
                  {/* Persona Selector Dropdown Trigger */}
                  <button
                    onClick={() => setShowPersonaMenu(p => !p)}
                    style={{
                      background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600
                    }}
                  >
                    <span>{currentPersona.icon} {currentPersona.name}</span>
                    <ChevronDown size={12} style={{ transform: showPersonaMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={createNewConversation}
                  title="New Conversation"
                  style={{
                    width: 30, height: 30, borderRadius: 8, background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <Plus size={15} />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    navigate('/mentor')
                  }}
                  title="Expand to Full Page"
                  style={{
                    width: 30, height: 30, borderRadius: 8, background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  style={{
                    width: 30, height: 30, borderRadius: 8, background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Persona Selector Dropdown Menu */}
              <AnimatePresence>
                {showPersonaMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      position: 'absolute', top: '100%', left: 12, right: 12, zIndex: 10,
                      background: 'var(--card-bg)', backdropFilter: 'blur(20px)',
                      border: '1px solid var(--card-border)', borderRadius: 14,
                      padding: 6, boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                      display: 'flex', flexDirection: 'column', gap: 4
                    }}
                  >
                    {Object.values(PERSONAS).map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setAssistantRole(p.id)
                          setShowPersonaMenu(false)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                          borderRadius: 8, border: 'none', background: assistantRole === p.id ? `${p.accent}15` : 'transparent',
                          color: assistantRole === p.id ? 'var(--text-heading)' : 'var(--text-color)',
                          cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: 700
                        }}
                      >
                        <span>{p.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div>{p.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{p.desc}</div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Persona Quick Chips */}
            <div style={{
              display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px',
              borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.02)'
            }} className="no-scrollbar">
              {Object.values(PERSONAS).map(p => {
                const sel = assistantRole === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setAssistantRole(p.id)}
                    style={{
                      flexShrink: 0, padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', outline: 'none',
                      background: sel ? p.accent : 'var(--glass-bg)',
                      color: sel ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${sel ? p.accent : 'var(--glass-border)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    {p.icon} {p.name.split(' ')[0]}
                  </button>
                )
              })}
            </div>

            {/* Messages Stream Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }} className="no-scrollbar">
              {loading && messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Loader2 className="spinning" size={28} style={{ color: '#818cf8' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Initializing Dev Mentor…</span>
                </div>
              ) : messages.length === 0 ? (
                /* Welcome Screen with Seed Prompts */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
                  <div style={{
                    background: `${currentPersona.accent}08`, border: `1px solid ${currentPersona.accent}25`,
                    borderRadius: 14, padding: 14
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{currentPersona.icon}</span>
                      <strong style={{ fontSize: 13, color: 'var(--text-heading)' }}>{currentPersona.name}</strong>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-color)', lineHeight: 1.5, margin: 0 }}>
                      {currentPersona.welcome}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Suggested Starter Inquiries
                    </span>
                    {currentPersona.seedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(prompt)}
                        style={{
                          textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                          color: 'var(--text-color)', fontSize: 12, cursor: 'pointer',
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = currentPersona.accent
                          e.currentTarget.style.background = `${currentPersona.accent}08`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--glass-border)'
                          e.currentTarget.style.background = 'var(--glass-bg)'
                        }}
                      >
                        <Sparkles size={12} style={{ color: currentPersona.accent, flexShrink: 0 }} />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                messages.map(msg => {
                  const isUser = msg.role === 'user'
                  const isSpeaking = speakingId === msg.id
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isUser ? 'rgba(99,102,241,0.18)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        border: isUser ? '1px solid rgba(99,102,241,0.3)' : 'none',
                        color: isUser ? '#818cf8' : '#fff'
                      }}>
                        {isUser ? <User size={12} /> : <Bot size={12} />}
                      </div>
                      <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                          borderTopRightRadius: isUser ? 2 : 12, borderTopLeftRadius: isUser ? 12 : 2,
                          background: isUser ? 'rgba(99,102,241,0.15)' : 'var(--card-bg)',
                          border: isUser ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--card-border)',
                          color: 'var(--text-color)'
                        }}>
                          {msg.content}
                        </div>
                        {!isUser && (
                          <button
                            onClick={() => speakMessage(msg)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                              color: isSpeaking ? '#818cf8' : 'var(--text-muted)', display: 'flex', alignItems: 'center'
                            }}
                          >
                            <Volume2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Typing indicator */}
              {typing && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Bot size={12} />
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: 12, background: 'var(--card-bg)', border: '1px solid var(--card-border)', display: 'flex', gap: 4 }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.03)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)', borderRadius: 12, padding: '4px 8px'
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={`Ask ${currentPersona.name}…`}
                  rows={1}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-color)', fontSize: 12.5, resize: 'none', padding: '6px 4px',
                    fontFamily: 'inherit', maxHeight: 80
                  }}
                />

                {/* Voice Record Toggle */}
                <button
                  onClick={toggleListening}
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: isListening ? '#ef4444' : 'transparent',
                    color: isListening ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title={isListening ? "Listening…" : "Voice Audio Search"}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                </button>

                {/* Send Button */}
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || typing}
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: input.trim() && !typing ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--glass-border)',
                    color: '#fff', opacity: input.trim() && !typing ? 1 : 0.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                  }}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom-Right Launcher Icon Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
          border: '2px solid rgba(255,255,255,0.25)',
          boxShadow: '0 8px 24px rgba(99,102,241,0.45), 0 0 20px rgba(139,92,246,0.3)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
          position: 'relative'
        }}
        title="AI Dev Mentor (Available on every page)"
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <>
            <BrainCircuit size={24} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            {/* Glowing Pulse Ring */}
            <span style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              border: '2px solid rgba(139,92,241,0.6)',
              animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              pointerEvents: 'none'
            }} />
          </>
        )}
      </motion.button>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
