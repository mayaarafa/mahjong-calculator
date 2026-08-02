'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera, Upload, X, Loader2, AlertTriangle, Check, Crop } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface TileSpec {
  suit: string
  value: number | string
}

interface PhotoInputProps {
  onImageCaptured: (dataUrl: string) => void
  onTilesRecognized: (tiles: TileSpec[]) => void
  preview?: string | null
  onClearPreview?: () => void
}

// ── Crop stage ────────────────────────────────────────────────────────────────

interface CropRect {
  x: number // fractions of displayed image (0–1)
  y: number
  w: number
  h: number
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 0.08

function CropView({
  imageUrl,
  onConfirm,
  onCancel,
}: {
  imageUrl: string
  onConfirm: (rect: CropRect) => void
  onCancel: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<CropRect>({ x: 0.05, y: 0.55, w: 0.9, h: 0.35 })
  const dragRef = useRef<{
    mode: DragMode
    startX: number
    startY: number
    startRect: CropRect
  } | null>(null)

  const startDrag = (e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startRect: rect }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    const container = containerRef.current
    if (!drag || !container) return
    const bounds = container.getBoundingClientRect()
    const dx = (e.clientX - drag.startX) / bounds.width
    const dy = (e.clientY - drag.startY) / bounds.height
    const s = drag.startRect

    if (drag.mode === 'move') {
      setRect({
        x: Math.min(Math.max(0, s.x + dx), 1 - s.w),
        y: Math.min(Math.max(0, s.y + dy), 1 - s.h),
        w: s.w,
        h: s.h,
      })
      return
    }

    // Corner resize: move the grabbed corner, keep the opposite corner fixed
    let x1 = s.x
    let y1 = s.y
    let x2 = s.x + s.w
    let y2 = s.y + s.h
    if (drag.mode === 'nw' || drag.mode === 'sw') x1 = Math.min(Math.max(0, s.x + dx), x2 - MIN_SIZE)
    if (drag.mode === 'ne' || drag.mode === 'se') x2 = Math.max(Math.min(1, s.x + s.w + dx), x1 + MIN_SIZE)
    if (drag.mode === 'nw' || drag.mode === 'ne') y1 = Math.min(Math.max(0, s.y + dy), y2 - MIN_SIZE)
    if (drag.mode === 'sw' || drag.mode === 'se') y2 = Math.max(Math.min(1, s.y + s.h + dy), y1 + MIN_SIZE)
    setRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 })
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const handleStyle =
    'absolute w-6 h-6 flex items-center justify-center touch-none'
  const handleDot = 'w-3.5 h-3.5 rounded-full bg-[#F6F1E6] border-2 border-[#1a449a] shadow'

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-[#D9CBA9] select-none touch-none"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img src={imageUrl} alt="Photo to crop" className="w-full block" draggable={false} />

        {/* Crop rectangle — shadow darkens everything outside it */}
        <div
          className="absolute border-2 border-[#F6F1E6] cursor-move touch-none"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`,
            boxShadow: '0 0 0 9999px rgba(33, 32, 28, 0.55)',
          }}
          onPointerDown={(e) => startDrag(e, 'move')}
        >
          <div className={`${handleStyle} -top-3 -left-3 cursor-nwse-resize`} onPointerDown={(e) => startDrag(e, 'nw')}>
            <div className={handleDot} />
          </div>
          <div className={`${handleStyle} -top-3 -right-3 cursor-nesw-resize`} onPointerDown={(e) => startDrag(e, 'ne')}>
            <div className={handleDot} />
          </div>
          <div className={`${handleStyle} -bottom-3 -left-3 cursor-nesw-resize`} onPointerDown={(e) => startDrag(e, 'sw')}>
            <div className={handleDot} />
          </div>
          <div className={`${handleStyle} -bottom-3 -right-3 cursor-nwse-resize`} onPointerDown={(e) => startDrag(e, 'se')}>
            <div className={handleDot} />
          </div>
        </div>
      </div>

      <p className="text-xs text-[#8A7A63] text-center">
        Drag the box to frame just your hand — closer crops read better
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-[#D9CBA9] text-[#21201C] hover:border-[#e51e28] hover:text-[#e51e28] bg-transparent"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(rect)}
          className="bg-[#1a449a] text-[#F6F1E6] hover:bg-[#1a449a]/90 flex items-center gap-2"
        >
          <Crop size={15} />
          Recognize
        </Button>
      </div>
    </div>
  )
}

// Crop at native resolution, then cap the long edge at 1568px — the vision
// API downsizes anything larger, so extra pixels only add upload size and cost
const MAX_EDGE = 1568

async function cropImage(dataUrl: string, rect: CropRect): Promise<string> {
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const sx = Math.round(rect.x * img.naturalWidth)
  const sy = Math.round(rect.y * img.naturalHeight)
  const sw = Math.max(1, Math.round(rect.w * img.naturalWidth))
  const sh = Math.max(1, Math.round(rect.h * img.naturalHeight))
  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.92)
}

// ── Main component ────────────────────────────────────────────────────────────

export function PhotoInput({
  onImageCaptured,
  onTilesRecognized,
  preview = null,
  onClearPreview,
}: PhotoInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'recognizing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [tileCount, setTileCount] = useState<number>(0)
  const [cropSource, setCropSource] = useState<string | null>(null)

  const recognize = useCallback(
    async (dataUrl: string) => {
      setStatus('recognizing')
      setErrorMsg(null)
      try {
        const res = await fetch('/api/recognize-tiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: dataUrl }),
        })
        const data = await res.json()
        if (data.error) {
          setStatus('error')
          setErrorMsg(data.error)
        } else {
          const tiles: TileSpec[] = data.tiles ?? []
          setTileCount(tiles.length)
          setStatus('done')
          onTilesRecognized(tiles)
        }
      } catch {
        setStatus('error')
        setErrorMsg('Could not reach the recognition service')
      }
    },
    [onTilesRecognized]
  )

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setStatus('idle')
    setErrorMsg(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      setCropSource(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleCropConfirm = useCallback(
    async (rect: CropRect) => {
      if (!cropSource) return
      const cropped = await cropImage(cropSource, rect)
      setCropSource(null)
      onImageCaptured(cropped)
      recognize(cropped)
    },
    [cropSource, onImageCaptured, recognize]
  )

  const handleCropCancel = useCallback(() => {
    setCropSource(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.capture = 'environment'
      fileInputRef.current.accept = 'image/*'
      fileInputRef.current.click()
    }
  }

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture')
      fileInputRef.current.accept = 'image/*'
      fileInputRef.current.click()
    }
  }

  const clearImage = () => {
    onClearPreview?.()
    setStatus('idle')
    setErrorMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {cropSource ? (
        <CropView imageUrl={cropSource} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
      ) : preview ? (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-[#D9CBA9]">
            <img src={preview} alt="Captured hand" className="w-full object-contain max-h-64" />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 bg-[#21201C]/60 text-[#F6F1E6] rounded-full w-7 h-7 flex items-center justify-center hover:bg-[#21201C]/80 transition-colors"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>

          {/* Recognition status */}
          {status === 'recognizing' && (
            <div className="flex items-center gap-2 text-sm text-[#8A7A63] px-1">
              <Loader2 size={14} className="animate-spin text-[#179e4b]" />
              <span>Recognizing tiles…</span>
            </div>
          )}
          {status === 'done' && (
            <div className="flex items-center gap-2 text-sm text-[#179e4b] px-1">
              <Check size={14} />
              <span>{tileCount} tile{tileCount !== 1 ? 's' : ''} detected — check the Tiles tab</span>
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-lg border border-[#e51e28]/30 bg-[#e51e28]/5 px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#e51e28] mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#21201C]">
                <p className="font-medium text-[#e51e28]">Recognition failed</p>
                <p className="text-[#8A7A63] mt-0.5">{errorMsg} — please enter tiles manually in the Tiles tab.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition-colors ${
            isDragging ? 'border-[#179e4b] bg-[#179e4b]/5' : 'border-[#D9CBA9] bg-[#F6F1E6]'
          }`}
        >
          <Camera size={32} className="text-[#8A7A63] opacity-50" />
          <p className="text-sm text-[#21201C] text-center">
            Take a photo or upload an image of your hand
          </p>
          <p className="text-xs text-[#8A7A63] text-center">
            You&apos;ll crop to your hand row, then tiles are detected automatically
          </p>
        </div>
      )}

      {!cropSource && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={openCamera}
            className="flex items-center gap-2 border-[#D9CBA9] text-[#21201C] hover:border-[#179e4b] hover:text-[#179e4b] bg-transparent"
          >
            <Camera size={15} />
            Camera
          </Button>
          <Button
            variant="outline"
            onClick={openFilePicker}
            className="flex items-center gap-2 border-[#D9CBA9] text-[#21201C] hover:border-[#179e4b] hover:text-[#179e4b] bg-transparent"
          >
            <Upload size={15} />
            Upload
          </Button>
        </div>
      )}
    </div>
  )
}
