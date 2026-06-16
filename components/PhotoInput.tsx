'use client'

import { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface PhotoInputProps {
  onImageCaptured: (dataUrl: string) => void
}

export function PhotoInput({ onImageCaptured }: PhotoInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPreview(dataUrl)
        onImageCaptured(dataUrl)
      }
      reader.readAsDataURL(file)
    },
    [onImageCaptured]
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
    setPreview(null)
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
        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={preview} alt="Captured hand" className="w-full object-contain max-h-64" />
          <button
            onClick={clearImage}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80 transition-colors"
            aria-label="Remove image"
          >
            ×
          </button>
          <div className="absolute bottom-2 left-2">
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              Manual tile entry required below
            </span>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition-colors
            ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}
          `}
        >
          <div className="text-4xl">🀄</div>
          <p className="text-sm text-slate-500 text-center">
            Take a photo or upload an image of your hand
          </p>
          <p className="text-xs text-slate-400 text-center">
            Drag & drop an image here, or use the buttons below
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={openCamera}
          className="flex items-center gap-2"
        >
          <span>📷</span>
          <span>Camera</span>
        </Button>
        <Button
          variant="outline"
          onClick={openFilePicker}
          className="flex items-center gap-2"
        >
          <span>📁</span>
          <span>Upload</span>
        </Button>
      </div>

      {preview && (
        <p className="text-xs text-slate-400 text-center">
          Automatic tile recognition is not yet available. Please enter your tiles manually below.
        </p>
      )}
    </div>
  )
}
