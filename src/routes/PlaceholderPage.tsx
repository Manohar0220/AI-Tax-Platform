import { Card } from '@/components/feedback'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="p-4 md:p-6">
      <Card padding="lg">
        <h1 className="text-xl font-semibold text-text-primary mb-2">{title}</h1>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </Card>
    </div>
  )
}
