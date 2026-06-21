import Anthropic from '@anthropic-ai/sdk'

/**
 * Claude API Integration
 * Generates AI-powered responses for Instagram DMs and comments
 * Uses Claude Sonnet for fast, high-quality responses
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface GenerateAIResponseParams {
  userMessage: string // The actual comment/DM from the Instagram user
  systemPrompt: string // Brand-specific instructions (e.g., tone, personality)
  tone?: 'professional' | 'friendly' | 'casual' | 'formal'
}

/**
 * Generate an AI response using Claude Sonnet
 * The response is natural, personalized, and matches the brand's tone
 */
export async function generateAIResponse(
  params: GenerateAIResponseParams
): Promise<string> {
  try {
    const { userMessage, systemPrompt, tone } = params

    // Build the system prompt with tone guidance
    const enhancedSystemPrompt = buildSystemPrompt(systemPrompt, tone)

    console.log('[claude] Generating response for message:', userMessage.substring(0, 50))

    // Call Claude API with streaming disabled (we need the full response at once)
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Latest Claude Sonnet model
      max_tokens: 500, // Instagram DMs/comments should be concise
      system: enhancedSystemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    // Extract the text response
    const response = message.content[0]

    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    console.log('[claude] Generated response:', response.text.substring(0, 100))

    return response.text
  } catch (error) {
    console.error('[claude] API error:', error)
    throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Build an enhanced system prompt that includes tone and brand context
 */
function buildSystemPrompt(basePrompt: string, tone?: string): string {
  let enhanced = basePrompt

  // Add tone guidance
  if (tone) {
    const toneGuides: Record<string, string> = {
      professional:
        'Maintain a professional and business-appropriate tone. Be courteous and helpful.',
      friendly:
        'Be warm, personable, and approachable. Use casual language while remaining helpful.',
      casual:
        'Keep it relaxed and conversational. Use casual language and a light tone.',
      formal:
        'Maintain a formal and respectful tone. Use proper grammar and business etiquette.',
    }

    enhanced += `\n\nTone: ${toneGuides[tone] || toneGuides.professional}`
  }

  // Add Instagram context
  enhanced += `
  
Guidelines for Instagram responses:
- Keep responses concise (1-3 sentences max for comments, 2-5 for DMs)
- Use natural, conversational language
- Avoid hashtags unless appropriate for the context
- Be helpful and genuine
- End with a call-to-action when appropriate (e.g., "Check out our page!" or "Let me help!")
- If the user asks a question, always attempt to answer it
- Never offer to provide services outside your business scope`

  return enhanced
}

/**
 * Generate a batch of responses for testing
 * Useful for previewing how the AI would respond to sample messages
 */
export async function generateBatchResponses(
  samples: Array<{ message: string; systemPrompt: string; tone?: string }>
): Promise<string[]> {
  try {
    const responses = await Promise.all(
      samples.map((sample) =>
        generateAIResponse({
          userMessage: sample.message,
          systemPrompt: sample.systemPrompt,
          tone: sample.tone,
        })
      )
    )

    return responses
  } catch (error) {
    console.error('[claude] Batch generation error:', error)
    throw error
  }
}
