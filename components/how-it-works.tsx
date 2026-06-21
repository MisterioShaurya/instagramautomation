export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Connect Instagram',
      description: 'Link your Instagram account securely in seconds. We never store passwords, just API access.',
      icon: '📱',
    },
    {
      number: '02',
      title: 'Set Triggers',
      description: 'Define when AI should respond: specific keywords, new followers, story interactions, or custom rules.',
      icon: '⚡',
    },
    {
      number: '03',
      title: 'AI Handles the Rest',
      description: 'Our AI automatically responds with natural conversations, qualifies leads, and matches your brand tone.',
      icon: '🤖',
    },
  ]

  return (
    <section className="py-24 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
            Get up and running in minutes, not days
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-background border border-border rounded-lg p-8 h-full">
                <div className="text-4xl mb-4">{step.icon}</div>
                <div className="text-5xl font-bold text-accent/30 mb-2">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold">
                    →
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
