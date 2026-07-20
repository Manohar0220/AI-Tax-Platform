import type { MessageThread, Message } from '@/domain/types'

export const DEMO_THREADS: MessageThread[] = [
  {
    id: 'thread-mortgage-request',
    returnId: 'RET-1001',
    subject: 'Missing mortgage interest statement',
    linkedDocumentId: 'doc-homefirst-mortgage',
    visibility: 'client_visible',
    participants: ['user-maya', 'user-sarah'],
    createdAt: '2026-01-15T10:00:00Z',
    lastMessageAt: '2026-01-17T14:20:00Z',
  },
  {
    id: 'thread-blurry-id',
    returnId: 'RET-1001',
    subject: 'Identity document needs replacement',
    linkedDocumentId: 'doc-blurry-id',
    visibility: 'client_visible',
    participants: ['user-maya', 'user-sarah'],
    createdAt: '2025-12-13T09:05:00Z',
    lastMessageAt: '2025-12-13T09:05:00Z',
  },
  {
    id: 'thread-wage-internal',
    returnId: 'RET-1001',
    subject: 'Acme W-2 wage discrepancy — internal notes',
    linkedDocumentId: 'doc-acme-w2',
    linkedFieldId: 'field-1001-wages-acme',
    visibility: 'internal_only',
    participants: ['user-maya', 'user-daniel'],
    createdAt: '2025-12-15T11:00:00Z',
    lastMessageAt: '2026-01-10T09:15:00Z',
  },
  {
    id: 'thread-equipment-issue',
    returnId: 'RET-2001',
    subject: 'Equipment purchase — business-use documentation',
    linkedDocumentId: 'doc-rp-equipment',
    linkedIssueId: 'issue-equipment-use',
    visibility: 'client_visible',
    participants: ['user-maya', 'user-alex'],
    createdAt: '2026-01-18T15:00:00Z',
    lastMessageAt: '2026-01-19T10:30:00Z',
  },
  {
    id: 'thread-equipment-internal',
    returnId: 'RET-2001',
    subject: 'Equipment deduction — review discussion',
    linkedDocumentId: 'doc-rp-equipment',
    linkedIssueId: 'issue-equipment-use',
    visibility: 'internal_only',
    participants: ['user-maya', 'user-daniel'],
    createdAt: '2026-01-18T14:50:00Z',
    lastMessageAt: '2026-01-18T15:30:00Z',
  },
  {
    id: 'thread-duplicate-w2',
    returnId: 'RET-1001',
    subject: 'Possible duplicate W-2 upload',
    linkedDocumentId: 'doc-acme-w2-duplicate',
    visibility: 'client_visible',
    participants: ['user-maya', 'user-sarah'],
    createdAt: '2025-12-20T09:00:00Z',
    lastMessageAt: '2025-12-20T09:00:00Z',
    nextActionOwner: 'client',
  },
]

