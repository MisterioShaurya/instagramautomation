import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import AutomationRule from '@/models/AutomationRule'
import { connectDB } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  await connectDB()
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')

    const filter: { userId: string; mediaId?: string } = {
      userId: session.userId,
    }

    if (mediaId) {
      filter.mediaId = mediaId
    }

    const rules = await AutomationRule.find(filter).sort({ createdAt: -1 })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('GET /api/automation-rules error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  await connectDB()
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.mediaId || !body.keyword || !body.dmMessage) {
      return NextResponse.json(
        { error: 'mediaId, keyword, and dmMessage are required' },
        { status: 400 }
      )
    }

    const rule = await AutomationRule.create({
      userId: session.userId,
      instagramUserId: body.instagramUserId || '',
      mediaId: body.mediaId,
      mediaThumbnail: body.mediaThumbnail || '',
      keyword: body.keyword.trim(),
      matchType: body.matchType || 'contains',
      dmMessage: body.dmMessage.trim(),
      active: body.active !== undefined ? body.active : true,
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('POST /api/automation-rules error:', error)
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500 }
    )
  }
}