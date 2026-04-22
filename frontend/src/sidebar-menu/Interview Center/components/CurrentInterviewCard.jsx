import { useState } from 'react'
import { getLastOpenAIPayload, getLastOpenAIResponse, previewInterviewPrompt } from '../../../api'

export default function CurrentInterviewCard({ username, currentSetup }) {
  const [isPromptPreviewOpen, setIsPromptPreviewOpen] = useState(false)
  const [promptPreviewText, setPromptPreviewText] = useState('')
  const [promptPreviewStatus, setPromptPreviewStatus] = useState('')
  const [isOpenAIPayloadOpen, setIsOpenAIPayloadOpen] = useState(false)
  const [openAIPayloadStatus, setOpenAIPayloadStatus] = useState('')
  const [openAIPayloadText, setOpenAIPayloadText] = useState('')
  const [isOpenAIResponseOpen, setIsOpenAIResponseOpen] = useState(false)
  const [openAIResponseStatus, setOpenAIResponseStatus] = useState('')
  const [openAIResponseText, setOpenAIResponseText] = useState('')

  const handlePromptPreview = async () => {
    if (!username) {
      setPromptPreviewStatus('Username unavailable. Please log in again.')
      setIsPromptPreviewOpen(true)
      return
    }

    setPromptPreviewStatus('Generating prompt preview...')
    setIsPromptPreviewOpen(true)
    try {
      const data = await previewInterviewPrompt({
        username,
        selected_mode: currentSetup.selectedMode,
        selected_topics: currentSetup.selectedTopics
      })
      setPromptPreviewText(data.prompt)
      setPromptPreviewStatus(`Prompt generated. File: ${data.prompt_file_path}`)
    } catch (error) {
      setPromptPreviewText('')
      setPromptPreviewStatus(error.message || 'Unable to generate prompt preview.')
    }
  }

  const handleLastPayloadDebug = async () => {
    setOpenAIPayloadStatus('Fetching latest OpenAI payload...')
    setOpenAIPayloadText('')
    setIsOpenAIPayloadOpen(true)
    try {
      const data = await getLastOpenAIPayload()
      setOpenAIPayloadText(JSON.stringify(data, null, 2))
      setOpenAIPayloadStatus('Latest payload fetched.')
    } catch (error) {
      setOpenAIPayloadStatus(error.message || 'Unable to fetch latest OpenAI payload.')
    }
  }

  const handleLastResponseDebug = async () => {
    setOpenAIResponseStatus('Fetching latest OpenAI response...')
    setOpenAIResponseText('')
    setIsOpenAIResponseOpen(true)
    try {
      const data = await getLastOpenAIResponse()
      setOpenAIResponseText(JSON.stringify(data, null, 2))
      setOpenAIResponseStatus('Latest response fetched.')
    } catch (error) {
      setOpenAIResponseStatus(error.message || 'Unable to fetch latest OpenAI response.')
    }
  }

  return (
    <section className="ic3-panel ic3-current-card" aria-label="Current interview info">
      <h3>Current Interview</h3>
      <div className="ic3-current-card-placeholder" aria-hidden="true" />
      <button type="button" className="ic3-browse-button ic3-debug-button" onClick={handlePromptPreview}>Debug Prompt</button>
      <button type="button" className="ic3-browse-button ic3-debug-button" onClick={handleLastPayloadDebug}>Debug Last OpenAI Call</button>
      <button type="button" className="ic3-browse-button ic3-debug-button" onClick={handleLastResponseDebug}>Last OpenAI Response</button>

      {isPromptPreviewOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsPromptPreviewOpen(false)}>
          <section className="ic3-modal ic3-prompt-modal" role="dialog" aria-modal="true" aria-label="Prompt preview" onClick={(event) => event.stopPropagation()}>
            <h4>Prompt Preview</h4>
            <p className="ic3-prompt-status">{promptPreviewStatus}</p>
            <textarea
              className="ic3-prompt-textarea"
              value={promptPreviewText}
              readOnly
              aria-label="Generated prompt preview"
            />
            <div className="ic3-modal-actions">
              <button type="button" className="ic3-modal-close" onClick={() => setIsPromptPreviewOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}

      {isOpenAIPayloadOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsOpenAIPayloadOpen(false)}>
          <section className="ic3-modal ic3-prompt-modal" role="dialog" aria-modal="true" aria-label="OpenAI payload preview" onClick={(event) => event.stopPropagation()}>
            <h4>Last OpenAI Payload</h4>
            <p className="ic3-prompt-status">{openAIPayloadStatus}</p>
            <textarea
              className="ic3-prompt-textarea"
              value={openAIPayloadText}
              readOnly
              aria-label="Last OpenAI payload"
            />
            <div className="ic3-modal-actions">
              <button type="button" className="ic3-modal-close" onClick={() => setIsOpenAIPayloadOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}

      {isOpenAIResponseOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsOpenAIResponseOpen(false)}>
          <section className="ic3-modal ic3-prompt-modal" role="dialog" aria-modal="true" aria-label="OpenAI response preview" onClick={(event) => event.stopPropagation()}>
            <h4>Last OpenAI Response</h4>
            <p className="ic3-prompt-status">{openAIResponseStatus}</p>
            <textarea
              className="ic3-prompt-textarea"
              value={openAIResponseText}
              readOnly
              aria-label="Last OpenAI response"
            />
            <div className="ic3-modal-actions">
              <button type="button" className="ic3-modal-close" onClick={() => setIsOpenAIResponseOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
