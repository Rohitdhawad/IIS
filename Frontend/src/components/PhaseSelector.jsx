import './PhaseSelector.css'

export default function PhaseSelector({ phases, current, onChange }) {
  return (
    <div className="phase-selector">
      {phases.map((p) => (
        <button
          key={p}
          className={'phase-pill mono' + (p === current ? ' active' : '')}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
