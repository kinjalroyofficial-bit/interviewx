export default function ThemeToggle({ checked, onChange }) {
  return (
    <label className="ic3-theme-toggle" aria-label="Toggle theme">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="ic3-theme-toggle-track">
        <span className="ic3-theme-toggle-thumb" />
      </span>
      <span className="ic3-theme-toggle-text">{checked ? 'Light' : 'Dark'}</span>
    </label>
  )
}
