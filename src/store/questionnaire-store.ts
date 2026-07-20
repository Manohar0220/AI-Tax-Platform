import { create } from 'zustand'
import type { QuestionItem } from '@/data/questionnaires'
import { DEMO_QUESTIONS } from '@/data/questionnaires'

const STORAGE_KEY = 'ledgerbridge-questions'

function loadQuestions(): QuestionItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return structuredClone(DEMO_QUESTIONS)
}

function saveQuestions(questions: QuestionItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions))
}

interface QuestionnaireState {
  questions: QuestionItem[]
  answerQuestion: (questionId: string, answer: string) => void
  clearAnswer: (questionId: string) => void
  getQuestionsForReturn: (returnId: string) => QuestionItem[]
  /** Mark a question as sent to the client by the preparer. */
  sendToClient: (questionId: string) => void
  reset: () => void
}

export const useQuestionnaireStore = create<QuestionnaireState>((set, get) => ({
  questions: loadQuestions(),

  answerQuestion: (questionId, answer) => {
    const questions = get().questions.map((q) =>
      q.id === questionId
        ? { ...q, answer, answeredAt: new Date().toISOString() }
        : q
    )
    saveQuestions(questions)
    set({ questions })
  },

  clearAnswer: (questionId) => {
    const questions = get().questions.map((q) =>
      q.id === questionId
        ? { ...q, answer: undefined, answeredAt: undefined }
        : q
    )
    saveQuestions(questions)
    set({ questions })
  },

  getQuestionsForReturn: (returnId) => {
    return get().questions.filter((q) => q.returnId === returnId)
  },

  sendToClient: (questionId) => {
    const questions = get().questions.map((q) =>
      q.id === questionId ? { ...q, sentToClient: true } : q,
    )
    saveQuestions(questions)
    set({ questions })
  },

  reset: () => {
    const fresh = structuredClone(DEMO_QUESTIONS)
    // All questions start as not-yet-sent-to-client.
    const resetQuestions = fresh.map((q) => ({ ...q, sentToClient: false, answer: undefined, answeredAt: undefined }))
    saveQuestions(resetQuestions)
    set({ questions: resetQuestions })
  },
}))
