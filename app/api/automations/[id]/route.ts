import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import Automation from '@/models/Automation'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

await clientPromise

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const automation = await Automation.findOne({
      _id: new ObjectId(params.id),
      userId: session.userId,
    })

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(automation)
  } catch (error) {
    console.error('GET /api/automations/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const automation = await Automation.findOneAndUpdate(
      { _id: new ObjectId(params.id), userId: session.userId },
      body,
      { new: true }
    )

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(automation)
  } catch (error) {
    console.error('PUT /api/automations/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update automation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const automation = await Automation.findOneAndDelete({
      _id: new ObjectId(params.id),
      userId: session.userId,
    })

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/automations/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    )
  }
}
