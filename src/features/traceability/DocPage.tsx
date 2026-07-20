import { cn } from '@/utils/cn'

interface DocPageProps {
  type: string
  name: string
  page: number
  highlightSection: string | null
  highlightValue?: string
}

interface BoxDef {
  section: string
  label: string
  placeholder: string
}

const FORM_BOXES: Record<string, BoxDef[]> = {
  'W-2': [
    { section: 'Box 1', label: 'Box 1 — Wages, tips, other comp.', placeholder: '$ ——,———' },
    { section: 'Box 2', label: 'Box 2 — Federal income tax withheld', placeholder: '$ —,———' },
    { section: 'Box 3', label: 'Box 3 — Social security wages', placeholder: '$ ——,———' },
    { section: 'Box 4', label: 'Box 4 — Social security tax withheld', placeholder: '$ —,———' },
    { section: 'Box 5', label: 'Box 5 — Medicare wages and tips', placeholder: '$ ——,———' },
  ],
  '1099-INT': [
    { section: 'Box 1', label: 'Box 1 — Interest income', placeholder: '$ —,———' },
    { section: 'Box 2', label: 'Box 2 — Early withdrawal penalty', placeholder: '$ 0' },
    { section: 'Box 4', label: 'Box 4 — Federal income tax withheld', placeholder: '$ 0' },
  ],
  '1099-DIV': [
    { section: 'Box 1a', label: 'Box 1a — Total ordinary dividends', placeholder: '$ —,———' },
    { section: 'Box 1b', label: 'Box 1b — Qualified dividends', placeholder: '$ —,———' },
    { section: 'Consolidated 1099 Summary', label: 'Consolidated 1099 Summary', placeholder: '$ —,———' },
  ],
  '1098': [
    { section: 'Box 1', label: 'Box 1 — Mortgage interest received', placeholder: '$ —,———' },
    { section: 'Box 2', label: 'Box 2 — Outstanding mortgage principal', placeholder: '$ ———,———' },
  ],
}

function genericBoxes(): BoxDef[] {
  return [
    { section: 'Total Paid', label: 'Total amount', placeholder: '$ —,———' },
    { section: 'Donation Amount', label: 'Amount', placeholder: '$ —,———' },
  ]
}

export function DocPage({ type, name, page, highlightSection, highlightValue }: DocPageProps) {
  const boxes = FORM_BOXES[type] ?? genericBoxes()
  const issuer = name.replace(/ (W-2|Interest Statement|Investment Statement|Statement|Receipt|Return)$/i, '')

  return (
    <div className="bg-white rounded-md shadow-sm border border-neutral-300 w-full max-w-[34rem] mx-auto p-5 text-neutral-800">
      {/* Form header */}
      <div className="flex items-start justify-between border-b border-neutral-300 pb-2 mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{type} · Tax Year 2025</p>
          <p className="text-sm font-semibold">{issuer}</p>
        </div>
        <div className="text-right text-[10px] text-neutral-400">
          <p>OMB No. 1545-0008</p>
          <p>Page {page}</p>
        </div>
      </div>

      {page > 1 ? (
        <div className="py-10 text-center text-sm text-neutral-400">
          Page {page} — continued detail
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Recipient</span>
            <span>Masked · ***-**-4521</span>
          </div>
          {boxes.map((b) => {
            const isHit = highlightSection && b.section.toLowerCase() === highlightSection.toLowerCase()
            return (
              <div
                key={b.section}
                className={cn(
                  'flex items-center justify-between rounded border px-2.5 py-1.5 text-sm',
                  isHit ? 'border-warning-500 bg-warning-100 ring-2 ring-warning-500/40' : 'border-neutral-200',
                )}
              >
                <span className={cn('text-xs', isHit ? 'font-semibold text-warning-800' : 'text-neutral-600')}>{b.label}</span>
                <span className={cn('font-mono', isHit ? 'font-semibold text-warning-800' : 'text-neutral-400')}>
                  {isHit && highlightValue ? highlightValue : b.placeholder}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-200">
        Fabricated document for demonstration. Not a real tax form.
      </p>
    </div>
  )
}
