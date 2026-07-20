/**
 * Component-level interaction tests.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useDemoStore } from '@/store/demo-store'
import { useAuthStore } from '@/store/auth-store'
import { createSeedState } from '@/data/seed'
import { DEMO_USERS } from '@/data/users'
import { AIRecommendationCard } from '@/features/ai-review/AIRecommendationCard'
import { validateFile } from '@/services/document-service'
import type { AIRecommendation } from '@/domain/types'

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function loginAs(userId: string) {
  const user = DEMO_USERS.find((u) => u.id === userId)!
  useAuthStore.getState().login(user)
}

const lowConfRec: AIRecommendation = {
  id: 'test-rec',
  returnId: 'RET-1001',
  fieldId: 'field-1001-wages-acme',
  documentId: 'doc-acme-w2',
  type: 'warning',
  title: 'Wage extraction confidence is low',
  description: 'The AI extracted $48,250 but the document may show a different value.',
  evidence: 'W-2 Page 1, Box 1. Confidence: 42%.',
  uncertainty: 'The first digit may be misread.',
  alternativeActions: ['Open the source document'],
  confidence: 'low',
  confidenceScore: 42,
  suggestedAction: 'Open the W-2 and correct the value.',
  status: 'pending',
  createdAt: '2025-12-12T10:35:00Z',
}

describe('AI recommendation card — low-confidence field', () => {
  beforeEach(() => {
    localStorage.clear()
    useDemoStore.setState(createSeedState())
    useAuthStore.setState({ currentUser: null, activeRole: null, activeWorkspace: 'firm', isAuthenticated: false })
  })

  it('shows a "Low confidence" certainty badge, not a raw percentage', () => {
    loginAs('user-maya')
    wrap(<AIRecommendationCard rec={lowConfRec} viewerRole="tax_preparer" viewerUserId="user-maya" />)
    // The badge text is the plain-language label, not the numeric score.
    expect(screen.getByText('Low confidence')).toBeInTheDocument()
    // Raw "42%" must NOT appear as a top-level element (it lives inside the expand).
    expect(screen.queryByText(/^42%$/)).not.toBeInTheDocument()
  })

  it('expands to show evidence and the open-evidence action', () => {
    loginAs('user-maya')
    const onOpenEvidence = vi.fn()
    wrap(
      <AIRecommendationCard
        rec={lowConfRec}
        viewerRole="tax_preparer"
        viewerUserId="user-maya"
        onOpenEvidence={onOpenEvidence}
      />
    )
    fireEvent.click(screen.getByText('Show evidence & details'))
    expect(screen.getByText(/W-2 Page 1, Box 1/)).toBeInTheDocument()
    expect(screen.getByText('Open supporting evidence')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Open supporting evidence'))
    expect(onOpenEvidence).toHaveBeenCalledWith(lowConfRec)
  })

  it('requires a reason before dismissing', () => {
    loginAs('user-maya')
    wrap(<AIRecommendationCard rec={lowConfRec} viewerRole="tax_preparer" viewerUserId="user-maya" />)
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss recommendation' }))
    expect(screen.getByText('A reason is required to dismiss.')).toBeInTheDocument()
  })

  it('clients see no action buttons', () => {
    loginAs('user-sarah')
    wrap(<AIRecommendationCard rec={lowConfRec} viewerRole="individual_taxpayer" viewerUserId="user-sarah" />)
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dismiss/ })).not.toBeInTheDocument()
  })
})

describe('upload states — validation (pure service, no DOM dialog)', () => {
  it('rejects unsupported file types', () => {
    const bad = new File(['x'], 'test.docx', { type: 'application/vnd.openxmlformats' })
    const result = validateFile(bad)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/unsupported file type/i)
  })

  it('rejects files over 25 MB', () => {
    const big = new File([new ArrayBuffer(26 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' })
    const result = validateFile(big)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/too large/i)
  })

  it('accepts valid PDF, JPG, PNG', () => {
    expect(validateFile(new File(['x'], 'a.pdf', { type: 'application/pdf' })).valid).toBe(true)
    expect(validateFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' })).valid).toBe(true)
    expect(validateFile(new File(['x'], 'a.png', { type: 'image/png' })).valid).toBe(true)
  })
})
