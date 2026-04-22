'use server'
import { createClient } from '@/lib/supabase/server'
import type { TaskStatus } from '@/types'

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
}
