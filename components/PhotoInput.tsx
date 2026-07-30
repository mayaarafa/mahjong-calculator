'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera, Upload, X, Loader2, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface TileSpec {
  suit: string
  value: number | string
}

interface PhotoInputProps {
  onImageCaptured: (dataUrl: string) => void
  onTilesRecognized: (tiles: TileSpec[], winningTile: TileSpec | null) => void
  preview?: string | null
  onClearPreview?: () => void
}

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
          const winning: TileSpec | null = data.winningTile ?? null
          setTileCount(tiles.length)
          setStatus('done')
          onTilesRecognized(tiles, winning)
        }
      } catch {
        setStatus('error')
        setErrorMsg('Could not reach the recognition service')
      }
    },
    [onTilesRecognized]
  )

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return
      setStatus('idle')
      setErrorMsg(null)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        onImageCaptured(dataUrl)
        recognize(dataUrl)
      }
      reader.readAsDataURL(file)
    },
    [onImageCaptured, recognize]
  )

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

      {preview ? (
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
            Tiles will be automatically detected
          </p>
        </div>
      )}

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
    </div>
  )
}
