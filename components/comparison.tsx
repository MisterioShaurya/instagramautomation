export function Comparison() {
  const comparisons = [
    {
      feature: 'AI Conversation Engine',
      ours: true,
      theirs: false,
    },
    {
      feature: 'Natural Language Understanding',
      ours: true,
      theirs: false,
    },
    {
      feature: 'Rigid Keyword Matching',
      ours: false,
      theirs: true,
    },
    {
      feature: 'Lead Qualification',
      ours: true,
      theirs: false,
    },
    {
      feature: 'Brand Voice Training',
      ours: true,
      theirs: false,
    },
    {
      feature: 'Setup Time (hours)',
      ours: '<1',
      theirs: '2-4',
    },
    {
      feature: 'Monthly Price',
      ours: 'Starting at $99',
      theirs: 'Starting at $79*',
    },
    {
      feature: 'Email/Comment Support',
      ours: true,
      theirs: true,
    },
  ]

  return (
    <section className="py-24 px-4 bg-secondary/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Why Choose Us Over ManyChat?
          </h2>
          <p className="text-lg text-muted-foreground text-balance">
            Real AI that actually understands your audience
          </p>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg bg-background">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left font-semibold text-foreground">
                  Feature
                </th>
                <th className="px-6 py-4 text-center font-semibold text-accent">
                  Our Platform
                </th>
                <th className="px-6 py-4 text-center font-semibold text-muted-foreground">
                  ManyChat
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((item, index) => (
                <tr
                  key={index}
                  className={`border-b border-border ${
                    index % 2 === 0 ? 'bg-secondary/20' : ''
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-foreground">
                    {item.feature}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {typeof item.ours === 'boolean' ? (
                      <div className="flex justify-center">
                        {item.ours ? (
                          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-accent"></div>
                          </div>
                        ) : (
                          <div className="text-2xl text-muted-foreground">−</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-accent font-semibold">{item.ours}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {typeof item.theirs === 'boolean' ? (
                      <div className="flex justify-center">
                        {item.theirs ? (
                          <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-muted"></div>
                          </div>
                        ) : (
                          <div className="text-2xl text-muted-foreground">−</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{item.theirs}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          * ManyChat pricing increases significantly with higher volume. Our pricing stays flat.
        </p>
      </div>
    </section>
  )
}
