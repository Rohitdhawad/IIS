import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { useParams } from 'react-router-dom'

import './Upload.css'

const API_BASE_URL =
  import.meta.env.VITE_IIS_API_URL ||
  'http://localhost:8000'


type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'extracting'
  | 'updating_network'
  | 'analyzed'
  | 'error'


interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  file: File
  status: UploadStatus
  progress: number
  sourceType: string
  error?: string
  evidenceId?: number
  versionNumber?: number
  entityCount?: number
  relationshipCount?: number
}


interface EvidenceResponse {
  id: number
  status: string
}


interface ExtractionResponse {
  status: string
  graph_version?: {
    version_number?: number
    entity_count?: number
    relationship_count?: number
  }
}


/* =========================================================
   CONSTANTS
========================================================= */

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
    description:
      'FIRs, police reports and case documents',
  },
  {
    value: 'Call Detail Records (CDR)',
    short: 'CDR',
    description:
      'Calls, contacts and communication records',
  },
  {
    value: 'Financial Transaction',
    short: 'FIN',
    description:
      'Banking and transaction records',
  },
  {
    value: 'Surveillance Report',
    short: 'SUR',
    description:
      'CCTV and surveillance observations',
  },
  {
    value: 'Social Media Intelligence',
    short: 'SOC',
    description:
      'Social media intelligence and activity',
  },
  {
    value: 'Criminal History',
    short: 'HIS',
    description:
      'Historical criminal records',
  },
  {
    value: 'Intelligence Agency Report',
    short: 'INT',
    description:
      'Intelligence and field reports',
  },
  {
    value: 'Other',
    short: 'OTH',
    description:
      'Other investigation evidence',
  },
]


/* =========================================================
   HELPERS
========================================================= */

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'

  const k = 1024

  const sizes = [
    'B',
    'KB',
    'MB',
    'GB',
  ]

  const i = Math.floor(
    Math.log(bytes) / Math.log(k),
  )

  return `${parseFloat(
    (
      bytes /
      Math.pow(k, i)
    ).toFixed(1),
  )} ${sizes[i]}`
}


function getStatusLabel(
  status: UploadStatus,
) {
  switch (status) {
    case 'idle':
      return 'Ready'

    case 'uploading':
      return 'Uploading'

    case 'uploaded':
      return 'Uploaded'

    case 'processing':
      return 'Processing'

    case 'extracting':
      return 'Extracting'

    case 'updating_network':
      return 'Updating Network'

    case 'analyzed':
      return 'Analyzed'

    case 'error':
      return 'Failed'

    default:
      return status
  }
}


function getStatusProgress(
  status: UploadStatus,
  progress: number,
) {
  if (status === 'uploading') {
    return progress
  }

  if (status === 'processing') {
    return 55
  }

  if (status === 'extracting') {
    return 70
  }

  if (status === 'updating_network') {
    return 88
  }

  if (
    status === 'uploaded' ||
    status === 'analyzed'
  ) {
    return 100
  }

  return 0
}


/* =========================================================
   ICONS
========================================================= */

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
      <ellipse
        cx="12"
        cy="5"
        rx="7"
        ry="3"
      />
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


/* =========================================================
   API ERROR
========================================================= */

async function getApiError(
  response: Response,
  fallback: string,
) {
  try {
    const data =
      await response.json()

    if (
      typeof data?.detail ===
      'string'
    ) {
      return data.detail
    }

    if (
      Array.isArray(data?.detail)
    ) {
      return data.detail
        .map(
          (
            item: {
              loc?: string[]
              msg?: string
            },
          ) =>
            `${item.loc?.join('.') || 'field'}: ${
              item.msg ||
              'Invalid value'
            }`,
        )
        .join('; ')
    }
  } catch {
    // Keep fallback.
  }

  return fallback
}


/* =========================================================
   COMPONENT
========================================================= */

