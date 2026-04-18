export const sidebarMenu = [
  {
    id: 'awareness',
    label: 'Awareness',
    icon: 'awareness',
    children: [
      { id: 'tech-awareness', label: 'Tech Awareness', icon: 'tech' },
      { id: 'career-counselling', label: 'Career Counselling', icon: 'career' },
      { id: 'technology-map', label: 'Technology Map', icon: 'map' },
      { id: 'job-analytics', label: 'Job Analytics', icon: 'analytics' }
    ]
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'communication',
    children: [
      {
        id: 'speech-betterment',
        label: 'Speech Betterment',
        icon: 'speech',
        children: [
          { id: 'sentence', label: 'Sentence', icon: 'sentence' },
          { id: 'punctuation', label: 'Punctuation', icon: 'punctuation' },
          { id: 'audio', label: 'Audio', icon: 'audio-leaf' }
        ]
      },
      {
        id: 'thought-organization',
        label: 'Thought Organization',
        icon: 'thought',
        children: [
          { id: 'situation', label: 'Situation', icon: 'situation' },
          { id: 'topic', label: 'Topic', icon: 'topic' }
        ]
      },
      {
        id: 'latency-reduction',
        label: 'Latency Reduction',
        icon: 'latency',
        children: [
          { id: 'natural', label: 'Natural', icon: 'natural' },
          { id: 'drive', label: 'Drive', icon: 'drive' }
        ]
      },
      {
        id: 'vocabulary',
        label: 'Vocabulary',
        icon: 'vocabulary',
        children: [
          { id: 'words', label: 'Words', icon: 'words' },
          { id: 'synonyms', label: 'Synonyms', icon: 'synonyms' },
          { id: 'phrases', label: 'Phrases', icon: 'phrases' },
          { id: 'grammar', label: 'Grammar', icon: 'grammar' }
        ]
      }
    ]
  },
  {
    id: 'study-center',
    label: 'Study Center',
    icon: 'study',
    children: [
      { id: 'course-center', label: 'Course Center', icon: 'course' },
      { id: 'code-editor', label: 'Code Editor', icon: 'editor' },
      { id: 'code-repo', label: 'Code Repo', icon: 'repo' }
    ]
  },
  { id: 'quantum-quest', label: 'Quantum Quest', icon: 'quest' },
  { id: 'resume-builder', label: 'Resume Builder', icon: 'resume' },
  {
    id: 'networking',
    label: 'Networking',
    icon: 'network',
    children: [
      { id: 'company-process', label: 'Company Process', icon: 'company' },
      { id: 'job-network', label: 'Job Network', icon: 'job' },
      { id: 'tech-network', label: 'Tech Network', icon: 'tech-network' }
    ]
  },
  { id: 'interview-center', label: 'Interview Center', icon: 'interview' }
]
