import TeamDetailClient from './TeamDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page({ params }: { params: { slug: string } }) {
  return <TeamDetailClient slug={params.slug} />
}