export default function Upload() {
  const { caseId } = useParams()

  const [files, setFiles] =
    useState<UploadedFile[]>([])

  const [isDragging, setIsDragging] =
    useState(false)

  const [sourceType, setSourceType] =
    useState(
      SOURCE_OPTIONS[0].value,
    )

  const [notes, setNotes] =
    useState('')

  const [existingEvidenceCount, setExistingEvidenceCount] =
    useState(0)


  /* =======================================================
     LOAD EXISTING EVIDENCE COUNT
  ======================================================= */

  useEffect(() => {
    if (!caseId) return

    let cancelled = false

    async function loadEvidence() {
      try {
        const response =
          await fetch(
            `${API_BASE_URL}/evidence/cases/${encodeURIComponent(
              caseId,
            )}`,
          )

        if (!response.ok) return

        const data =
          await response.json()

        if (!cancelled) {
          setExistingEvidenceCount(
            Array.isArray(data)
              ? data.length
              : 0,
          )
        }
      } catch {
        // Evidence count is informational.
      }
    }

    loadEvidence()

    return () => {
      cancelled = true
    }
  }, [caseId])


  /* =======================================================
     ADD FILES
  ======================================================= */

  const addFiles = useCallback(
    (
      fileList: FileList | null,
    ) => {
      if (
        !fileList ||
        fileList.length === 0
      ) {
        return
      }

      const newFiles =
        Array.from(fileList).map(
          (file) => ({
            id: `${file.name}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 7)}`,

            name: file.name,

            size: file.size,

            type:
              file.type ||
              'unknown',

            file,

            status: 'idle' as UploadStatus,

            progress: 0,

            sourceType,

          }),
        )

      setFiles((prev) => [
        ...newFiles,
        ...prev,
      ])
    },
    [sourceType],
  )


  /* =======================================================
     DRAG / DROP
  ======================================================= */

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()

    setIsDragging(false)

    addFiles(
      event.dataTransfer.files,
    )
  }


  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
  ) => {
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


  /* =======================================================
     UPLOAD
  ======================================================= */

  const uploadFile = async (
    fileItem: UploadedFile,
  ) => {
    if (!caseId) {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileItem.id
            ? {
                ...file,
                status: 'error',
                error:
                  'No case ID was found in the current workspace.',
              }
            : file,
        ),
      )

      return
    }


    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileItem.id
          ? {
              ...file,
              status: 'uploading',
              progress: 10,
              error: undefined,
            }
          : file,
      ),
    )


    try {
      const formData =
        new FormData()

      formData.append(
        'file',
        fileItem.file,
      )


      const selectedSource =
        fileItem.sourceType ||
        'Other'


      const uploadUrl =
        `${API_BASE_URL}/evidence/cases/` +
        `${encodeURIComponent(caseId)}` +
        `?source_type=${encodeURIComponent(
          selectedSource,
        )}`


      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileItem.id
            ? {
                ...file,
                progress: 35,
              }
            : file,
        ),
      )


      const response =
        await fetch(
          uploadUrl,
          {
            method: 'POST',
            body: formData,
          },
        )


      if (!response.ok) {
        throw new Error(
          await getApiError(
            response,
            `Upload failed (${response.status})`,
          ),
        )
      }


      const evidence =
        (await response.json()) as EvidenceResponse


      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileItem.id
            ? {
                ...file,
                status: 'uploaded',
                progress: 100,
                evidenceId:
                  evidence.id,
              }
            : file,
        ),
      )


      setExistingEvidenceCount(
        (count) => count + 1,
      )

    } catch (error) {

      console.error(
        `Failed to upload ${fileItem.name}:`,
        error,
      )

      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileItem.id
            ? {
                ...file,
                status: 'error',
                error:
                  error instanceof Error
                    ? error.message
                    : 'Upload failed.',
              }
            : file,
        ),
      )
    }
  }


  /* =======================================================
     ANALYZE
  ======================================================= */

  const analyzeFile = async (
    fileItem: UploadedFile,
  ) => {

    if (!fileItem.evidenceId) {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileItem.id
            ? {
                ...file,
                status: 'error',
                error:
                  'Evidence ID is missing. Upload the file again.',
              }
            : file,
        ),
      )

      return
    }


    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileItem.id
          ? {
              ...file,
              status: 'processing',
              progress: 50,
              error: undefined,
            }
          : file,
      ),
    )


    try {

      const response =
        await fetch(
          `${API_BASE_URL}/evidence/${fileItem.evidenceId}/extract`,
          {
            method: 'POST',
          },
        )


      if (!response.ok) {
        throw new Error(
          await getApiError(
            response,
            `Analysis failed (${response.status})`,
          ),
        )
      }


      const result =
        (await response.json()) as ExtractionResponse


      const version =
        result.graph_version


      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileItem.id
            ? {
                ...file,
                status: 'analyzed',
                progress: 100,
                versionNumber:
                  version?.version_number,
                entityCount:
                  version?.entity_count,
                relationshipCount:
                  version?.relationship_count,
              }
            : file,
        ),
      )

    } catch (error) {

      console.error(
        `Failed to analyze ${fileItem.name}:`,
        error,
      )

      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileItem.id
            ? {
                ...file,
                status: 'error',
                error:
                  error instanceof Error
                    ? error.message
                    : 'Analysis failed.',
              }
            : file,
        ),
      )
    }
  }


  /* =======================================================
     PROCESS ONE FILE
  ======================================================= */

  const processFile = async (
    fileItem: UploadedFile,
  ) => {

    if (
      fileItem.status === 'idle' ||
      fileItem.status === 'error'
    ) {
      await uploadFile(
        fileItem,
      )

      return
    }

    if (
      fileItem.status === 'uploaded'
    ) {
      await analyzeFile(
        fileItem,
      )
    }
  }


  /* =======================================================
     UPLOAD ALL
  ======================================================= */

  const uploadAll = async () => {

    const pending =
      files.filter(
        (file) =>
          file.status === 'idle' ||
          file.status === 'error',
      )

    for (
      const file of pending
    ) {
      await uploadFile(file)
    }
  }


  /* =======================================================
     ANALYZE ALL UPLOADED
  ======================================================= */

  const analyzeAll = async () => {

    const uploaded =
      files.filter(
        (file) =>
          file.status === 'uploaded',
      )

    for (
      const file of uploaded
    ) {
      await analyzeFile(file)
    }
  }


  /* =======================================================
     REMOVE
  ======================================================= */

  const removeFile = (
    id: string,
  ) => {
    setFiles((prev) =>
      prev.filter(
        (file) =>
          file.id !== id,
      ),
    )
  }


  const clearCompleted = () => {
    setFiles((prev) =>
      prev.filter(
        (file) =>
          file.status !==
          'analyzed',
      ),
    )
  }


  /* =======================================================
     COUNTS
  ======================================================= */

  const pendingCount =
    files.filter(
      (file) =>
        file.status === 'idle' ||
        file.status === 'error',
    ).length


  const uploadedCount =
    files.filter(
      (file) =>
        file.status === 'uploaded',
    ).length


  const analyzedCount =
    files.filter(
      (file) =>
        file.status === 'analyzed',
    ).length


  const processingCount =
    files.filter(
      (file) =>
        file.status ===
          'uploading' ||
        file.status ===
          'processing' ||
        file.status ===
          'extracting' ||
        file.status ===
          'updating_network',
    ).length


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="upload-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="upload-header">

        <div>

          <div className="upload-breadcrumb">
            <span>
              Case Workspace
            </span>

            <span>
              /
            </span>

            <strong>
              Data / Reports
            </strong>
          </div>

          <h1>
            Investigation Data
          </h1>

          <p>
            Ingest evidence into the active
            investigation for AI extraction,
            relationship construction and
            network analysis.
          </p>

        </div>


        <div className="upload-case-context">

          <span>
            ACTIVE CASE
          </span>

          <strong>
            {caseId ||
              'No case selected'}
          </strong>

          <code>
            {caseId || '—'}
          </code>

        </div>

      </header>


      {/* =================================================
          STATS
      ================================================= */}

      <section className="ingestion-stats">

        <div className="ingestion-stat">

          <div className="stat-icon">
            <DatabaseIcon />
          </div>

          <div>
            <strong>
              {existingEvidenceCount}
            </strong>

            <span>
              Case Evidence
            </span>
          </div>

        </div>


        <div className="stat-divider" />


        <div className="ingestion-stat">

          <div className="stat-icon">
            <UploadIcon />
          </div>

          <div>
            <strong>
              {files.length}
            </strong>

            <span>
              Current Batch
            </span>
          </div>

        </div>


        <div className="stat-divider" />


        <div className="ingestion-stat">

          <div className="stat-icon success-icon">
            <CheckIcon />
          </div>

          <div>
            <strong>
              {analyzedCount}
            </strong>

            <span>
              Analyzed
            </span>
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

            <span>
              Processing
            </span>
          </div>

        </div>

      </section>


      {/* =================================================
          SOURCE
      ================================================= */}

      <section className="source-section">

        <div className="section-heading">

          <div>

            <h2>
              Evidence Source
            </h2>

            <p>
              Select the primary source type
              for the evidence being added.
            </p>

          </div>

          <span className="section-step">
            01 / SOURCE
          </span>

        </div>


        <div className="source-grid">

          {SOURCE_OPTIONS.map(
            (source) => (

              <button
                key={
                  source.value
                }
                type="button"
                className={
                  sourceType ===
                  source.value
                    ? 'source-card selected'
                    : 'source-card'
                }
                onClick={() =>
                  setSourceType(
                    source.value,
                  )
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

            ),
          )}

        </div>

      </section>


      {/* =================================================
          DROPZONE
      ================================================= */}

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
          className={
            isDragging
              ? 'evidence-dropzone dragging'
              : 'evidence-dropzone'
          }
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
            Add one or multiple files
            to the current investigation.
          </p>

          <label className="browse-button">

            Browse Files

            <input
              type="file"
              multiple
              accept={
                ACCEPTED_TYPES.join(',')
              }
              onChange={
                handleFileInput
              }
              hidden
            />

          </label>

          <span className="drop-note mono">
            Supported: CSV, JSON, XLSX,
            XLS, PDF, TXT
          </span>

        </div>

      </section>


      {/* =================================================
          FILE QUEUE
      ================================================= */}

      {files.length > 0 && (
        <section className="file-queue-card">

          <div className="queue-header">

            <div>

              <span className="section-step">
                03 / PROCESSING
              </span>

              <h2>
                Evidence Queue
              </h2>

            </div>


            <div className="queue-actions">

              {pendingCount > 0 && (
                <button
                  type="button"
                  className="queue-button primary"
                  onClick={
                    uploadAll
                  }
                >
                  Ingest All
                </button>
              )}


              {uploadedCount > 0 && (
                <button
                  type="button"
                  className="queue-button primary"
                  onClick={
                    analyzeAll
                  }
                >
                  Analyze All
                </button>
              )}


              {analyzedCount > 0 && (
                <button
                  type="button"
                  className="queue-button"
                  onClick={
                    clearCompleted
                  }
                >
                  Clear Analyzed
                </button>
              )}

            </div>

          </div>


          <div className="file-table">

            <div className="file-table-header">

              <span>
                Evidence
              </span>

              <span>
                Source
              </span>

              <span>
                Size
              </span>

              <span>
                Status
              </span>

              <span />

            </div>


            {files.map(
              (file) => (

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
                        {file.id.slice(
                          0,
                          18,
                        )}
                      </small>

                    </div>

                  </div>


                  <div className="file-source">
                    {file.sourceType}
                  </div>


                  <div className="file-size mono">
                    {formatBytes(
                      file.size,
                    )}
                  </div>


                  <div className="file-status-cell">

                    {file.status ===
                      'idle' && (

                      <button
                        type="button"
                        className="status-action"
                        onClick={() =>
                          uploadFile(
                            file,
                          )
                        }
                      >
                        Ingest
                      </button>

                    )}


                    {file.status ===
                      'uploaded' && (

                      <button
                        type="button"
                        className="status-action"
                        onClick={() =>
                          analyzeFile(
                            file,
                          )
                        }
                      >
                        Analyze
                      </button>

                    )}


                    {[
                      'uploading',
                      'processing',
                      'extracting',
                      'updating_network',
                    ].includes(
                      file.status,
                    ) && (

                      <div className="file-progress">

                        <div className="progress-track">

                          <div
                            className="progress-value"
                            style={{
                              width: `${getStatusProgress(
                                file.status,
                                file.progress,
                              )}%`,
                            }}
                          />

                        </div>

                        <span className="mono">
                          {
                            getStatusLabel(
                              file.status,
                            )
                          }
                        </span>

                      </div>

                    )}


                    {file.status ===
                      'analyzed' && (

                      <div className="file-analyzed">

                        <span className="status-success">

                          <CheckIcon />

                          Analyzed

                        </span>

                        {file.versionNumber && (
                          <small>
                            Graph v
                            {
                              file.versionNumber
                            }
                          </small>
                        )}

                      </div>

                    )}


                    {file.status ===
                      'error' && (

                      <div>

                        <span className="status-error">
                          Failed
                        </span>

                        {file.error && (
                          <small className="file-error-text">
                            {file.error}
                          </small>
                        )}

                      </div>

                    )}

                  </div>


                  <button
                    type="button"
                    className="remove-file"
                    onClick={() =>
                      removeFile(
                        file.id,
                      )
                    }
                    title="Remove from queue"
                    aria-label="Remove evidence"
                  >
                    ×
                  </button>

                </div>

              ),
            )}

          </div>


          {/* ---------------------------------------------
              NOTES
          --------------------------------------------- */}

          <div className="upload-notes">

            <label>
              Investigation Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              placeholder="Optional notes about this evidence batch..."
              rows={3}
            />

          </div>

        </section>
      )}


      {/* =================================================
          PIPELINE
      ================================================= */}

      <section className="pipeline-card">

        <div className="pipeline-title">

          <span className="section-step">
            ANALYSIS PIPELINE
          </span>

          <h2>
            Evidence processing flow
          </h2>

        </div>


        <div className="pipeline">

          <div className="pipeline-step">

            <span>
              01
            </span>

            <strong>
              Ingest
            </strong>

            <small>
              Original evidence is stored
              against the case.
            </small>

          </div>


          <div className="pipeline-line" />


          <div className="pipeline-step">

            <span>
              02
            </span>

            <strong>
              Extract
            </strong>

            <small>
              AI identifies entities and
              relevant information.
            </small>

          </div>


          <div className="pipeline-line" />


          <div className="pipeline-step">

            <span>
              03
            </span>

            <strong>
              Relate
            </strong>

            <small>
              Evidence-backed relationships
              are persisted.
            </small>

          </div>


          <div className="pipeline-line" />


          <div className="pipeline-step">

            <span>
              04
            </span>

            <strong>
              Network
            </strong>

            <small>
              Neo4j is synchronized and a
              graph snapshot is created.
            </small>

          </div>

        </div>

      </section>


      <div className="upload-disclaimer">

        Uploaded files are retained as investigation
        evidence. IIS extracts entities and relationships
        to assist investigators. Analytical outputs should
        be reviewed against the underlying evidence.

      </div>

    </div>
  )
}