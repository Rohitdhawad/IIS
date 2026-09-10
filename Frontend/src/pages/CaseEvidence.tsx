import { useEffect, useState, useCallback, type ChangeEvent, type DragEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCaseGraph } from '../lib/dataClient'
import './CaseEvidence.css'

// ─── Evidence catalogue ────────────────────────────────────────────────────

interface EvidenceItem {
  id: string
  title: string
  source: string
  type: string
  status: 'available' | 'missing'
  description: string
  entities?: string[]
}

const SOURCE_OPTIONS = [
  'FIR / Police Report',
  'Call Detail Records (CDR)',
  'Financial Transaction',
  'Surveillance Report',
  'Criminal History',
  'Vehicle Records',
  'Evidence Register',
  'Investigation Notes',
  'Other',
]

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'
interface UploadedFile {
  id: string
  name: string
  size: number
  status: UploadStatus
  progress: number
  sourceType: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function CaseEvidence() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()

  const [available, setAvailable] = useState<EvidenceItem[]>([])
  const [missing, setMissing] = useState<EvidenceItem[]>([])
  const [loading, setLoading] = useState(true)

  // Upload state
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [sourceType, setSourceType] = useState(SOURCE_OPTIONS[0])
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    if (!caseId) return
    getCaseGraph(caseId).then((graph) => {
      // Derive available evidence from relationship evidence fields
      const seen = new Set<string>()
      const avail: EvidenceItem[] = []
      graph.relationships.forEach((r) => {
        const doc = r.evidence?.document as string | undefined
        if (doc && !seen.has(doc)) {
          seen.add(doc)
          avail.push({
            id: doc,
            title: doc,
            source: doc,
            type: classifyDoc(doc),
            status: 'available',
            description: describeDoc(doc),
            entities: graph.relationships
              .filter((rel) => rel.evidence?.document === doc)
              .flatMap((rel) => [rel.source, rel.target])
              .filter((v, i, a) => a.indexOf(v) === i)
              .slice(0, 4),
          })
        }
      })
      setAvailable(avail)
      setMissing(MISSING_EVIDENCE)
      setLoading(false)
    })
  }, [caseId])

  // ── Upload helpers ──

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        status: 'idle' as UploadStatus,
        progress: 0,
        sourceType,
      }))
      setFiles((prev) => [...newFiles, ...prev])
    },
    [sourceType],
  )

  const simulateUpload = (id: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'uploading', progress: 0 } : f)))
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 8
      if (progress >= 100) {
        clearInterval(interval)
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'success', progress: 100 } : f)))
      } else {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress } : f)))
      }
    }, 220)
  }

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))
  const uploadAll = () => files.filter((f) => f.status === 'idle' || f.status === 'error').forEach((f) => simulateUpload(f.id))
  const pendingCount = files.filter((f) => f.status === 'idle' || f.status === 'error').length
  const successCount = files.filter((f) => f.status === 'success').length

  return (
    <div className="case-evidence">
      <div className="ce-header">
        <div className="eyebrow mono">Case Workspace · {caseId}</div>
        <h2>Evidence</h2>
        <p className="intro-text">
          Evidence documents ingested for this case, and items flagged as potentially required.
        </p>
      </div>

      {loading && <div className="ce-status mono">Loading evidence records...</div>}

      {!loading && (
        <>
          {/* ── Available evidence ── */}
          <div className="ce-section">
            <div className="ce-section-head">
              <div className="ce-section-label mono">Available Evidence</div>
              <span className="ce-count mono">{available.length} document{available.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="ce-list">
              {available.map((item) => (
                <div key={item.id} className="ce-card available">
                  <div className="ce-card-top">
                    <span className="ce-type-badge mono">{item.type}</span>
                    <span className="ce-status-pill available mono">Ingested</span>
                  </div>
                  <div className="ce-title">{item.title}</div>
                  <div className="ce-desc">{item.description}</div>
                  {item.entities && item.entities.length > 0 && (
                    <div className="ce-entities mono">
                      {item.entities.map((e) => (
                        <span key={e} className="ce-entity-tag">{e}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Required / missing evidence ── */}
          <div className="ce-section">
            <div className="ce-section-head">
              <div className="ce-section-label mono">Required / Missing Evidence</div>
              <span className="ce-count mono">{missing.length} item{missing.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="ce-list">
              {missing.map((item) => (
                <div key={item.id} className="ce-card missing">
                  <div className="ce-card-top">
                    <span className="ce-type-badge mono">{item.type}</span>
                    <span className="ce-status-pill missing mono">Required</span>
                  </div>
                  <div className="ce-title">{item.title}</div>
                  <div className="ce-desc">{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Upload section ── */}
          <div className="ce-section">
            <div className="ce-section-head">
              <div className="ce-section-label mono">Upload Evidence</div>
              <button className="text-btn" onClick={() => setShowUpload((v) => !v)}>
                {showUpload ? 'Hide upload ↑' : 'Add files ↓'}
              </button>
            </div>

            {showUpload && (
              <div className="ce-upload-panel">
                <div className="ce-upload-meta">
                  <label className="ce-field">
                    <span className="ce-field-label mono">Source Type</span>
                    <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                      {SOURCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                </div>

                <div
                  className={`ce-drop-zone${isDragging ? ' dragging' : ''}`}
                  onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                >
                  <div className="ce-drop-icon mono">↑</div>
                  <div className="ce-drop-title">Drag & drop files here</div>
                  <div className="ce-drop-sub">
                    or{' '}
                    <label className="file-link">
                      browse files
                      <input
                        type="file"
                        multiple
                        accept=".csv,.json,.xlsx,.pdf,.txt"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => { addFiles(e.target.files); e.target.value = '' }}
                        hidden
                      />
                    </label>
                  </div>
                  <div className="ce-drop-hint mono">CSV · JSON · XLSX · PDF · TXT</div>
                </div>

                {files.length > 0 && (
                  <>
                    <div className="ce-upload-actions">
                      <button className="btn primary" onClick={uploadAll} disabled={pendingCount === 0}>
                        Upload {pendingCount > 0 ? `${pendingCount} file${pendingCount > 1 ? 's' : ''}` : 'All'}
                      </button>
                      <button className="btn ghost" onClick={() => setFiles((p) => p.filter((f) => f.status !== 'success'))} disabled={successCount === 0}>
                        Clear completed
                      </button>
                      <span className="ce-upload-stats mono">{successCount} uploaded · {pendingCount} pending</span>
                    </div>

                    <div className="ce-file-list">
                      {files.map((f) => (
                        <div key={f.id} className={`ce-file-row status-${f.status}`}>
                          <div className="ce-file-main">
                            <div className="ce-file-name">{f.name}</div>
                            <div className="ce-file-meta mono">{formatBytes(f.size)} · {f.sourceType}</div>
                          </div>
                          <div className="ce-file-status">
                            {f.status === 'idle' && (
                              <button className="btn small" onClick={() => simulateUpload(f.id)}>Upload</button>
                            )}
                            {f.status === 'uploading' && (
                              <div className="ce-progress">
                                <div className="ce-progress-bar">
                                  <div className="ce-progress-fill" style={{ width: `${f.progress}%` }} />
                                </div>
                                <span className="ce-progress-text mono">{Math.round(f.progress)}%</span>
                              </div>
                            )}
                            {f.status === 'success' && <span className="ce-badge success mono">Ingested</span>}
                            {f.status === 'error' && <span className="ce-badge error mono">Failed</span>}
                          </div>
                          <button className="btn icon" onClick={() => removeFile(f.id)} aria-label="Remove">×</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Back — deterministic */}
      <div className="ce-back-row">
        <button className="btn ghost" onClick={() => navigate(`/app/cases/${caseId}`)}>
          ← Back to Case Workspace
        </button>
      </div>

      <div className="disclaimer-block">
        Evidence listed here is derived from ingested source documents. Uploaded files are
        treated as evidence for analysis only. The system does not determine guilt or intent.
        For prototype purposes, uploads are simulated and not stored permanently.
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function classifyDoc(doc: string): string {
  if (doc.includes('FIR')) return 'FIR / Case Report'
  if (doc.includes('CDR')) return 'Call Detail Records'
  if (doc.includes('Financial')) return 'Financial Records'
  if (doc.includes('Vehicle')) return 'Vehicle Records'
  if (doc.includes('Surveillance')) return 'Surveillance Report'
  if (doc.includes('Criminal')) return 'Criminal History'
  if (doc.includes('Evidence')) return 'Evidence Register'
  if (doc.includes('Investigation')) return 'Investigation Notes'
  if (doc.includes('Metadata')) return 'Case Metadata'
  return 'Document'
}

function describeDoc(doc: string): string {
  const map: Record<string, string> = {
    '01_FIR_Case_Report.csv': 'First Information Report and initial case registration record.',
    '02_CDR.csv': 'Call Detail Records containing communication logs between persons of interest.',
    '03_Financial_Transactions.csv': 'Financial transaction records flagged for review, including high-value transfers.',
    '04_Vehicle_Records.csv': 'Vehicle registration and CCTV observation records.',
    '05_Surveillance_Report_01.txt': 'First field surveillance report documenting observed activity at Warehouse-W17.',
    '06_Surveillance_Report_02.txt': 'Second surveillance report covering the follow-up observation at Warehouse-W17.',
    '07_Criminal_History.csv': 'Criminal history records with prior-case associations for identified persons.',
    '08_Evidence_Register.csv': 'Catalogue of all collected physical and digital evidence items.',
    '09_Investigation_Notes.txt': 'Lead investigator notes and analytical observations.',
    '10_Case_Metadata.csv': 'Case-level metadata and administrative records.',
  }
  return map[doc] || `Source document: ${doc}`
}

const MISSING_EVIDENCE: EvidenceItem[] = [
  {
    id: 'missing-cctv',
    title: 'CCTV Footage — Warehouse-W17',
    source: 'Physical/Digital Evidence',
    type: 'CCTV / Video',
    status: 'missing',
    description: 'Original CCTV footage from Warehouse-W17 on 14 June and 16 June 2026. Currently referenced in surveillance reports but raw video files not ingested.',
  },
  {
    id: 'missing-bank-stmt',
    title: 'Bank Account Statement — ACC-7842',
    source: 'Financial Records',
    type: 'Financial Records',
    status: 'missing',
    description: 'Full bank statements for account reference ACC-7842 associated with the ₹1,85,000 transfer. Transaction record exists but full statement not available.',
  },
  {
    id: 'missing-phone-records',
    title: 'Full CDR for Sameer Joshi',
    source: 'Call Detail Records',
    type: 'Call Detail Records',
    status: 'missing',
    description: 'Complete CDR for Sameer Joshi covering the investigation period. Current records only include calls in the network — individual subscriber records not obtained.',
  },
  {
    id: 'missing-location-data',
    title: 'Location Registration — Warehouse-W17',
    source: 'Property / Location Records',
    type: 'Location Records',
    status: 'missing',
    description: 'Official registration and ownership records for the Warehouse-W17 location. Ownership not yet confirmed.',
  },
]
