import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session-server'
import AutomationRule from '@/models/AutomationRule'
import SentReply from '@/models/SentReply'
import { connectDB } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  await connectDB()
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId

    // Get real automation rule stats
    const totalRules = await AutomationRule.countDocuments({ userId })
    const activeRules = await AutomationRule.countDocuments({
      userId,
      active: true,
    })

    // Get total reels/media with rules
    const reelsWithRules = await AutomationRule.distinct('mediaId', { userId })

    // Get real SentReply stats for this user's rules
    const userRules = await AutomationRule.find({ userId }).select('_id').lean()
    const userRuleIds = userRules.map(r => r._id)

    const totalDMsSent = await SentReply.countDocuments({
      ruleId: { $in: userRuleIds },
    })

    // Count replies by type
    const commentReplies = await SentReply.countDocuments({
      ruleId: { $in: userRuleIds },
      replyType: { $in: ['comment', 'both'] },
    })

    const dmReplies = await SentReply.countDocuments({
      ruleId: { $in: userRuleIds },
      replyType: { $in: ['dm', 'both'] },
    })

    // Get recent activity (last 20 sent replies)
    const recentActivity = await SentReply.find({
      ruleId: { $in: userRuleIds },
    })
      .sort({ sentAt: -1 })
      .limit(10)
      .populate('ruleId', 'keyword mediaId')
      .lean()

    // Format recent activity for the front-end
    const formattedActivity = recentActivity.map((item: any) => ({
      id: item._id,
      type: 'response',
      description: `Replied to comment "${item.commentId?.substring(0, 20)}..." via rule: ${item.ruleId?.keyword || 'unknown'}`,
      createdAt: item.sentAt,
      replyType: item.replyType,
    }))

    return NextResponse.json({
      totalAutomations: totalRules,
      activeAutomations: activeRules,
      totalTriggers: commentReplies,
      totalResponses: dmReplies,
      engagementRate: totalRules > 0 ? Math.round((commentReplies / totalRules) * 100) : 0,
      totalReelsWithRules: reelsWithRules.length,
      totalCommentsReplied: commentReplies,
      totalDMsSent,
      recentActivity: formattedActivity,
    })
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
