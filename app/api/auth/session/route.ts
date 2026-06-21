import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(null, { status: 401 })
  }
  return NextResponse.json(session)
}