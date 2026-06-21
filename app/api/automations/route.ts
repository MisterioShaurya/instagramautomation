import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import Automation from '@/models/Automation'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  await clientPromise
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const automations = await Automation.find({ userId: session.userId }).sort({
      createdAt: -1,
    })

    return NextResponse.json(automations)
  } catch (error) {
    console.error('GET /api/automations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  await clientPromise
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const automation = await Automation.create({
      userId: session.userId,
      ...body,
    })

    return NextResponse.json(automation, { status: 201 })
  } catch (error) {
    console.error('POST /api/automations error:', error)
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    )
  }
}
