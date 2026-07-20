import type { TaxReturn, Client, User, Role } from '@/domain/types'

/** Resolve a display name for a return, falling back to generated data. */
export function getReturnClientName(ret: TaxReturn, clients: Client[]): string {
  const client = clients.find((c) => c.id === ret.clientId)
  if (client) {
    // For business clients show the owner's name alongside the business so the
    // person is identifiable (e.g. "Alex Rivera — River & Pine Studio LLC").
    if (client.businessName && client.businessName !== client.name) {
      return `${client.name} — ${client.businessName}`
    }
    return client.name
  }
  if (ret.clientName) return ret.clientName
  return `Client ${ret.id.replace('RET-', '#')}`
}

/** Resolve the person responsible for the next action on a return. */
export function getNextResponsiblePerson(ret: TaxReturn, users: User[], clients: Client[]): string {
  const role: Role = ret.nextResponsibleRole
  if (role === 'reviewer') return users.find((u) => u.id === ret.reviewerId)?.name || 'Reviewer'
  if (role === 'tax_preparer') return users.find((u) => u.id === ret.preparerId)?.name || 'Preparer'
  if (role === 'individual_taxpayer' || role === 'business_owner') {
    return getReturnClientName(ret, clients)
  }
  return role.replace(/_/g, ' ')
}
