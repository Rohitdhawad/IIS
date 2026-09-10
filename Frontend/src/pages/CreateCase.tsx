import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './CreateCase.css'

const CATEGORIES = [
  'Murder',
  'Kidnapping',
  'Drug Trafficking',
  'Human Trafficking',
  'Cyber Crime',
  'Financial Crime',
  'Extortion',
  'Organized Crime',
  'Other',
]

export default function CreateCase() {
  const navigate = useNavigate()

  const [caseName, setCaseName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    )
  }

  const handleCreate = () => {
    if (!caseName.trim()) return

    // Temporary case ID.
    // Later this will come from the backend.
    const caseId = `IIS-2026-${Math.floor(Math.random() * 900 + 100)}`

    navigate(`/cases/${caseId}/dashboard`, {
      state: {
        caseId,
        caseName,
        description,
        categories: selectedCategories,
      },
    })
  }

  return (
    <main className="create-case-page">
      <div className="create-case-header">
        <div>
          <div className="eyebrow">CASE MANAGEMENT / NEW INVESTIGATION</div>
          <h1>Create Investigation Case</h1>
          <p>
            Create a case workspace for organizing reports, entities,
            relationships, analysis and investigation history.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={() => navigate('/cases')}
        >
          Cancel
        </button>
      </div>

      <section className="create-case-card">
        <div className="form-section">
          <label>Case Name</label>
          <input
            type="text"
            placeholder="e.g. Project Nightfall"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
          />
        </div>

        <div className="form-section">
          <label>Case Description</label>
          <textarea
            placeholder="Enter a brief description of the investigation..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
          />
        </div>

        <div className="form-section">
          <label>Investigation Categories</label>
          <p className="field-hint">
            Select all categories currently relevant to this case.
            Categories can be changed later.
          </p>

          <div className="category-grid">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-option ${
                  selectedCategories.includes(category) ? 'selected' : ''
                }`}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="create-case-footer">
          <div>
            <span className="footer-label">SELECTED CATEGORIES</span>
            <span className="footer-value">
              {selectedCategories.length || 0}
            </span>
          </div>

          <button
            className="primary-button"
            onClick={handleCreate}
            disabled={!caseName.trim()}
          >
            Create Case →
          </button>
        </div>
      </section>
    </main>
  )
}