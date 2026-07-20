import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react'
import { Modal } from '@/components/feedback/Modal'
import { Button } from '@/components/forms'
import { cn } from '@/utils/cn'
import { validateFile, simulateUpload, ALLOWED_EXTENSIONS } from '@/services/document-service'

interface UploadModalProps {
  open: boolean
  onClose: () => void
  documentId: string
  documentName: string
  onSuccess: () => void
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'processing' | 'success' | 'error'

export function UploadModal({ open, onClose, documentId, documentName, onSuccess }: UploadModalProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [simulateError, setSimulateError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const resetState = useCallback(() => {
    setState('idle')
    setProgress(0)
    setError(null)
    setFileName(null)
    setSimulateError(false)
  }, [])

  const handleClose = () => {
    if (cancelRef.current) cancelRef.current()
    resetState()
    onClose()
  }

  const handleFile = (file: File) => {
    setFileName(file.name)
    setState('validating')
    setError(null)

    const validation = validateFile(file)
    if (!validation.valid) {
      setState('error')
      setError(validation.error || 'Invalid file.')
      return
    }

    if (simulateError) {
      setState('error')
      setError('Upload failed. Please check your connection and try again.')
      return
    }

    setState('uploading')
    cancelRef.current = simulateUpload(
      documentId,
      file.name,
      (pct) => {
        setProgress(pct)
        if (pct >= 100) setState('processing')
      },
      () => {
        setState('success')
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 1500)
      },
    )
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Upload: ${documentName}`} size="md">
      {state === 'idle' && (
        <div>
          <div
            className="border-2 border-dashed border-border-default rounded-lg p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop file here or click to browse"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
          >
            <Upload className="h-8 w-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-text-primary mb-1">
              Drop your file here, or click to browse
            </p>
            <p className="text-xs text-text-muted">
              PDF, JPG, or PNG up to 25 MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
          />

          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="simulate-error"
              checked={simulateError}
              onChange={(e) => setSimulateError(e.target.checked)}
              className="accent-primary-600"
            />
            <label htmlFor="simulate-error" className="text-xs text-text-muted">
              Simulate upload failure (for demo)
            </label>
          </div>
        </div>
      )}

      {(state === 'uploading' || state === 'processing') && (
        <div className="py-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-primary-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary truncate">{fileName}</p>
              <p className="text-xs text-text-muted">
                {state === 'uploading' ? 'Uploading...' : 'Processing document...'}
              </p>
            </div>
          </div>

          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                state === 'processing' ? 'bg-primary-400 animate-pulse w-full' : 'bg-primary-600'
              )}
              style={state === 'uploading' ? { width: `${progress}%` } : undefined}
            />
          </div>
          <p className="text-xs text-text-muted mt-2 text-right">
            {state === 'uploading' ? `${Math.round(progress)}%` : 'Almost done...'}
          </p>
        </div>
      )}

      {state === 'success' && (
        <div className="py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-3" />
          <p className="text-base font-medium text-text-primary">Document uploaded</p>
          <p className="text-sm text-text-muted mt-1">
            Your tax preparer will review it shortly.
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="py-6">
          <div className="flex items-start gap-3 p-4 bg-error-50 border border-error-500 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-error-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error-800">Upload failed</p>
              <p className="text-sm text-error-700 mt-1">{error}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={resetState} className="flex-1">
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="ghost" onClick={handleClose}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {state === 'validating' && (
        <div className="py-6 text-center">
          <p className="text-sm text-text-muted">Checking file...</p>
        </div>
      )}
    </Modal>
  )
}
