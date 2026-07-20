import type { AuditEvent, Task, TaskStatus } from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'

function pushAudit(returnId: string, userId: string, action: string, target: string, details: string) {
  const state = useDemoStore.getState()
  const event: AuditEvent = {
    id: `audit-${action}-${Date.now()}`,
    returnId, userId, action, target, details,
    timestamp: new Date().toISOString(),
  }
  state.updateState({ auditEvents: [...state.auditEvents, event] })
}

export function setTaskStatus(taskId: string, status: TaskStatus, byUserId: string) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  let returnId = ''
  const tasks = state.tasks.map((t) => {
    if (t.id !== taskId) return t
    returnId = t.returnId
    return { ...t, status, completedAt: status === 'completed' ? now : null }
  })
  state.updateState({ tasks })
  pushAudit(returnId, byUserId, 'task_status_changed', taskId, `Task marked ${status.replace('_', ' ')}`)
}

export function tasksForUser(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.assignedTo === userId)
}
