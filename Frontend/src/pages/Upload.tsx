import {
  useCallback,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { useParams } from 'react-router-dom'
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
  'text/plain',
]

const SOURCE_OPTIONS = [
  {
    value: 'FIR / Police Report',
    short: 'FIR',
    description: 'FIRs, police reports and case documents',
  },
  {
    value: 'Call Detail Records (CDR)',
    short: 'CDR',
    description: 'Calls, contacts and communication records',
  },
  {
    value: 'Financial Transaction',
    short: 'FIN',
    description: 'Banking and transaction records',
  },
  {
    value: 'Surveillance Report',
    short: 'SUR',
    description: 'CCTV and surveillance observations',
  },
  {
    value: 'Social Media Intelligence',
    short: 'SOC',
    description: 'Social media intelligence and activity',
  },
  {
    value: 'Criminal History',
    short: 'HIS',
    description: 'Historical criminal records',
  },
  {
    value: 'Intelligence Agency Report',
    short: 'INT',
    description: 'Intelligence and field reports',
  },
  {
    value: 'Other',
    short: 'OTH',
    description: 'Other investigation evidence',
  },
]

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat(
    (bytes / Math.pow(k, i)).toFixed(1),
  )} ${sizes[i]}`
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export default function Upload() {
  const { caseId } = useParams()

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const [sourceType, setSourceType] = useState(
    SOURCE_OPTIONS[0].value,
  )

  const [notes, setNotes] = useState('')

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      const newFiles: UploadedFile[] = Array.from(fileList).map(
        (file) => ({
          id: `${file.name}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'unknown',
          status: 'idle',
          progress: 0,
          sourceType,
        }),
      )

      setFiles((prev) => [...newFiles, ...prev])
    },
    [sourceType],
  )

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInput = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    addFiles(event.target.files)
    event.target.value = ''
  }

  const simulateUpload = (id: string) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === id
          ? {
              ...file,
              status: 'uploading',
              progress: 0,
            }
          : file,
      ),
    )

    let progress = 0

    const interval = setInterval(() => {
      progress += Math.random() * 18 + 8

      if (progress >= 100) {
        progress = 100
        clearInterval(interval)

        setFiles((prev) =>
          prev.map((file) =>
            file.id === id
              ? {
                  ...file,
                  status: 'success',
                  progress: 100,
                }
              : file,
          ),
        )
      } else {
        setFiles((prev) =>
          prev.map((file) =>
            file.id === id
              ? {
                  ...file,
                  progress,
                }
              : file,
          ),
        )
      }
    }, 220)
  }

  const removeFile = (id: string) => {
    setFiles((prev) =>
      prev.filter((file) => file.id !== id),
    )
  }

  const uploadAll = () => {
    files
      .filter(
        (file) =>
          file.status === 'idle' ||
          file.status === 'error',
      )
      .forEach((file) => simulateUpload(file.id))
  }

  const clearCompleted = () => {
    setFiles((prev) =>
      prev.filter((file) => file.status !== 'success'),
    )
  }

  const pendingCount = files.filter(
    (file) =>
      file.status === 'idle' ||
      file.status === 'error',
  ).length

  const successCount = files.filter(
    (file) => file.status === 'success',
  ).length

  const processingCount = files.filter(
    (file) => file.status === 'uploading',
  ).length

  return (
    <div className="upload-page">

      {/* =========================================
          HEADER
      ========================================== */}

      <header className="upload-header">

        <div>

          <div className="upload-breadcrumb">
            <span>Case Workspace</span>
            <span>/</span>
            <strong>Data / Reports</strong>
          </div>

          <h1>Investigation Data</h1>

          <p>
            Ingest evidence and investigation records into the
            active case for entity extraction, relationship
            analysis and network construction.
          </p>

        </div>

        <div className="upload-case-context">

          <span>ACTIVE CASE</span>

          <strong>
            Project Nightfall
          </strong>

          <code>
            {caseId || 'IIS-2026-001'}
          </code>

        </div>

      </header>


      {/* =========================================
          INGESTION STATS
      ========================================== */}

      <section className="ingestion-stats">

        <div className="ingestion-stat">

          <div className="stat-icon">
            <DatabaseIcon />
          </div>

          <div>
            <strong>
              {files.length}
            </strong>

            <span>Current Batch</span>
          </div>

        </div>


        <div className="stat-divider" />


        <div className="ingestion-stat">

          <div className="stat-icon success-icon">
            <CheckIcon />
          </div>

          <div>
            <strong>
              {successCount}
            </strong>

            <span>Ingested</span>
          </div>

        </div>


        <div className="stat-divider" />


        <div className="ingestion-stat">

          <div className="stat-icon">
            <UploadIcon />
          </div>

          <div>
            <strong>
              {processingCount}
            </strong>

            <span>Processing</span>
          </div>

        </div>

      </section>


      {/* =========================================
          SOURCE TYPE
      ========================================== */}

      <section className="source-section">

        <div className="section-heading">

          <div>
            <h2>Evidence Source</h2>

            <p>
              Select the primary source type for the files
              being added to this investigation.
            </p>
          </div>

          <span className="section-step">
            01 / SOURCE
          </span>

        </div>


        <div className="source-grid">

          {SOURCE_OPTIONS.map((source) => (

            <button
              key={source.value}
              type="button"
              className={`source-card ${
                sourceType === source.value
                  ? 'selected'
                  : ''
              }`}
              onClick={() =>
                setSourceType(source.value)
              }
            >

              <span className="source-code mono">
                {source.short}
              </span>

              <strong>
                {source.value}
              </strong>

              <small>
                {source.description}
              </small>

            </button>

          ))}

        </div>

      </section>


      {/* =========================================
          UPLOAD AREA
      ========================================== */}

      <section className="upload-card">

        <div className="upload-card-header">

          <div>

            <span className="section-step">
              02 / EVIDENCE
            </span>

            <h2>
              Add Investigation Evidence
            </h2>

          </div>

          <div className="supported-formats mono">
            CSV · JSON · XLSX · PDF · TXT
          </div>

        </div>


        <div
          className={`evidence-dropzone ${
            isDragging ? 'dragging' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >

          <div className="drop-icon">
            <UploadIcon />
          </div>

          <h3>
            Drag & drop evidence files here
          </h3>

          <p>
            Add one or multiple files to the current
            investigation batch.
          </p>

          <label className="browse-button">

            Browse Files

            <input
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(',')}
              onChange={handleFileInput}
              hidden
            />

          </label>

          <span className="drop-note mono">
            Maximum supported formats: CSV, JSON, XLSX,
            PDF and TXT
          </span>

        </div>


        {/* Notes */}

        <div className="batch-notes">

          <label>
            <span>Batch Notes</span>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Optional context for investigators reviewing this evidence batch..."
              rows={3}
            />

          </label>

        </div>

      </section>


      {/* =========================================
          QUEUED FILES
      ========================================== */}

      {files.length > 0 && (

        <section className="queued-section">

          <div className="section-heading queued-heading">

            <div>
              <h2>Evidence Queue</h2>

              <p>
                Review files before ingestion into the
                investigation.
              </p>
            </div>

            <div className="queue-actions">

              <button
                className="button secondary"
                onClick={clearCompleted}
                disabled={successCount === 0}
              >
                Clear completed
              </button>

              <button
                className="button primary"
                onClick={uploadAll}
                disabled={pendingCount === 0}
              >
                {pendingCount > 0
                  ? `Ingest ${pendingCount} ${
                      pendingCount === 1
                        ? 'File'
                        : 'Files'
                    }`
                  : 'All Ingested'}
              </button>

            </div>

          </div>


          <div className="file-table">

            <div className="file-table-header">

              <span>Evidence File</span>
              <span>Source</span>
              <span>Size</span>
              <span>Status</span>
              <span />

            </div>


            {files.map((file) => (

              <div
                key={file.id}
                className="file-row"
              >

                <div className="file-name-cell">

                  <div className="file-icon">
                    <FileIcon />
                  </div>

                  <div>

                    <strong>
                      {file.name}
                    </strong>

                    <small className="mono">
                      {file.id.slice(0, 18)}
                    </small>

                  </div>

                </div>


                <div className="file-source">
                  {file.sourceType || '—'}
                </div>


                <div className="file-size mono">
                  {formatBytes(file.size)}
                </div>


                <div className="file-status-cell">

                  {file.status === 'idle' && (

                    <button
                      className="status-action"
                      onClick={() =>
                        simulateUpload(file.id)
                      }
                    >
                      Ingest
                    </button>

                  )}


                  {file.status === 'uploading' && (

                    <div className="file-progress">

                      <div className="progress-track">
                        <div
                          className="progress-value"
                          style={{
                            width: `${file.progress}%`,
                          }}
                        />
                      </div>

                      <span className="mono">
                        {Math.round(file.progress)}%
                      </span>

                    </div>

                  )}


                  {file.status === 'success' && (

                    <span className="status-success">
                      <CheckIcon />
                      Ingested
                    </span>

                  )}


                  {file.status === 'error' && (

                    <span className="status-error">
                      Failed
                    </span>

                  )}

                </div>


                <button
                  className="remove-file"
                  onClick={() =>
                    removeFile(file.id)
                  }
                  title="Remove evidence"
                  aria-label="Remove evidence"
                >
                  ×
                </button>

              </div>

            ))}

          </div>

        </section>

      )}


      {/* =========================================
          PROCESSING PIPELINE
      ========================================== */}

      <section className="pipeline-card">

        <div className="pipeline-title">

          <span className="section-step">
            ANALYSIS PIPELINE
          </span>

          <h2>
            What happens after ingestion?
          </h2>

        </div>


        <div className="pipeline">

          <div className="pipeline-step">

            <span>01</span>

            <strong>
              Ingest
            </strong>

            <small>
              Evidence is stored against the case.
            </small>

          </div>


          <div className="pipeline-line" />


          <div className="pipeline-step">

            <span>02</span>

            <strong>
              Extract
            </strong>

            <small>
              Entities and relevant information are identified.
            </small>

          </div>


          <div className="pipeline-line" />


          <div className="pipeline-step">

            <span>03</span>

            <strong>
              Relate
            </strong>

            <small>
              Evidence-backed relationships are constructed.
            </small>

          </div>


          <div className="pipeline-line" />


          <div className="pipeline-step">

            <span>04</span>

            <strong>
              Analyze
            </strong>

            <small>
              Network patterns become available to investigators.
            </small>

          </div>

        </div>

      </section>


      {/* =========================================
          DISCLAIMER
      ========================================== */}

      <div className="upload-disclaimer">

        Uploaded files are treated as evidence for analysis only.
        IIS extracts entities and relationships to assist
        investigators. Analytical outputs do not establish
        intent, guilt or criminal involvement.

      </div>

    </div>
  )
}