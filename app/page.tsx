import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingView } from '@/components/landing/landing-view'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/inicio')
  }

  return <LandingView />
}
