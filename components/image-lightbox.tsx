'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt: string
  /** Thumbnail dimensions */
  width?: number
  height?: number
  /** Optional className for the thumbnail container */
  className?: string
  /** Show zoom hint on hover */
  showZoomHint?: boolean
}

/**
 * ImageLightbox - Zoomable image component for exam diagrams
 * 
 * Features:
 * - Click to open fullscreen lightbox
 * - Zoom in/out controls
 * - Rotate option for diagrams
 * - Keyboard navigation (Escape to close)
 * - Professional styling for teacher UI
 */
export function ImageLightbox({ 
  src, 
  alt, 
  width = 400, 
  height = 300,
  className = '',
  showZoomHint = true
}: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          setIsOpen(false)
          break
        case '+':
        case '=':
          setZoom(z => Math.min(z + 0.25, 3))
          break
        case '-':
          setZoom(z => Math.max(z - 0.25, 0.5))
          break
        case 'r':
          setRotation(r => (r + 90) % 360)
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const openLightbox = useCallback(() => {
    setIsOpen(true)
    setZoom(1)
    setRotation(0)
  }, [])

  const closeLightbox = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <>
      {/* Thumbnail */}
      <div 
        className={`
          relative group cursor-zoom-in
          border border-swiss-ink/20 rounded-lg overflow-hidden
          bg-white
          transition-all duration-200
          hover:border-swiss-ink/40 hover:shadow-md
          ${className}
        `}
        onClick={openLightbox}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto object-contain"
          style={{ maxHeight: '300px' }}
        />
        
        {/* Zoom hint overlay */}
        {showZoomHint && (
          <div className="
            absolute inset-0 
            bg-swiss-ink/0 group-hover:bg-swiss-ink/10
            flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-all duration-200
          ">
            <div className="
              bg-white/90 backdrop-blur-sm
              px-3 py-1.5 rounded-full
              flex items-center gap-2
              shadow-lg
              border border-swiss-ink/20
            ">
              <ZoomIn className="w-4 h-4 text-swiss-ink" />
              <span className="text-xs font-bold uppercase tracking-wider text-swiss-ink">
                Click to Zoom
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div 
          className="
            fixed inset-0 z-[100]
            bg-swiss-ink/95 backdrop-blur-sm
            flex items-center justify-center
            animate-in fade-in duration-200
          "
          onClick={closeLightbox}
        >
          {/* Controls Bar */}
          <div 
            className="
              absolute top-0 left-0 right-0
              p-4 flex items-center justify-between
              bg-gradient-to-b from-black/50 to-transparent
            "
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                className="
                  p-2 rounded-lg
                  bg-white/10 hover:bg-white/20
                  text-white transition-colors
                "
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white text-sm font-bold px-2 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                className="
                  p-2 rounded-lg
                  bg-white/10 hover:bg-white/20
                  text-white transition-colors
                "
                title="Zoom In (+)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-white/30 mx-2" />
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="
                  p-2 rounded-lg
                  bg-white/10 hover:bg-white/20
                  text-white transition-colors
                "
                title="Rotate (R)"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={closeLightbox}
              className="
                p-2 rounded-lg
                bg-white/10 hover:bg-white/20
                text-white transition-colors
              "
              title="Close (Escape)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Image Container */}
          <div 
            className="
              max-w-[90vw] max-h-[85vh]
              overflow-auto
              flex items-center justify-center
            "
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              width={800}
              height={600}
              className="
                object-contain
                bg-white rounded-lg shadow-2xl
                transition-transform duration-200
              "
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                maxWidth: '100%',
                maxHeight: '85vh',
              }}
              priority
            />
          </div>

          {/* Keyboard hints */}
          <div className="
            absolute bottom-4 left-1/2 -translate-x-1/2
            flex items-center gap-4
            text-white/60 text-xs font-medium
          ">
            <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded">+/-</kbd> Zoom</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded">R</kbd> Rotate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd> Close</span>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Simple diagram display without lightbox (for print views)
 */
export function DiagramImage({ 
  src, 
  alt, 
  className = '' 
}: { 
  src: string
  alt: string
  className?: string 
}) {
  return (
    <div className={`
      border border-swiss-ink/20 rounded-lg overflow-hidden
      bg-white p-2
      ${className}
    `}>
      <Image
        src={src}
        alt={alt}
        width={400}
        height={300}
        className="w-full h-auto object-contain"
        style={{ maxHeight: '300px' }}
      />
    </div>
  )
}
