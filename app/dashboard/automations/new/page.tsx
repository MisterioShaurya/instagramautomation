'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { Sidebar } from '@/components/dashboard/sidebar'
import { ChevronRight, ChevronLeft } from 'lucide-react'

export default function CreateAutomationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: {
      type: 'comment_keyword',
      keywords: [] as string[],
      matchType: 'contains',
    },
    response: 'auto_reply',
    responseContent: {
      message: '',
      link: '',
      qualifyingQuestions: [] as string[],
    },
    aiEnabled: true,
    aiTone: 'professional',
  })

  const [keywordInput, setKeywordInput] = useState('')
  const [questionInput, setQuestionInput] = useState('')

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setFormData({
        ...formData,
        trigger: {
          ...formData.trigger,
          keywords: [...formData.trigger.keywords, keywordInput.trim()],
        },
      })
      setKeywordInput('')
    }
  }

  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      trigger: {
        ...formData.trigger,
        keywords: formData.trigger.keywords.filter((_, i) => i !== index),
      },
    })
  }

  const addQuestion = () => {
    if (questionInput.trim()) {
      setFormData({
        ...formData,
        responseContent: {
          ...formData.responseContent,
          qualifyingQuestions: [
            ...formData.responseContent.qualifyingQuestions,
            questionInput.trim(),
          ],
        },
      })
      setQuestionInput('')
    }
  }

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      responseContent: {
        ...formData.responseContent,
        qualifyingQuestions:
          formData.responseContent.qualifyingQuestions.filter(
            (_, i) => i !== index
          ),
      },
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const automation = await response.json()
        router.push(`/dashboard/automations`)
      } else {
        alert('Failed to create automation')
      }
    } catch (error) {
      console.error('Failed to create automation:', error)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login')
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Create Automation
            </h1>
            <p className="mt-2 text-muted-foreground">
              Step {step} of 4 - Set up your Instagram automation
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8 flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-accent' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 rounded-lg border border-border bg-card p-6">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Automation Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Send Product Link"
                  className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-2 text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What does this automation do?"
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-2 text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Trigger Setup */}
          {step === 2 && (
            <div className="space-y-6 rounded-lg border border-border bg-card p-6">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Trigger Type
                </label>
                <select
                  value={formData.trigger.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, type: e.target.value as any },
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-2 text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="comment_keyword">Comment with Keywords</option>
                  <option value="dm_keyword">DM with Keywords</option>
                  <option value="story_mention">Story Mention</option>
                  <option value="post_mention">Post Mention</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Keywords to Trigger
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addKeyword()
                      }
                    }}
                    placeholder="e.g., LINK, PROMO, HELP"
                    className="flex-1 rounded-lg border border-border bg-input px-4 py-2 text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-all hover:opacity-90"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.trigger.keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1"
                    >
                      <span className="text-sm text-foreground">{keyword}</span>
                      <button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Response Type */}
          {step === 3 && (
            <div className="space-y-6 rounded-lg border border-border bg-card p-6">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Response Type
                </label>
                <select
                  value={formData.response}
                  onChange={(e) =>
                    setFormData({ ...formData, response: e.target.value as any })
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-2 text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="auto_reply">Auto Reply</option>
                  <option value="send_link">Send Link</option>
                  <option value="qualify_lead">Qualify Lead</option>
                  <option value="custom_message">Custom Message</option>
                </select>
              </div>

              {formData.response !== 'qualify_lead' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Response Message
                  </label>
                  <textarea
                    value={formData.responseContent.message}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        responseContent: {
                          ...formData.responseContent,
                          message: e.target.value,
                        },
                      })
                    }
                    placeholder="What should the automation reply with?"
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-2 text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {formData.response === 'send_link' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Link to Send
                  </label>
                  <input
                    type="url"
                    value={formData.responseContent.link}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        responseContent: {
                          ...formData.responseContent,
                          link: e.target.value,
                        },
                      })
                    }
                    placeholder="https://example.com"
                    className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-2 text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {formData.response === 'qualify_lead' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Qualifying Questions
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addQuestion()
                        }
                      }}
                      placeholder="e.g., What is your budget?"
                      className="flex-1 rounded-lg border border-border bg-input px-4 py-2 text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-all hover:opacity-90"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {formData.responseContent.qualifyingQuestions.map(
                      (question, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg bg-muted p-3"
                        >
                          <span className="text-sm text-foreground">
                            {question}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: AI Settings */}
          {step === 4 && (
            <div className="space-y-6 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">
                    Enable AI Conversations
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use AI to hold natural conversations instead of rigid
                    responses
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFormData({ ...formData, aiEnabled: !formData.aiEnabled })
                  }
                  className={`h-6 w-10 rounded-full transition-all ${
                    formData.aiEnabled ? 'bg-accent' : 'bg-muted'
                  }`}
                />
              </div>

              {formData.aiEnabled && (
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    AI Tone
                  </label>
                  <select
                    value={formData.aiTone}
                    onChange={(e) =>
                      setFormData({ ...formData, aiTone: e.target.value as any })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-input px-4 py-2 text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="flex items-center gap-2 rounded-lg border border-border px-6 py-2 font-medium text-foreground transition-all hover:bg-muted disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {step === 4 ? (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.name}
                className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2 font-medium text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Automation'}
              </button>
            ) : (
              <button
                onClick={() => setStep(Math.min(4, step + 1))}
                className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2 font-medium text-accent-foreground transition-all hover:opacity-90"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
