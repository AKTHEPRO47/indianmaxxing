import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Mic, MicOff } from 'lucide-react'
import { askCopilot } from '../api/client'
import type { Evidence } from '../types'
import { confidenceLabel, confidenceColor, formatDate } from '../utils/helpers'
import { clsx } from 'clsx'
import { useSpeechToText } from '../hooks/useSpeechToText'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Evidence[]
  confidence?: number
}

interface Props {
  companyId: number
  companyName: string
}

const SUGGESTED = [
  'What are the Scope 1 and 2 emissions?',
  'Why was this ESG score assigned?',
  'What controversy risks exist?',
  'How advanced is AI adoption?',
  'What is the Scope 3 position?',
]

export default function CopilotChat({ companyId, companyName }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `I'm the ESG Copilot for ${companyName}. I answer questions using only verified evidence from filings, reports and news signals. Ask me anything about ESG performance, momentum, controversies or AI adoption.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { supported: voiceSupported, listening, toggle } = useSpeechToText({
    onText: (text) => setInput(prev => `${prev}${prev ? ' ' : ''}${text}`),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (question: string) => {
    if (!question.trim() || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await askCopilot(companyId, question)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        confidence: res.confidence,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={clsx('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : '')}>
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-emerald-100' : 'bg-slate-200'
            )}>
              {msg.role === 'assistant'
                ? <Bot className="w-3.5 h-3.5 text-emerald-600" />
                : <User className="w-3.5 h-3.5 text-slate-600" />
              }
            </div>

            <div className={clsx(
              'flex-1 max-w-[85%]',
              msg.role === 'user' ? 'flex flex-col items-end' : ''
            )}>
              <div className={clsx(
                'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                msg.role === 'assistant'
                  ? 'bg-slate-50 border border-slate-100 text-slate-800'
                  : 'bg-emerald-600 text-white'
              )}>
                <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
              </div>

              {msg.confidence !== undefined && (
                <div className={clsx('text-[10px] mt-1 px-1', confidenceColor(msg.confidence))}>
                  Response confidence: {confidenceLabel(msg.confidence)} ({Math.round(msg.confidence * 100)}%)
                </div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.sources.slice(0, 2).map(src => (
                    <div key={src.id} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-[10px] text-blue-700">
                      <span className="font-semibold">{src.source_name ?? src.source_type}</span>
                      {src.source_date && <span className="ml-1 opacity-70">· {formatDate(src.source_date)}</span>}
                      {src.page_number && <span className="ml-1 opacity-70">· p.{src.page_number}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length < 3 && (
        <div className="px-4 pb-2">
          <div className="section-label mb-2">Suggested questions</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder={`Ask about ${companyName}...`}
            className="input-base flex-1"
          />
          {voiceSupported && (
            <button
              onClick={toggle}
              className="btn-secondary px-3 py-2"
              title={listening ? 'Stop voice input' : 'Start voice input'}
            >
              {listening ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="btn-primary px-3 py-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 px-0.5">
          Answers cite verified evidence only. No hallucination guarantee.
        </p>
      </div>
    </div>
  )
}
