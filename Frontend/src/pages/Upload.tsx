import { useCallback, useState, type ChangeEvent, type DragEvent } from 'react'
import './Upload.css'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: UploadStatus
  progress: number
  sourceType?: string
}

const ACCEPTED_TYPES = [
  '.csv',
  '.json',
  '.xlsx',
  '.xls',
  '.pdf',
  '.txt',
  'text/csv',
  'application/json',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

const SOURCE_OPTIONS = [
  'FIR / Police Report',
  'Call Detail Records (CDR)',
  'Financial Transaction',
  'Surveillance Report',
  'Social Media Intelligence',
  'Criminal History',
  'Intelligence Agency Report',
  'Other',
]

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [caseName, setCaseName] = useState('')
  const [sourceType, setSourceType] = useState(SOURCE_OPTIONS[0])
  const [notes, setNotes] = useState('')

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'unknown',
      status: 'idle',
      progress: 0,
      sourceType,
    }))

    setFiles((prev) => [...newFiles, ...prev])
  }, [sourceType])

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files)
    e.target.value = ''
  }

  const simulateUpload = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'uploading', progress: 0 } : f))
    )

    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 8
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'success', progress: 100 } : f
          )
        )
      } else {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress } : f))
        )
      }
    }, 220)
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadAll = () => {
    files
      .filter((f) => f.status === 'idle' || f.status === 'error')
      .forEach((f) => simulateUpload(f.id))
  }

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'))
  }

  const pendingCount = files.filter((f) => f.status === 'idle' || f.status === 'error').length
  const successCount = files.filter((f) => f.status === 'success').length

  return (
    <div className="upload-page">
      <div className="page-header">
        <div className="eyebrow mono">Investigation Intelligence System</div>
        <h2>Upload Investigation Data</h2>
        <p className="intro-text">
          Ingest structured and unstructured evidence (FIRs, CDRs, financial records,
          surveillance reports, etc.) into the Investigation Intelligence System for
          entity extraction and network analysis.
        </p>
      </div>

      {/* Metadata form */}
      <div className="upload-meta panel">
        <h3 className="section-title">Case / Batch Metadata</h3>
        <div className="meta-grid">
          <label className="field">
            <span className="field-label">Case / Batch Name</span>
            <input
              type="text"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              placeholder="e.g. Operation Riverbank – Phase 2"
            />
          </label>

          <label className="field">
            <span className="field-label">Primary Source Type</span>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>

          <label className="field full">
            <span className="field-label">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context for the analysts reviewing this batch…"
              rows={2}
            />
          </label>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone panel ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="drop-content">
          <div className="drop-icon mono">↑</div>
          <div className="drop-title">Drag & drop files here</div>
          <div className="drop-sub">
            or <label className="file-link">browse files
              <input
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileInput}
                hidden
              />
            </label>
          </div>
          <div className="drop-hint mono">
            Supported: CSV · JSON · XLSX · PDF · TXT
          </div>
        </div>
      </div>

      {/* Actions */}
      {files.length > 0 && (
        <div className="upload-actions">
          <button
            className="btn primary"
            onClick={uploadAll}
            disabled={pendingCount === 0}
          >
            Upload {pendingCount > 0 ? `${pendingCount} file${pendingCount > 1 ? 's' : ''}` : 'All'}
          </button>
          <button className="btn ghost" onClick={clearCompleted} disabled={successCount === 0}>
            Clear completed
          </button>
          <span className="action-stats mono">
            {successCount} uploaded · {pendingCount} pending
          </span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="file-list panel">
          <h3 className="section-title">Queued Files</h3>
          <div className="file-rows">
            {files.map((file) => (
              <div key={file.id} className={`file-row status-${file.status}`}>
                <div className="file-main">
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta mono">
                    {formatBytes(file.size)}
                    {file.sourceType && <> · {file.sourceType}</>}
                  </div>
                </div>

                <div className="file-status">
                  {file.status === 'idle' && (
                    <button className="btn small" onClick={() => simulateUpload(file.id)}>
                      Upload
                    </button>
                  )}
                  {file.status === 'uploading' && (
                    <div className="progress-wrap">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${file.progress}%` }} />
                      </div>
                      <span className="progress-text mono">{Math.round(file.progress)}%</span>
                    </div>
                  )}
                  {file.status === 'success' && (
                    <span className="status-badge success mono">Ingested</span>
                  )}
                  {file.status === 'error' && (
                    <span className="status-badge error mono">Failed</span>
                  )}
                </div>

                <button
                  className="btn icon"
                  onClick={() => removeFile(file.id)}
                  title="Remove"
                  aria-label="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="disclaimer-block">
        Uploaded files are treated as evidence for analysis only. The system extracts
        entities and relationships to assist investigators; it does not determine
        guilt or intent.
      </div>
    </div>
  )
}