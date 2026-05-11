import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './dashboard-client'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('id', user.id)
    .single()

  return (
    <DashboardClient
      userName={profile?.nome || user.email?.split('@')[0] || 'Usuário'}
      userEmail={profile?.email || user.email || ''}
    >
      {children}
    </DashboardClient>
  )
}
