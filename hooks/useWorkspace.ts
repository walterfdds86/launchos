'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, WorkspaceMember } from '@/types'

export function useWorkspace() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [member, setMember] = useState<WorkspaceMember | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select('*, workspace:workspaces(*)')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (error) {
        console.error('[useWorkspace]', error)
        setLoading(false)
        return
      }

      if (memberships) {
        setWorkspace(memberships.workspace as Workspace)
        setMember(memberships as WorkspaceMember)
      }
      setLoading(false)
    }
    load()
  }, [])

  return { workspace, member, loading }
}
