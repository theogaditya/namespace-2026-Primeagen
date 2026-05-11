"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FileText,
  Users,
  Building2,
  Shield,
  Landmark,
  Scale,
  BadgeCheck,
  HandHeart,
  Megaphone,
  ClipboardList,
  MessageSquare,
  HelpCircle,
  Bell,
  Vote,
  Briefcase,
  GraduationCap,
} from "lucide-react"

interface CTASectionProps {
  title?: string
  description?: string
  primaryButtonText?: string
  secondaryButtonText?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  angle: number
}

interface FloatingIcon {
  id: number
  icon: React.ReactNode
  x: number
  y: number
  z: number
  delay: number
  bgColor: string
}

export function CTASection({
  title = "Raise Your Voice Today",
  description = "Register your complaint in just a few clicks and help make your community better. Your voice matters.",
  primaryButtonText = "Register a Complaint",
  secondaryButtonText = "Log In",
  onPrimaryClick,
  onSecondaryClick,
}: CTASectionProps) {
  const [primaryClicked, setPrimaryClicked] = useState(false)
  const [secondaryClicked, setSecondaryClicked] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const floatingIcons: FloatingIcon[] = [
    { id: 1, icon: <Landmark className="w-10 h-10" />, x: -480, y: -280, z: 0.6, delay: 0, bgColor: "bg-orange-200" },
    {
      id: 2,
      icon: <FileText className="w-10 h-10" />,
      x: -420,
      y: -120,
      z: 0.8,
      delay: 0.2,
      bgColor: "bg-emerald-200",
    },
    { id: 3, icon: <Users className="w-10 h-10" />, x: -460, y: 80, z: 0.7, delay: 0.4, bgColor: "bg-blue-200" },
    { id: 4, icon: <Shield className="w-10 h-10" />, x: -380, y: 240, z: 0.5, delay: 0.6, bgColor: "bg-orange-200" },
    {
      id: 5,
      icon: <Building2 className="w-10 h-10" />,
      x: 480,
      y: -280,
      z: 0.6,
      delay: 0.1,
      bgColor: "bg-emerald-200",
    },
    { id: 6, icon: <Scale className="w-10 h-10" />, x: 420, y: -120, z: 0.8, delay: 0.3, bgColor: "bg-orange-200" },
    { id: 7, icon: <BadgeCheck className="w-10 h-10" />, x: 460, y: 80, z: 0.7, delay: 0.5, bgColor: "bg-blue-200" },
    { id: 8, icon: <HandHeart className="w-10 h-10" />, x: 380, y: 240, z: 0.5, delay: 0.7, bgColor: "bg-emerald-200" },
    { id: 9, icon: <Megaphone className="w-10 h-10" />, x: -280, y: -320, z: 0.4, delay: 0.15, bgColor: "bg-blue-200" },
    {
      id: 10,
      icon: <ClipboardList className="w-10 h-10" />,
      x: 280,
      y: -320,
      z: 0.4,
      delay: 0.25,
      bgColor: "bg-orange-200",
    },
    {
      id: 11,
      icon: <MessageSquare className="w-10 h-10" />,
      x: -520,
      y: -20,
      z: 0.5,
      delay: 0.35,
      bgColor: "bg-emerald-200",
    },
    { id: 12, icon: <HelpCircle className="w-10 h-10" />, x: 520, y: -20, z: 0.5, delay: 0.45, bgColor: "bg-blue-200" },
    { id: 13, icon: <Bell className="w-10 h-10" />, x: -280, y: 280, z: 0.6, delay: 0.55, bgColor: "bg-orange-200" },
    { id: 14, icon: <Vote className="w-10 h-10" />, x: 280, y: 280, z: 0.6, delay: 0.65, bgColor: "bg-emerald-200" },
    {
      id: 15,
      icon: <Briefcase className="w-10 h-10" />,
      x: -560,
      y: -180,
      z: 0.3,
      delay: 0.75,
      bgColor: "bg-blue-200",
    },
    {
      id: 16,
      icon: <GraduationCap className="w-10 h-10" />,
      x: 560,
      y: -180,
      z: 0.3,
      delay: 0.85,
      bgColor: "bg-orange-200",
    },
  ]

  const createParticles = useCallback(() => {
    const colors = ["#FF9933", "#FFFFFF", "#138808", "#000080"]
    const newParticles: Particle[] = []
    for (let i = 0; i < 24; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: Math.random() * 200 - 100,
        y: Math.random() * -150 - 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        angle: Math.random() * 360,
      })
    }
    setParticles(newParticles)
    setTimeout(() => setParticles([]), 1000)
  }, [])

  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newRipple = { id: Date.now(), x, y }
    setRipples((prev) => [...prev, newRipple])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 600)
  }, [])

  const handlePrimaryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setPrimaryClicked(true)
    createParticles()
    setTimeout(() => setPrimaryClicked(false), 800)
    onPrimaryClick?.()
  }

  const handleSecondaryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setSecondaryClicked(true)
    createRipple(e)
    setTimeout(() => setSecondaryClicked(false), 600)
    onSecondaryClick?.()
  }

  return (
    <section className="w-full min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center">
      {/* Floating icons container */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ perspective: "1000px" }}
      >
        {floatingIcons.map((item) => (
          <div
            key={item.id}
            className={cn(
              "absolute rounded-2xl shadow-xl flex items-center justify-center text-slate-600 transition-all duration-1000",
              item.bgColor,
              mounted ? "opacity-100" : "opacity-0",
            )}
            style={{
              width: 72 * item.z + 24,
              height: 72 * item.z + 24,
              transform: `translate(${item.x}px, ${item.y}px) scale(${item.z})`,
              animationDelay: `${item.delay}s`,
              filter: `blur(${(1 - item.z) * 2}px)`,
              boxShadow: `0 ${20 * item.z}px ${40 * item.z}px rgba(0,0,0,0.1)`,
            }}
          >
            <div className="animate-float" style={{ animationDelay: `${item.delay}s` }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <div className="mx-auto mb-8 w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center animate-fade-in overflow-hidden">
          <img
            src="https://swarajdesk.adityahota.online/logo.png"
            alt="SwarajDesk Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <h2
          className={cn(
            "text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 text-balance transition-all duration-700",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          {title}
        </h2>

        <p
          className={cn(
            "text-slate-600 text-lg md:text-xl max-w-xl mx-auto mb-10 text-pretty transition-all duration-700 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          {description}
        </p>

        <div
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={handleSecondaryClick}
            className={cn(
              "min-w-[160px] h-14 px-8 rounded-full border-2 border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 hover:scale-105 relative overflow-hidden text-slate-800 font-medium",
              secondaryClicked && "scale-95",
            )}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="absolute rounded-full bg-slate-400/30 animate-ripple"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: 10,
                  height: 10,
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}
            <span className={cn("relative z-10 transition-all duration-300", secondaryClicked && "scale-110")}>
              {secondaryButtonText}
            </span>
          </Button>

          <div className="relative">
            <Button
              size="lg"
              onClick={handlePrimaryClick}
              className={cn(
                "min-w-[220px] h-14 px-8 rounded-full bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 hover:scale-105 relative overflow-hidden font-medium shadow-lg shadow-blue-900/25",
                primaryClicked && "scale-110 shadow-xl shadow-blue-900/40",
              )}
            >
              <span
                className={cn(
                  "relative z-10 transition-all duration-300 inline-flex items-center gap-2",
                  primaryClicked && "tracking-wider",
                )}
              >
                {primaryButtonText}
              </span>
              <span
                className={cn(
                  "absolute inset-0 bg-white/0 transition-all duration-300",
                  primaryClicked && "bg-white/20",
                )}
              />
            </Button>

            {/* Confetti particles */}
            {particles.map((particle) => (
              <span
                key={particle.id}
                className="absolute left-1/2 top-1/2 rounded-full pointer-events-none animate-[confetti_1s_ease-out_forwards]"
                style={
                  {
                    backgroundColor: particle.color,
                    width: particle.size,
                    height: particle.size,
                    "--x": `${particle.x}px`,
                    "--y": `${particle.y}px`,
                    "--r": `${particle.angle}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
