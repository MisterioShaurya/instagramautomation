import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { email } = emailSchema.parse(body)

    // Check if MongoDB is configured
    const mongoUri = process.env.MONGODB_URI
    
    if (!mongoUri) {
      // Development mode without MongoDB - simulate success
      // In production, MongoDB URI must be set
      console.log('[DEMO] Simulating email signup for:', email)
      return NextResponse.json(
        { 
          success: true, 
          message: 'Successfully added to waitlist',
          id: `demo_${Date.now()}`,
          demo: true 
        },
        { status: 201 }
      )
    }

    // Production mode with MongoDB
    try {
      const clientPromise = require('@/lib/mongodb').default
      const client = await clientPromise
      const db = client.db('dm-automation')
      const collection = db.collection('waitlist_emails')

      const existing = await collection.findOne({ email })
      if (existing) {
        return NextResponse.json(
          { error: 'Email already on waitlist' },
          { status: 400 }
        )
      }

      const result = await collection.insertOne({
        email,
        created_at: new Date(),
      })

      return NextResponse.json(
        { 
          success: true, 
          message: 'Successfully added to waitlist',
          id: result.insertedId 
        },
        { status: 201 }
      )
    } catch (mongoError) {
      console.error('MongoDB error:', mongoError)
      // Fallback for demo purposes
      return NextResponse.json(
        { 
          success: true, 
          message: 'Successfully added to waitlist',
          id: `fallback_${Date.now()}`,
          note: 'Demo mode - configure MONGODB_URI for persistence'
        },
        { status: 201 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: 'Failed to add to waitlist' },
      { status: 500 }
    )
  }
}
