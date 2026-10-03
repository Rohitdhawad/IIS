import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('iis-theme')

    if (saved === 'light' || saved === 'dark') {
      return saved
    }

    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('iis-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) =>
      current === 'dark' ? 'light' : 'dark',
    )
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${
        theme === 'dark' ? 'light' : 'dark'
      } theme`}
      title={`Switch to ${
        theme === 'dark' ? 'light' : 'dark'
      } theme`}
    >
      <span className="theme-toggle-icon">
        {theme === 'dark' ? '☀' : '☾'}
      </span>

      <span>
        {theme === 'dark' ? 'Light' : 'Dark'}
      </span>
    </button>
  )
}