export const DEMO_MESSAGES: Message[] = [
  // Thread: Missing mortgage
  {
    id: 'msg-mort-1',
    threadId: 'thread-mortgage-request',
    senderId: 'user-maya',
    content: 'Hi Manohar, I noticed we don\'t have your mortgage interest statement (Form 1098) from HomeFirst yet. Could you upload it when you have a chance? We need it to calculate your itemized deductions.',
    sentAt: '2026-01-15T10:00:00Z',
    readBy: ['user-maya', 'user-sarah'],
  },
  {
    id: 'msg-mort-2',
    threadId: 'thread-mortgage-request',
    senderId: 'user-sarah',
    content: 'I think it arrived in the mail last week. Let me find it and scan it. Should have it to you by end of week.',
    sentAt: '2026-01-16T18:30:00Z',
    readBy: ['user-maya', 'user-sarah'],
  },
  {
    id: 'msg-mort-3',
    threadId: 'thread-mortgage-request',
    senderId: 'user-maya',
    content: 'Perfect, no rush. Just upload it here when you\'re ready and I\'ll take it from there.',
    sentAt: '2026-01-17T14:20:00Z',
    readBy: ['user-maya'],
  },
  {
    // Internal note living inside a client-visible thread — Sarah must never see this.
    id: 'msg-mort-internal-1',
    threadId: 'thread-mortgage-request',
    senderId: 'user-maya',
    content: 'Note to self: if the 1098 does not arrive by Jan 31, fall back to the standard deduction — her itemized total is borderline this year.',
    sentAt: '2026-01-17T14:25:00Z',
    readBy: ['user-maya'],
    visibility: 'internal_only',
  },

  // Thread: Blurry ID
  {
    id: 'msg-id-1',
    threadId: 'thread-blurry-id',
    senderId: 'user-maya',
    content: 'Hi Manohar, the identity document you uploaded is too blurry for us to verify. Could you please upload a clearer photo or scan? Make sure all four corners are visible and the text is readable.',
    sentAt: '2025-12-13T09:05:00Z',
    readBy: ['user-maya'],
  },

  // Thread: Wage discrepancy internal
  {
    id: 'msg-wage-1',
    threadId: 'thread-wage-internal',
    senderId: 'user-maya',
    content: 'The AI pulled $48,250 from the Acme W-2 but the prior year shows $82,100. I think the scan quality caused a misread on the first digit. Going to correct to $84,250 based on the physical copy I requested.',
    sentAt: '2025-12-15T11:00:00Z',
    readBy: ['user-maya', 'user-daniel'],
  },
  {
    id: 'msg-wage-2',
    threadId: 'thread-wage-internal',
    senderId: 'user-daniel',
    content: 'Good catch. Makes sense given the prior year. Please document the correction reason when you override it.',
    sentAt: '2025-12-15T14:00:00Z',
    readBy: ['user-maya', 'user-daniel'],
  },
  {
    id: 'msg-wage-3',
    threadId: 'thread-wage-internal',
    senderId: 'user-maya',
    content: 'Will do — planning to override Box 1 to $84,250 with the reason "OCR misread first digit; verified against physical copy," then send it your way for review.',
    sentAt: '2026-01-10T09:15:00Z',
    readBy: ['user-maya', 'user-daniel'],
  },

  // Thread: Equipment issue client-facing
  {
    id: 'msg-equip-1',
    threadId: 'thread-equipment-issue',
    senderId: 'user-maya',
    content: 'Hi Alex, regarding the $12,500 equipment purchase from TechSupply Pro — we need to know what percentage of the equipment is used for business purposes versus personal. Could you provide a brief written statement explaining the business use?',
    sentAt: '2026-01-18T15:00:00Z',
    readBy: ['user-maya', 'user-alex'],
  },
  {
    id: 'msg-equip-2',
    threadId: 'thread-equipment-issue',
    senderId: 'user-alex',
    content: 'It\'s a high-end camera system for studio photography. I\'d say about 85% business, 15% personal. I can write something up — what format do you need?',
    sentAt: '2026-01-19T10:30:00Z',
    readBy: ['user-maya', 'user-alex'],
  },

  // Thread: Equipment internal
  {
    id: 'msg-equip-int-1',
    threadId: 'thread-equipment-internal',
    senderId: 'user-daniel',
    content: 'Maya, the equipment invoice needs a business-use percentage before I can approve the Section 179 deduction. Please get documentation from the client.',
    sentAt: '2026-01-18T14:50:00Z',
    readBy: ['user-maya', 'user-daniel'],
  },
  {
    id: 'msg-equip-int-2',
    threadId: 'thread-equipment-internal',
    senderId: 'user-maya',
    content: 'Agreed. I\'ve reached out to Alex. He says about 85% business use. Getting a written statement to support it.',
    sentAt: '2026-01-18T15:30:00Z',
    readBy: ['user-maya', 'user-daniel'],
  },

  // Thread: Duplicate W-2 warning
  {
    id: 'msg-dup-1',
    threadId: 'thread-duplicate-w2',
    senderId: 'user-maya',
    content: 'Hi Manohar, it looks like the Acme Corporation W-2 was uploaded twice. Can you confirm whether these are the same document, or if the second one is different (for example, a corrected W-2c)?',
    sentAt: '2025-12-20T09:00:00Z',
    readBy: ['user-maya'],
  },
]
