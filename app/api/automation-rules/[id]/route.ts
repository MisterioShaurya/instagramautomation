import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import AutomationRule from '@/models/AutomationRule'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

await clientPromise

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

    const rule = await AutomationRule.findOneAndUpdate(
      { _id: new ObjectId(params.id), userId: session.userId },
      body,
      { new: true }
    )

    if (!rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error('PUT /api/automation-rules/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update automation rule' },
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

    const rule = await AutomationRule.findOneAndDelete({
      _id: new ObjectId(params.id),
      userId: session.userId,
    })

    if (!rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/automation-rules/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation rule' },
      { status: 500 }
    )
  }
}