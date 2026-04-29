import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'

const LANGUAGE_OPTIONS = [
  { id: 'javascript', label: 'JavaScript', template: 'function solve(input) {\n  // write your logic here\n  return input\n}\n\nconsole.log(solve("hello"))\n' },
  { id: 'python', label: 'Python', template: 'def solve(input_data):\n    # write your logic here\n    return input_data\n\nprint(solve("hello"))\n' },
  { id: 'java', label: 'Java', template: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Java");\n  }\n}\n' },
  { id: 'cpp', label: 'C++', template: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello from C++" << endl;\n  return 0;\n}\n' }
]

const PROBLEMS = [
  {
    id: 'p1',
    title: 'Reverse a String',
    difficulty: 'Easy',
    languages: ['javascript', 'python', 'java', 'cpp'],
    statement: 'Given a string, return the reversed string.',
    sampleInput: 'InterviewX',
    sampleOutput: 'XweivretnI'
  },
  {
    id: 'p2',
    title: 'FizzBuzz Basics',
    difficulty: 'Easy',
    languages: ['javascript', 'python', 'java'],
    statement: 'Print numbers from 1 to n. For multiples of 3 print Fizz, for 5 print Buzz, for both print FizzBuzz.',
    sampleInput: '15',
    sampleOutput: '1 2 Fizz 4 Buzz ... FizzBuzz'
  },
  {
    id: 'p3',
    title: 'Two Sum',
    difficulty: 'Medium',
    languages: ['javascript', 'python', 'cpp'],
    statement: 'Return indices of two numbers in an array that add up to a target.',
    sampleInput: 'nums = [2,7,11,15], target = 9',
    sampleOutput: '[0,1]'
  }
]

const shellStyle = { display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1rem', minHeight: 'calc(100dvh - 145px)' }
const panelStyle = { border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, background: 'rgba(7,16,30,0.6)', padding: '0.9rem' }

export default function StudyCenterCodeEditorPage() {
  const [activeProblemId, setActiveProblemId] = useState(PROBLEMS[0].id)
  const [language, setLanguage] = useState('javascript')
  const [codeByLanguage, setCodeByLanguage] = useState(() => Object.fromEntries(LANGUAGE_OPTIONS.map((lang) => [lang.id, lang.template])))

  const activeProblem = useMemo(() => PROBLEMS.find((item) => item.id === activeProblemId) || PROBLEMS[0], [activeProblemId])
  const activeCode = codeByLanguage[language] || ''
  const isLanguageAllowed = activeProblem.languages.includes(language)

  return (
    <section style={shellStyle}>
      <aside style={{ ...panelStyle, overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Practice Problems</h2>
        <p style={{ marginTop: 0, opacity: 0.8 }}>Casual coding playground with language tags.</p>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {PROBLEMS.map((problem) => (
            <button
              key={problem.id}
              type="button"
              onClick={() => setActiveProblemId(problem.id)}
              style={{ textAlign: 'left', padding: '0.7rem', borderRadius: 10, border: problem.id === activeProblemId ? '1px solid #4da3ff' : '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
            >
              <div style={{ fontWeight: 700 }}>{problem.title}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Difficulty: {problem.difficulty}</div>
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

      <main style={{ ...panelStyle, display: 'grid', gridTemplateRows: 'auto auto 1fr' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{activeProblem.title}</h2>
          <label>
            Language{' '}
            <select value={language} onChange={(event) => setLanguage(event.target.value)} style={{ marginLeft: 8 }}>
              {LANGUAGE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div style={{ marginTop: '0.8rem', marginBottom: '0.8rem', fontSize: '0.92rem', lineHeight: 1.45 }}>
          <p style={{ marginTop: 0 }}>{activeProblem.statement}</p>
          <p style={{ marginBottom: 0 }}><strong>Sample Input:</strong> {activeProblem.sampleInput} | <strong>Sample Output:</strong> {activeProblem.sampleOutput}</p>
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
      </main>
    </section>
  )
}
