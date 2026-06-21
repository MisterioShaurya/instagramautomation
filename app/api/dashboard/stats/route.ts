import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import Automation from '@/models/Automation'
import ActivityLog from '@/models/ActivityLog'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  await clientPromise
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId

    // Get automation stats
    const totalAutomations = await Automation.countDocuments({ userId })
    const activeAutomations = await Automation.countDocuments({
      userId,
      enabled: true,
    })

    // Get activity stats
    const recentActivity = await ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)

    const totalTriggers = await ActivityLog.countDocuments({
      userId,
      type: 'trigger',
    })

    const totalResponses = await ActivityLog.countDocuments({
      userId,
      type: 'response',
    })

    // Calculate total engagement from automations
    const automationStats = await Automation.find({ userId }).select('stats')
    const totalEngagement = automationStats.reduce(
      (sum, auto) => sum + (auto.stats?.engagementRate || 0),
      0
    )

    return NextResponse.json({
      totalAutomations,
      activeAutomations,
      totalTriggers,
      totalResponses,
      engagementRate:
        totalAutomations > 0
          ? Math.round(totalEngagement / totalAutomations)
          : 0,
      recentActivity,
    })
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
