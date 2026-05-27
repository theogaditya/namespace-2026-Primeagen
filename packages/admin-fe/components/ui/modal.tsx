"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
}

export function Modal({ isOpen, onClose, children, title, className }: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div
        className={cn(
          // Responsive modal sizing: mobile-friendly margins and progressive max-widths
          // Added py-6 for uniform top/bottom padding inside modal
          "relative z-50 w-full max-h-[90vh] flex flex-col rounded-lg bg-white shadow-lg mx-4 sm:mx-0 sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl py-6 overflow-y-auto",
          className
        )}
      >
        {/* Sticky Header (when title is provided) */}
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 pb-4 -mt-6 pt-6 rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}
        
        {/* Body content */}
        <div className="flex-1 px-6">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  )
}

interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  )
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  // If there are no children, don't render footer container (avoids extra spacing)
  if (!children || React.Children.count(children) === 0) return null

  return (
    <div className={cn("mt-6 flex justify-end space-x-2", className)}>
      {children}
    </div>
  )
}
