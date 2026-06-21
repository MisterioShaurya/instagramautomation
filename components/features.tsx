export function Features() {
  const features = [
    {
      icon: '💬',
      title: 'Comment-to-DM Automation',
      description: 'Automatically reply to reel comments and convert them into DM conversations. Never miss engagement again.',
    },
    {
      icon: '🧠',
      title: 'Real AI Conversations',
      description: 'Uses GPT-4 to understand context and hold natural conversations. No rigid keyword matching.',
    },
    {
      icon: '📖',
      title: 'Story Automation',
      description: 'Respond to story replies with smart messages. Build relationships at scale.',
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Track response rates, conversions, and lead quality. Optimize with real data.',
    },
    {
      icon: '🎯',
      title: 'Lead Qualification',
      description: 'AI automatically qualifies leads based on your criteria. Focus on hot prospects.',
    },
    {
      icon: '🎨',
      title: 'Brand Voice Matching',
      description: 'Train the AI on your previous messages. Responses sound like you, not a bot.',
    },
  ]

  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Powerful Features Built for You
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
            Everything you need to automate and scale your Instagram sales funnel
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-secondary/50 border border-border rounded-lg p-6 hover:border-accent/50 transition-colors"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
