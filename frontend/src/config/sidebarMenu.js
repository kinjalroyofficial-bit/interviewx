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
          { id: 'sentence', label: 'Sentence', icon: 'bullet' },
          { id: 'punctuation', label: 'Punctuation', icon: 'bullet' },
          { id: 'audio', label: 'Audio', icon: 'bullet' }
        ]
      },
      {
        id: 'thought-organization',
        label: 'Thought Organization',
        icon: 'thought',
        children: [
          { id: 'situation', label: 'Situation', icon: 'bullet' },
          { id: 'topic', label: 'Topic', icon: 'bullet' }
        ]
      },
      {
        id: 'latency-reduction',
        label: 'Latency Reduction',
        icon: 'latency',
        children: [
          { id: 'natural', label: 'Natural', icon: 'bullet' },
          { id: 'drive', label: 'Drive', icon: 'bullet' }
        ]
      },
      {
        id: 'vocabulary',
        label: 'Vocabulary',
        icon: 'vocabulary',
        children: [
          { id: 'words', label: 'Words', icon: 'bullet' },
          { id: 'synonyms', label: 'Synonyms', icon: 'bullet' },
          { id: 'phrases', label: 'Phrases', icon: 'bullet' },
          { id: 'grammar', label: 'Grammar', icon: 'bullet' }
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
