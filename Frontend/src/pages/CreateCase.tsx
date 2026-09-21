import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './CreateCase.css'

const API_BASE_URL =
  import.meta.env.VITE_IIS_API_URL || 'http://localhost:8000'

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
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>([])

  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )
  }

  const handleCreate = async () => {
    const trimmedName = caseName.trim()

    if (!trimmedName || isCreating) {
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/cases`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            description: description.trim(),
          }),
        },
      )

      if (!response.ok) {
        let message =
          `Failed to create case (${response.status})`

        try {
          const data = await response.json()

          if (typeof data?.detail === 'string') {
            message = data.detail
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message)
      }

      const createdCase = await response.json()

      if (!createdCase?.id) {
        throw new Error(
          'The server created the case but did not return a case ID.',
        )
      }

      navigate(
        `/cases/${createdCase.id}/dashboard`,
        {
          state: {
            caseId: createdCase.id,
            caseName: createdCase.name,
            description:
              createdCase.description || '',
            categories: selectedCategories,
          },
        },
      )
    } catch (err) {
      console.error(
        'Failed to create investigation case:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create the case.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="create-case-page">

      <div className="create-case-header">

        <div>

          <div className="eyebrow">
            CASE MANAGEMENT / NEW INVESTIGATION
          </div>

          <h1>
            Create Investigation Case
          </h1>

          <p>
            Create a case workspace for organizing
            reports, entities, relationships, analysis
            and investigation history.
          </p>

        </div>

        <button
          className="secondary-button"
          onClick={() => navigate('/cases')}
          disabled={isCreating}
        >
          Cancel
        </button>

      </div>


      <section className="create-case-card">

        <div className="form-section">

          <label>
            Case Name
          </label>

          <input
            type="text"
            placeholder="e.g. Investigation Alpha"
            value={caseName}
            onChange={(e) =>
              setCaseName(e.target.value)
            }
            disabled={isCreating}
          />

        </div>


        <div className="form-section">

          <label>
            Case Description
          </label>

          <textarea
            placeholder="Enter a brief description of the investigation..."
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            rows={6}
            disabled={isCreating}
          />

        </div>


        <div className="form-section">

          <label>
            Investigation Categories
          </label>

          <p className="field-hint">
            Select all categories currently relevant
            to this case. Categories can be changed later.
          </p>

          <div className="category-grid">

            {CATEGORIES.map((category) => (

              <button
                key={category}
                type="button"
                className={`category-option ${
                  selectedCategories.includes(category)
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  toggleCategory(category)
                }
                disabled={isCreating}
              >
                {category}
              </button>

            ))}

          </div>

        </div>


        {error && (

          <div
            role="alert"
            style={{
              marginTop: '20px',
              padding: '12px 14px',
              border: '1px solid #b56f55',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>

        )}


        <div className="create-case-footer">

          <div>

            <span className="footer-label">
              SELECTED CATEGORIES
            </span>

            <span className="footer-value">
              {selectedCategories.length}
            </span>

          </div>


          <button
            className="primary-button"
            onClick={handleCreate}
            disabled={
              !caseName.trim() ||
              isCreating
            }
          >
            {isCreating
              ? 'Creating Case...'
              : 'Create Case →'}
          </button>

        </div>

      </section>

    </main>
  )
}