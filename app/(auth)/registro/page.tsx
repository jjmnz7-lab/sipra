import { OnboardingWizard } from '@/components/domain/auth/onboarding-wizard'

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token || ''

  return <OnboardingWizard token={token} />
}
