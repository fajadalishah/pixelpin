'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  MapPin,
  Upload,
  MessageSquare,
  Moon,
  Link as LinkIcon,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Shield,
  Building2,
  Users,
  FolderKanban,
  Lock,
  Plus,
  CheckCircle2,
  Trash2,
  Settings,
  HardDrive,
  Files,
  ArrowUpRight,
  Sun,
  Camera,
  Layers,
  Sparkle,
  Check,
  HelpCircle,
  ChevronDown
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Navbar } from '@/components/Navbar'


interface DemoPin {
  id: string
  x: number
  y: number
  author: string
  text: string
  color: string
}

export default function LandingPageClient() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)
  
  // Interactive Hero Mockup state
  const [pins, setPins] = useState<DemoPin[]>([
    { id: '1', x: 28, y: 35, author: 'Fajad Shah', text: 'Let\'s change this background to a darker gradient.', color: 'bg-primary' },
    { id: '2', x: 72, y: 48, author: 'Sarah (Admin)', text: 'Awesome layout! Can we make this button rounded?', color: 'bg-accent' },
    { id: '3', x: 48, y: 72, author: 'Alex (Reviewer)', text: 'Love the typography here. Looking sharp!', color: 'bg-success' }
  ])
  const [activePinId, setActivePinId] = useState<string | null>(null)
  const [clickCoords, setClickCoords] = useState<{ x: number; y: number } | null>(null)
  const [newCommentAuthor, setNewCommentAuthor] = useState('')
  const [newCommentText, setNewCommentText] = useState('')
  const boardRef = useRef<HTMLDivElement>(null)

  // Demo features tab state
  const [activeDemoTab, setActiveDemoTab] = useState<'annotations' | 'roles' | 'branding'>('annotations')
  
  // Demo Role state
  const [demoRole, setDemoRole] = useState<'Owner' | 'Admin' | 'Collaborator' | 'Reviewer'>('Collaborator')
  
  // Demo Brand color state
  const [demoBrandColor, setDemoBrandColor] = useState('#6366f1')
  const brandColors = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Violet', hex: '#a855f7' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Crimson', hex: '#f43f5e' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Ocean', hex: '#0ea5e9' }
  ]

  // Demo Drawing annotations state
  const [hoveredShapeIndex, setHoveredShapeIndex] = useState<number | null>(null)

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  // Handle board clicking to place a pin
  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1))
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1))
    
    setClickCoords({ x, y })
    setActivePinId(null)
  }

  // Handle adding a mock comment
  const handleAddMockComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clickCoords || !newCommentText.trim()) return

    const newPin: DemoPin = {
      id: Math.random().toString(),
      x: clickCoords.x,
      y: clickCoords.y,
      author: newCommentAuthor.trim() || 'Guest Reviewer',
      text: newCommentText.trim(),
      color: 'bg-primary'
    }

    setPins([...pins, newPin])
    setActivePinId(newPin.id)
    setClickCoords(null)
    setNewCommentText('')
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-0 left-1/4 w-[45rem] h-[45rem] bg-gradient-to-tr from-primary/10 to-accent/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4 -z-10" />
        <div className="absolute top-1/2 right-1/4 w-[35rem] h-[35rem] bg-gradient-to-br from-accent/10 to-emerald-500/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-5 space-y-8 text-center lg:text-left animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Direct Visual Collaboration
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight text-foreground">
              Collect feedback,
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-purple-500 bg-clip-text text-transparent">
                exactly where it belongs.
              </span>
            </h1>
            
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold">
              Skip the email chains and confusing slack updates. Upload design boards, share a link, and let team members or guest clients pin comments directly on the design.
            </p>
            
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-7 py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-2xl hover:opacity-95 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/15 transition-all shadow-lg shadow-primary/20"
              >
                Start Collaborating Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#interactive-demo"
                className="inline-flex items-center gap-2 px-6 py-4 border border-border bg-card/40 backdrop-blur-md text-foreground font-bold rounded-2xl hover:bg-muted hover:scale-102 transition-all shadow-sm"
              >
                Try Interactive Demo
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60 max-w-md mx-auto lg:mx-0 text-left">
              <div>
                <p className="text-xl md:text-2xl font-black text-foreground">10x</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Review Speed</p>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-black text-foreground">Zero</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Accounts Needed</p>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-black text-foreground">100%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contextual</p>
              </div>
            </div>
          </div>

          {/* Interactive Hero Canvas Demonstration */}
          <div id="interactive-demo" className="lg:col-span-7 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="text-center lg:text-left mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md">Live Interactive Canvas</span>
              <p className="text-xs text-muted-foreground mt-1.5 font-bold">Click anywhere on the dashboard image below to drop a pin and leave a comment!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 glass p-4 rounded-3xl shadow-2xl relative overflow-hidden bg-card/65">
              
              {/* Canvas Area */}
              <div className="md:col-span-8 flex flex-col items-center">
                <div 
                  ref={boardRef}
                  onClick={handleBoardClick}
                  className="relative w-full aspect-[4/3] rounded-2xl border border-border overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 cursor-crosshair shadow-inner"
                >
                  {/* Grid background */}
                  <div className="absolute inset-0 opacity-15" style={{
                    backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                  }} />

                  {/* Simulated web app elements */}
                  <div className="absolute inset-x-0 top-0 h-10 border-b border-border bg-card/70 backdrop-blur-md px-3 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="w-32 h-4 rounded bg-muted/60" />
                    <div className="w-6 h-6 rounded-full bg-primary/20" />
                  </div>

                  <div className="absolute top-14 left-6 right-6 h-20 bg-card/60 border border-border rounded-xl p-3 flex gap-3 shadow-sm">
                    <div className="w-10 h-10 bg-gradient-to-tr from-primary to-accent rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="w-24 h-4 bg-foreground/20 rounded" />
                      <div className="w-full h-3 bg-muted rounded" />
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
                    <div className="h-16 bg-card/45 border border-border rounded-xl p-3 space-y-2 shadow-sm">
                      <div className="w-12 h-3 bg-foreground/15 rounded" />
                      <div className="w-6 h-5 bg-primary/20 rounded" />
                    </div>
                    <div className="h-16 bg-card/45 border border-border rounded-xl p-3 space-y-2 shadow-sm">
                      <div className="w-12 h-3 bg-foreground/15 rounded" />
                      <div className="w-6 h-5 bg-accent/20 rounded" />
                    </div>
                    <div className="h-16 bg-card/45 border border-border rounded-xl p-3 space-y-2 shadow-sm">
                      <div className="w-12 h-3 bg-foreground/15 rounded" />
                      <div className="w-6 h-5 bg-success/20 rounded" />
                    </div>
                  </div>

                  {/* Existing Pins */}
                  {pins.map((pin) => (
                    <button
                      key={pin.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActivePinId(pin.id)
                        setClickCoords(null)
                      }}
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-xl border-2 border-card active:scale-95 transition-transform hover:scale-110 cursor-pointer ${pin.color} z-10`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </button>
                  ))}

                  {/* Temporary Placement Marker */}
                  {clickCoords && (
                    <div
                      style={{ left: `${clickCoords.x}%`, top: `${clickCoords.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white border-2 border-white shadow-2xl animate-bounce z-20"
                    >
                      <Plus className="h-4 w-4" />
                    </div>
                  )}

                  {/* Floating Add Comment Modal */}
                  {clickCoords && (
                    <form 
                      onSubmit={handleAddMockComment}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2 left-2 right-2 glass p-3 border border-border shadow-2xl z-30 space-y-2.5 animate-scale-in"
                    >
                      <p className="text-[10px] font-black uppercase text-primary tracking-wider">New Pin Comment</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Your name"
                          value={newCommentAuthor}
                          onChange={(e) => setNewCommentAuthor(e.target.value)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Type comment..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setClickCoords(null)}
                          className="px-2.5 py-1 rounded bg-secondary hover:bg-muted text-[10px] font-bold text-foreground cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded bg-primary text-white hover:opacity-90 text-[10px] font-bold cursor-pointer"
                        >
                          Add Pin
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Sidebar Comments Feed */}
              <div className="md:col-span-4 flex flex-col h-[280px] md:h-auto border-t md:border-t-0 md:border-l border-border/80 pt-3 md:pt-0 md:pl-4 overflow-hidden justify-between">
                <div className="space-y-1 select-none">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    Board Feedback
                  </p>
                  <p className="text-[9px] text-muted-foreground font-bold">Select a comment below to locate it on the canvas</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mt-3 mb-2 pr-1 scrollbar-thin">
                  {pins.map((pin) => (
                    <div
                      key={pin.id}
                      onClick={() => {
                        setActivePinId(pin.id)
                        setClickCoords(null)
                      }}
                      className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
                        activePinId === pin.id
                          ? 'border-primary bg-primary/5 shadow-sm scale-102'
                          : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-black text-foreground truncate">{pin.author}</span>
                        <span className="text-[9px] font-bold text-primary flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          Pin {pin.id}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate-2-lines leading-relaxed font-bold">{pin.text}</p>
                    </div>
                  ))}
                </div>

                {/* Highlighted text panel */}
                {activePinId && (() => {
                  const selectedPin = pins.find(p => p.id === activePinId)
                  if (!selectedPin) return null
                  return (
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-left animate-scale-in">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[9px] font-black uppercase text-primary">Active Detail</span>
                      </div>
                      <p className="text-[11px] text-foreground mt-1 font-bold italic">&ldquo;{selectedPin.text}&rdquo;</p>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience: For Whom is PixelPin? */}
      <section className="py-24 px-6 border-t border-border/30 bg-muted/5 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-xl">Who We Serve</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Built For Modern Design Workflows</h2>
            <p className="text-muted-foreground text-sm font-bold max-w-xl mx-auto">No matter your role or industry, PixelPin aligns clients, feedback, and designers onto a single visual surface.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
            {[
              {
                role: 'Design Agencies & Studios',
                benefit: 'Retain Premium Clients',
                desc: 'Present revisions in white-labeled client boards, completely branded with your agency colors, logos, and taglines.',
                bullet: 'Agency brand integration'
              },
              {
                role: 'Freelance Designers',
                benefit: 'Faster Project Approvals',
                desc: 'Send a quick public link. Clients drop comments immediately without going through registration or sign-ins.',
                bullet: 'Frictionless guest commenting'
              },
              {
                role: 'Product & Engineering Teams',
                benefit: 'Spot Visual Bugs Instantly',
                desc: 'Draw red rectangles or arrow vectors to point out UI bugs, broken code spacing, and formatting issues.',
                bullet: 'Advanced vector draw tools'
              },
              {
                role: 'Client Reviewers & Partners',
                benefit: 'Contextual Approvals',
                desc: 'Say goodbye to ambiguous descriptions. Click right on the image element to point out what needs to change.',
                bullet: 'Precision numeric coordinates'
              }
            ].map((target, idx) => (
              <div key={idx} className="glass p-6 bg-card rounded-3xl border border-border/60 hover:-translate-y-1 transition-all duration-300 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-accent tracking-wider bg-accent/10 px-2.5 py-0.5 rounded-md">{target.benefit}</span>
                  <h3 className="text-sm font-black text-foreground">{target.role}</h3>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{target.desc}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 text-xs font-black text-primary">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  {target.bullet}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Feature Demo Tabs Section */}
      <section className="py-24 px-6 border-y border-border/30 bg-muted/10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent -z-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-xl">Experience the App</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Explore Our Core Features
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto font-bold">
              Interact with the previews below to see how PixelPin enhances design reviews, manages client workspaces, and adopts your corporate brand.
            </p>

            {/* Feature Selector Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-6 select-none">
              <button
                onClick={() => setActiveDemoTab('annotations')}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-sm ${
                  activeDemoTab === 'annotations'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="h-4 w-4" />
                Annotation Canvas
              </button>
              <button
                onClick={() => setActiveDemoTab('roles')}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-sm ${
                  activeDemoTab === 'roles'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="h-4 w-4" />
                Workspace Role Demo (RBAC)
              </button>
              <button
                onClick={() => setActiveDemoTab('branding')}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-sm ${
                  activeDemoTab === 'branding'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Camera className="h-4 w-4" />
                White-label Branding
              </button>
            </div>
          </div>

          {/* Interactive Tabs Panels */}
          <div className="glass p-6 md:p-8 rounded-3xl shadow-xl min-h-[420px] flex items-center justify-center bg-card/60 backdrop-blur-xl border-border/60">
            
            {/* Panel 1: Annotations Canvas Demo */}
            {activeDemoTab === 'annotations' && (
              <div className="grid md:grid-cols-12 gap-8 items-center w-full animate-fade-in">
                <div className="md:col-span-5 space-y-5 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-foreground">Advanced Vector Annotations</h3>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                    Leave pixel-perfect markup. On Pro and Business tiers, you aren&apos;t just restricted to pins—draw vector boxes, clean circles, connecting lines, pointing arrows, or freehand sketches directly on your design to communicate layout changes.
                  </p>
                  <ul className="space-y-2 text-xs font-bold text-muted-foreground">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Multi-shape vector tools</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Precise shape overlay resizing</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Client comments sidebar tracking</li>
                  </ul>
                </div>
                
                {/* Visual Demo element */}
                <div className="md:col-span-7 relative border border-border rounded-2xl bg-muted/40 aspect-video overflow-hidden shadow-inner flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                  }} />
                  
                  {/* Canvas shapes list */}
                  <div className="relative w-full h-full p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between bg-card/80 border border-border rounded-xl px-4 py-2 text-[10px] font-bold text-muted-foreground backdrop-blur-md select-none w-fit">
                      Annotation Shapes Demo: Hover below
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-4/5 h-3/5 border-2 border-dashed border-border bg-card/20 rounded-xl flex items-center justify-center">
                        
                        {/* Shape 1: Box */}
                        <div 
                          onMouseEnter={() => setHoveredShapeIndex(0)}
                          onMouseLeave={() => setHoveredShapeIndex(null)}
                          className={`absolute top-4 left-6 h-12 w-24 border-2 rounded-md cursor-pointer transition-all duration-300 flex items-center justify-center ${
                            hoveredShapeIndex === 0 ? 'border-primary bg-primary/10 scale-105 shadow-md shadow-primary/10' : 'border-border/60'
                          }`}
                        >
                          <span className="text-[9px] font-black text-muted-foreground">Rectangle</span>
                        </div>

                        {/* Shape 2: Circle */}
                        <div 
                          onMouseEnter={() => setHoveredShapeIndex(1)}
                          onMouseLeave={() => setHoveredShapeIndex(null)}
                          className={`absolute bottom-4 left-10 h-16 w-16 border-2 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center ${
                            hoveredShapeIndex === 1 ? 'border-accent bg-accent/10 scale-105 shadow-md shadow-accent/10' : 'border-border/60'
                          }`}
                        >
                          <span className="text-[9px] font-black text-muted-foreground">Circle</span>
                        </div>

                        {/* Shape 3: Arrow */}
                        <div 
                          onMouseEnter={() => setHoveredShapeIndex(2)}
                          onMouseLeave={() => setHoveredShapeIndex(null)}
                          className={`absolute top-4 right-10 flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 ${
                            hoveredShapeIndex === 2 ? 'scale-105 text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          <svg className="w-16 h-12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <line x1="2" y1="22" x2="22" y2="2" />
                            <polyline points="14 2 22 2 22 10" />
                          </svg>
                          <span className="text-[9px] font-black">Vector Arrow</span>
                        </div>

                        {/* Shape 4: Pin */}
                        <div 
                          onMouseEnter={() => setHoveredShapeIndex(3)}
                          onMouseLeave={() => setHoveredShapeIndex(null)}
                          className={`absolute bottom-4 right-12 flex h-8 w-8 items-center justify-center rounded-full text-white cursor-pointer transition-all duration-300 ${
                            hoveredShapeIndex === 3 ? 'bg-success scale-110 shadow-lg shadow-success/25' : 'bg-primary'
                          }`}
                        >
                          <MapPin className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    {/* Descriptive caption */}
                    <div className="text-right">
                      {hoveredShapeIndex === 0 && <span className="text-[10px] text-primary font-black animate-fade-in">&ldquo;Draw borders around sections to edit spacing.&rdquo;</span>}
                      {hoveredShapeIndex === 1 && <span className="text-[10px] text-accent font-black animate-fade-in">&ldquo;Highlight avatars or graphic icons.&rdquo;</span>}
                      {hoveredShapeIndex === 2 && <span className="text-[10px] text-primary font-black animate-fade-in">&ldquo;Point arrows directly at bug targets.&rdquo;</span>}
                      {hoveredShapeIndex === 3 && <span className="text-[10px] text-success font-black animate-fade-in">&ldquo;Drop a pin to leave a standard chat comment.&rdquo;</span>}
                      {hoveredShapeIndex === null && <span className="text-[10px] text-muted-foreground font-semibold">Hover over a shape to see contextual uses.</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel 2: RBAC Workspace Role Demo */}
            {activeDemoTab === 'roles' && (
              <div className="grid md:grid-cols-12 gap-8 items-center w-full animate-fade-in">
                <div className="md:col-span-5 space-y-5 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-foreground">Custom Role Permissions (RBAC)</h3>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                    Protect workspace workflows. Set custom project scopes so client reviewers can only comment, collaborators can manage their own uploads, and admins keep control over billing, invites, and branding details.
                  </p>
                  
                  {/* Select Role Buttons */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Role Preview:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Owner', 'Admin', 'Collaborator', 'Reviewer'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => setDemoRole(role)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            demoRole === role
                              ? 'bg-primary border-primary text-white shadow-md'
                              : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulated interface locked blocks */}
                <div className="md:col-span-7 flex flex-col border border-border bg-muted/40 rounded-2xl p-4 shadow-inner space-y-4">
                  <div className="flex items-center justify-between border-b border-border/80 pb-2">
                    <span className="text-[11px] font-black text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      Role Permission Mockup: <span className="text-primary font-black uppercase bg-primary/10 px-2 py-0.5 rounded text-[9px]">{demoRole}</span>
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground">Teams Tab view</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Block A: Invite Card */}
                    <div className="rounded-xl border border-border bg-card p-3 relative space-y-2.5 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-foreground">Invite Member</span>
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="w-full h-8 bg-muted rounded-lg flex items-center px-2 text-[10px] font-bold text-muted-foreground select-none">
                        member@company.com
                      </div>
                      
                      {/* Lock overlay if Collaborator or Reviewer */}
                      {(demoRole === 'Collaborator' || demoRole === 'Reviewer') && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-2 animate-fade-in">
                          <Lock className="h-4 w-4 text-white animate-bounce" />
                          <span className="text-[9px] font-black text-white uppercase tracking-wider mt-1">Access Restricted</span>
                          <span className="text-[8px] text-white/80 font-bold mt-0.5">Owners & Admins only</span>
                        </div>
                      )}
                    </div>

                    {/* Block B: Subscription Tiers Billing */}
                    <div className="rounded-xl border border-border bg-card p-3 relative space-y-2.5 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-foreground">Billing Options</span>
                        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="w-full h-8 bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center justify-center text-[10px] font-black">
                        Starter Plan (5GB)
                      </div>

                      {/* Lock overlay if Collaborator or Reviewer */}
                      {(demoRole === 'Collaborator' || demoRole === 'Reviewer') && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-2 animate-fade-in">
                          <Lock className="h-4 w-4 text-white animate-bounce" />
                          <span className="text-[9px] font-black text-white uppercase tracking-wider mt-1">Access Restricted</span>
                          <span className="text-[8px] text-white/80 font-bold mt-0.5">Billing locked</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Member Rows */}
                  <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase border-b border-border/40 pb-1.5">
                      <span>Workspace Members</span>
                      <span>Action Menu</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-1 border-b border-border/40 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[9px] font-black">F</div>
                        <span className="font-bold text-foreground">Fajad Shah</span>
                      </div>
                      
                      {/* Action trigger */}
                      {demoRole === 'Owner' || demoRole === 'Admin' ? (
                        <button className="text-[9px] font-black bg-destructive/15 text-destructive border border-destructive/25 rounded px-2 py-0.5 hover:bg-destructive hover:text-white transition-colors cursor-pointer">
                          Remove
                        </button>
                      ) : (
                        <span className="text-[9px] font-black text-muted-foreground italic flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Locked</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel 3: White-label Branding Demo */}
            {activeDemoTab === 'branding' && (
              <div className="grid md:grid-cols-12 gap-8 items-center w-full animate-fade-in">
                <div className="md:col-span-5 space-y-5 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Camera className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-foreground">Organization Branding</h3>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                    Make it yours. On Business and Enterprise tiers, customize the user interface of design boards with your company&apos;s colors and logo, establishing a high-end corporate presence for client-facing reviews.
                  </p>

                  {/* Brand Color selection */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Brand Color:</p>
                    <div className="flex flex-wrap gap-2 select-none">
                      {brandColors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setDemoBrandColor(color.hex)}
                          className="h-8 w-8 rounded-full border border-border shadow-sm flex items-center justify-center transition-transform hover:scale-110 cursor-pointer active:scale-90"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {demoBrandColor === color.hex && (
                            <CheckCircle2 className="h-4 w-4 text-white drop-shadow-md" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Branding Mockup Preview */}
                <div className="md:col-span-7 border border-border bg-muted/40 rounded-2xl p-4 shadow-inner flex flex-col space-y-4">
                  
                  {/* Brand Header */}
                  <div className="h-14 rounded-xl relative overflow-hidden flex items-center justify-between px-4 text-white shadow-md transition-all duration-300" style={{ backgroundColor: demoBrandColor }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider">Acme Creative Agency</span>
                    </div>
                    <span className="text-[9px] font-bold bg-white/25 rounded px-2 py-0.5 select-none">Client Board</span>
                  </div>

                  {/* UI Accents */}
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <span className="text-[9px] font-black text-muted-foreground uppercase">Project Title</span>
                      <p className="text-xs font-bold text-foreground">Client Feedback Board</p>
                    </div>
                    
                    <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 flex flex-col justify-between">
                      <span className="text-[9px] font-black text-muted-foreground uppercase">Primary Action</span>
                      <button 
                        className="w-full text-white text-[10px] font-black rounded-lg py-1.5 shadow transition-all hover:opacity-90 select-none duration-300"
                        style={{ backgroundColor: demoBrandColor }}
                      >
                        Share Review Board
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Real-world Use Cases Section */}
      <section className="py-24 px-6 relative bg-background border-b border-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-xl">Workflows</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Real-World Applications</h2>
            <p className="text-muted-foreground text-sm font-bold max-w-xl mx-auto">See how visual pins replace long loops in everyday creative projects.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left select-none">
            {[
              {
                title: 'E-commerce & Web Audits',
                focus: 'UX, Copywriting, Spacing',
                desc: 'Upload a homepage draft. Drop a pin on a button to note "Fix the text margin here", or highlight a hero header to remark "Change the font size of the subheading".',
                icon: FolderKanban,
                accent: 'border-primary/30'
              },
              {
                title: 'Print proofing & Brochures',
                focus: 'Multi-page catalog files',
                desc: 'Upload a multi-page PDF brochure. Flip pages in the viewer and draw red circles around spelling errors or misaligned margins directly on the pages.',
                icon: Files,
                accent: 'border-accent/30'
              },
              {
                title: 'Engineering & Bug Tracking',
                focus: 'UI alignment specs',
                desc: 'Upload UI designs and have devs and reviewers verify the frontend layout. Add direct screenshots of bugs and attach fix guides right to the pins.',
                icon: Shield,
                accent: 'border-success/30'
              }
            ].map((useCase, idx) => {
              const Icon = useCase.icon
              return (
                <div key={idx} className={`glass p-8 bg-card/45 rounded-3xl border ${useCase.accent} space-y-4 hover:shadow-lg transition-shadow`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-foreground">{useCase.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-0.5">{useCase.focus}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{useCase.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Process Map: How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-card relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-xl">Simple Flow</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Review in Three Simple Steps
            </h2>
            <p className="text-muted-foreground text-sm font-bold">
              Better visual feedback is only a few clicks away.
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-12 select-none">
            {/* Connecting connecting gradient line */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-30" />

            {[
              {
                icon: Upload,
                title: 'Upload Designs',
                description: 'Drag & drop image mockups, static screenshots, Figma exports, or even vector PDFs.'
              },
              {
                icon: LinkIcon,
                title: 'Share Public Link',
                description: 'Generate a unique shareable link. No login or registration required for guest clients.'
              },
              {
                icon: MessageSquare,
                title: 'Resolve Comments',
                description: 'Reviewers leave comments directly on target areas, which you can resolve as you update.'
              }
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={i}
                  className="relative flex flex-col items-center text-center animate-fade-in group"
                  style={{ animationDelay: `${0.12 * (i + 1)}s` }}
                >
                  <div className="relative z-10 w-24 h-24 rounded-3xl glass flex items-center justify-center mb-6 shadow-xl transition-transform group-hover:scale-105 duration-300 bg-card/80 border border-border/80">
                    <Icon className="w-8 h-8 text-primary group-hover:text-accent transition-colors duration-300" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-accent text-white text-xs font-black flex items-center justify-center shadow-md">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-base font-black text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs font-semibold leading-relaxed">
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Reliability & Security (Trust) Section */}
      <section className="py-24 px-6 relative bg-muted/5 border-y border-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl">Trust & Quality</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Enterprise-Grade Reliability</h2>
            <p className="text-muted-foreground text-sm font-bold max-w-xl mx-auto">PixelPin is built on a high-availability foundation, designed to protect your assets and privacy.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 text-left select-none">
            {[
              {
                title: 'Stripe Secured Payments',
                desc: 'Billing options and checkout routing are integrated with Stripe to guarantee transaction security.',
                icon: HardDrive
              },
              {
                title: 'Administrative Audits',
                desc: 'Organization dashboard changes, logins, and project deletions are recorded in detailed audits.',
                icon: Shield
              },
              {
                title: 'Encrypted Asset Store',
                desc: 'Uploaded design boards and feedback attachments are stored securely with verified API route locks.',
                icon: Lock
              },
              {
                title: 'High Performance & Speed',
                desc: 'Next.js rendering and sqlite optimizations mean your client design pages load in milliseconds.',
                icon: Sparkles
              }
            ].map((trust, idx) => {
              const Icon = trust.icon
              return (
                <div key={idx} className="glass p-6 bg-card rounded-3xl border border-border/60 flex flex-col space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-xs font-black text-foreground">{trust.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">{trust.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Capabilities / Features Grid */}
      <section className="py-24 px-6 relative overflow-hidden bg-muted/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--border)_1px,_transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-xl">Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Everything You Need For Reviews</h2>
            <p className="text-muted-foreground text-sm font-bold">A cohesive feedback engine constructed for design agencies and clients.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Upload, title: 'Multi-Format Uploads', description: 'Seamlessly upload JPEG, PNG, WebP, SVG, and multi-page PDF documents on a single collaborative canvas.' },
              { icon: MessageCircle, title: 'Pin-point Annotations', description: 'Place numeric coordinates directly on design sections. No more typing coordinates or describing layout items.' },
              { icon: Users, title: 'Roles & Permissions', description: 'Enforce team workspace hierarchies. Assign Admin, Collaborator, or Reviewer roles with secure dashboard limits.' },
              { icon: Building2, title: 'Corporate White-labeling', description: 'Customize board logos, taglines, phone numbers, and brand colors to deliver consistent client-facing agency views.' },
              { icon: Lock, title: 'Secure Client Sharing', description: 'Clients can review, reply, draw shapes, and resolve comments without needing to register or maintain accounts.' },
              { icon: LinkIcon, title: 'Workspace Isolation', description: 'Ensure user projects stay organized. Scope projects into My Space personal views or Company Space team panels.' }
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className="glass p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 cursor-default bg-card/60 backdrop-blur-xl border border-border/50"
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4.5 transition-colors duration-300 ${
                    hoveredFeature === i ? 'bg-primary text-white shadow-md' : 'bg-primary/10 text-primary'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-foreground mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section className="py-24 px-6 relative bg-background border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-xl">Common Questions</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-sm font-bold">Have some questions about client boards, subscriptions, or formats? Let us help.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Do my clients need to register to leave feedback?',
                a: 'No! One of PixelPin\'s greatest benefits is guest client sharing. You generate a unique public link, send it to your client, and they can click anywhere to leave feedback instantly. They only type in their name so you know who wrote the comment.'
              },
              {
                q: 'How do workspace roles (Admin, Collaborator, Reviewer) work?',
                a: 'Owners and Admins have full administrative powers, allowing them to change brand colors, edit profile descriptions, configure billing, and invite team members. Collaborators can upload designs and edit their own projects. Reviewers are strictly restricted: they can view team projects and leave pin comments, but cannot select, modify, or delete any files.'
              },
              {
                q: 'What visual formats does PixelPin support?',
                a: 'PixelPin supports all standard raster image formats (JPEG, PNG, WebP), vector formats (SVG), and multi-page PDF documents. Clients can flip through PDF catalog pages directly inside the reviewer canvas.'
              },
              {
                q: 'How does custom branding work for agencies?',
                a: 'If you are on the Business or Enterprise tiers, you can configure your organization brand. Upload your studio logo and set a custom HSL color palette. Every design review board you share with your clients will render with your custom header branding, logo, and highlights, rather than PixelPin\'s default layout.'
              },
              {
                q: 'Can invited team members start their own workspace later?',
                a: 'Yes! Under the Settings tab, any invited team member (Admin, Collaborator, or Reviewer) can click "Leave Workspace". This resets their account invitation, reverting them back to the Owner of their default workspace, where they can choose to register and purchase their own company subscription.'
              }
            ].map((faq, idx) => (
              <div 
                key={idx} 
                className="glass rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-foreground focus:outline-none cursor-pointer hover:bg-muted/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    openFaqIndex === idx ? 'rotate-180 text-primary' : 'rotate-0'
                  }`} />
                </button>
                
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-muted-foreground border-t border-border/40 font-semibold leading-relaxed animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-28 px-6 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 opacity-30 blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center glass p-10 md:p-14 rounded-3xl border border-border/60 shadow-2xl relative bg-card/50 backdrop-blur-xl overflow-hidden">
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-accent/20 rounded-full blur-2xl animate-pulse" />

          <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight tracking-tight">
              Ready to speed up
              <br />
              your design approvals?
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto font-bold leading-relaxed">
              Start gathering clear, pinned comments from your teammates and clients immediately. Create your free workspace today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:opacity-90 hover:scale-102 active:scale-98 transition-all shadow-lg shadow-primary/20 text-xs"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-border bg-card/60 backdrop-blur-md text-foreground font-bold rounded-2xl hover:bg-muted hover:scale-102 transition-all text-xs"
              >
                View Pricing Tiers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-md">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-black text-foreground tracking-tight">PixelPin</span>
          </Link>
          
          <p className="text-xs text-muted-foreground font-bold">
            Built with ❤️ for design teams everywhere. © {new Date().getFullYear()} PixelPin. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <span className="text-border/80">·</span>
            <Link href="/sign-in" className="hover:text-foreground transition-colors">Sign In</Link>
            <span className="text-border/80">·</span>
            <Link href="/sign-up" className="hover:text-foreground transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
