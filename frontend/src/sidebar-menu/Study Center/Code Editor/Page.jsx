import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import codingData from '../../../data/coding.json'

const LANGUAGE_OPTIONS = [
  { id: 'javascript', label: 'JavaScript', template: 'function solve(input) {\n  return input\n}\n\nconsole.log(solve("hello"))\n' },
  { id: 'typescript', label: 'TypeScript', template: 'function solve(input: string): string {\n  return input\n}\n\nconsole.log(solve("hello"))\n' },
  { id: 'python', label: 'Python', template: 'def solve(input_data):\n    return input_data\n\nprint(solve("hello"))\n' },
  { id: 'java', label: 'Java', template: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Java");\n  }\n}\n' },
  { id: 'cpp', label: 'C++', template: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello from C++" << endl;\n  return 0;\n}\n' },
  { id: 'csharp', label: 'C#', template: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello from C#");\n  }\n}\n' },
  { id: 'go', label: 'Go', template: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello from Go")\n}\n' },
  { id: 'php', label: 'PHP', template: '<?php\necho "Hello from PHP";\n' },
  { id: 'ruby', label: 'Ruby', template: 'puts "Hello from Ruby"\n' },
  { id: 'rust', label: 'Rust', template: 'fn main() {\n    println!("Hello from Rust");\n}\n' },
  { id: 'kotlin', label: 'Kotlin', template: 'fun main() {\n    println("Hello from Kotlin")\n}\n' },
  { id: 'swift', label: 'Swift', template: 'print("Hello from Swift")\n' },
  { id: 'sql', label: 'SQL', template: 'SELECT "Hello from SQL" AS message;\n' },
  { id: 'json', label: 'JSON', template: '{\n  "message": "Hello"\n}\n' }
]

const shellStyle = { display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1rem', minHeight: 'calc(100dvh - 145px)' }
const panelStyle = { border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, background: 'rgba(7,16,30,0.6)', padding: '0.9rem' }

export default function StudyCenterCodeEditorPage() {
  const problems = codingData.problems || []
  const [activeProblemId, setActiveProblemId] = useState(problems[0]?.id || '')
  const [language, setLanguage] = useState('javascript')
  const [runOutput, setRunOutput] = useState('')
  const [codeByLanguage, setCodeByLanguage] = useState(() => Object.fromEntries(LANGUAGE_OPTIONS.map((lang) => [lang.id, lang.template])))

  const activeProblem = useMemo(() => problems.find((item) => item.id === activeProblemId) || problems[0], [activeProblemId, problems])
  const activeCode = codeByLanguage[language] || ''
  const isLanguageAllowed = activeProblem?.languages?.includes(language)

  const runCode = () => {
    if (language !== 'javascript' && language !== 'typescript') {
      setRunOutput('Run is currently enabled for JavaScript/TypeScript preview only in client-side mode.')
      return
    }
    try {
      const logs = []
      const fakeConsole = { log: (...args) => logs.push(args.map(String).join(' ')) }
      // eslint-disable-next-line no-new-func
      const execute = new Function('console', activeCode)
      execute(fakeConsole)
      setRunOutput(logs.join('\n') || 'Code executed successfully. No output.')
    } catch (error) {
      setRunOutput(`Runtime error: ${error?.message || 'Unknown error'}`)
    }
  }

  return (
    <section style={shellStyle}>
      <aside style={{ ...panelStyle, overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Practice Problems</h2>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {problems.map((problem) => (
            <button
              key={problem.id}
              type="button"
              onClick={() => setActiveProblemId(problem.id)}
              style={{ textAlign: 'left', padding: '0.7rem', borderRadius: 10, border: problem.id === activeProblemId ? '1px solid #4da3ff' : '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>{problem.title}</div>
                <span style={{ fontSize: '0.72rem', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '0.1rem 0.45rem' }}>{problem.difficulty}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {problem.languages.map((lang) => (
                  <span key={lang} style={{ fontSize: '0.72rem', border: '1px solid rgba(77,163,255,0.6)', borderRadius: 999, padding: '0.12rem 0.45rem', color: '#cde3ff' }}>
                    {LANGUAGE_OPTIONS.find((option) => option.id === lang)?.label || lang}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main style={{ ...panelStyle, display: 'grid', gridTemplateRows: 'auto auto auto 1fr auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{activeProblem?.title} <span style={{ fontSize: '0.78rem', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '0.15rem 0.5rem', verticalAlign: 'middle' }}>{activeProblem?.difficulty}</span></h2>
          <label>
            Language{' '}
            <select value={language} onChange={(event) => setLanguage(event.target.value)} style={{ marginLeft: 8 }}>
              {LANGUAGE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div style={{ fontSize: '0.88rem', opacity: 0.9 }}>Monaco language support includes: {LANGUAGE_OPTIONS.map((item) => item.label).join(', ')}.</div>

        <div style={{ marginTop: '0.6rem', marginBottom: '0.6rem', fontSize: '0.92rem', lineHeight: 1.45 }}>
          <p style={{ marginTop: 0 }}>{activeProblem?.statement}</p>
          <p style={{ marginBottom: 0 }}><strong>Sample Input:</strong> {activeProblem?.sample_input} | <strong>Sample Output:</strong> {activeProblem?.sample_output}</p>
          {!isLanguageAllowed ? <p style={{ color: '#ffb4b4', marginBottom: 0 }}>This problem is not tagged for the selected language. Please switch to one of the tagged languages.</p> : null}
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            value={activeCode}
            onChange={(value) => setCodeByLanguage((prev) => ({ ...prev, [language]: value ?? '' }))}
            options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
          />
        </div>

        <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" onClick={runCode} style={{ background: 'linear-gradient(135deg, #4da3ff, #2f6bff)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.85rem', fontWeight: 700 }}>Run</button>
            <button type="button" style={{ background: 'rgba(255,255,255,0.08)', color: '#e9f2ff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '0.5rem 0.85rem', fontWeight: 600 }}>Solution</button>
          </div>
          <div style={{ minHeight: 64, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '0.55rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{runOutput || 'Run output will appear here.'}</div>
        </div>
      </main>
    </section>
  )
}
