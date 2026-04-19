'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Task } from '@/types'

export async function updateTaskStatus(taskId: string, newStatus: Task['status']) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId)
    .eq('assigned_to', user.id)

  revalidatePath('/meu-dia')
}
