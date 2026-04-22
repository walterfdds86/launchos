'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { Topbar } from '@/components/layout/Topbar'
import { KickstartChat } from './KickstartChat'
import { PlanPreview } from './PlanPreview'
import type { KickstartPlan } from '@/types'

export default function NovoProjetoPage() {
  const { workspace } = useWorkspace()
  const [plan, setPlan] = useState<KickstartPlan | null>(null)

  return (
    <>
      <Topbar title="Novo Projeto" />
      <div className="flex-1 overflow-y-auto p-6">
        {!plan ? (
          <KickstartChat
            workspaceId={workspace?.id ?? ''}
            onPlanGenerated={setPlan}
          />
        ) : (
          <PlanPreview
            plan={plan}
            workspaceId={workspace?.id ?? ''}
            onBack={() => setPlan(null)}
          />
        )}
      </div>
    </>
  )
}
