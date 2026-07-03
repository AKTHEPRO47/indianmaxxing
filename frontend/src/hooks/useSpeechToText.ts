import { useMemo, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

interface Options {
  lang?: string
  onText: (text: string) => void
}

export function useSpeechToText({ lang = 'en-US', onText }: Options) {
  const [listening, setListening] = useState(false)
  const [supported] = useState<boolean>(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const recognition = useMemo(() => {
    if (!supported) return null
    if (recognitionRef.current) return recognitionRef.current
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return null
    const instance = new Ctor()
    instance.lang = lang
    instance.continuous = false
    instance.interimResults = false
    instance.onresult = (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript?.trim()
      if (text) onText(text)
    }
    instance.onerror = () => setListening(false)
    instance.onend = () => setListening(false)
    recognitionRef.current = instance
    return instance
  }, [lang, onText, supported])

  const start = () => {
    if (!recognition || listening) return
    setListening(true)
    recognition.start()
  }

  const stop = () => {
    if (!recognition || !listening) return
    recognition.stop()
    setListening(false)
  }

  const toggle = () => {
    if (listening) stop()
    else start()
  }

  return { supported, listening, start, stop, toggle }
}
