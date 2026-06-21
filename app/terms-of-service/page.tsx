import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | DM Automation',
  description: 'Terms of service for DM Automation - Instagram DM automation service.',
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-accent transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 22, 2026</p>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DM Automation (&ldquo;the Service&rdquo;), you agree to be bound by
              these Terms of Service. If you do not agree to these terms, you may not use the Service.
            </p>
            <p className="mt-2">
              These terms apply to all visitors, users, and others who wish to access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              DM Automation is an AI-powered tool that automates responses to Instagram comments and
              direct messages. The Service:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Reads incoming comments on your Instagram posts via the Instagram Graph API.</li>
              <li>
                Generates AI-powered replies based on your configured automation rules and
                instructions.
              </li>
              <li>Sends automated replies as direct messages to commenters.</li>
              <li>Provides analytics on automation activity and engagement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">3. Eligibility and Registration</h2>
            <p>To use the Service, you must:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Be at least 18 years of age or the age of majority in your jurisdiction.</li>
              <li>
                Have a valid Instagram Business or Creator account (automation is only available
                for these account types through Meta's API).
              </li>
              <li>
                Comply with Meta's Platform Terms, Instagram Community Guidelines, and all
                applicable laws.
              </li>
              <li>Provide accurate and complete registration information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">4. User Responsibilities</h2>
            <p>As a user of the Service, you are responsible for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Content of Automated Replies:</strong> You control the instructions and
                tone of automated replies. You are solely responsible for the content generated
                and sent through the Service.
              </li>
              <li>
                <strong>Compliance:</strong> Ensuring your use of the Service complies with
                Instagram's Terms of Use, Meta's Platform Policies, and applicable laws
                and regulations.
              </li>
              <li>
                <strong>Account Security:</strong> Maintaining the confidentiality of your login
                credentials and any session tokens.
              </li>
              <li>
                <strong>Prohibited Uses:</strong> Not using the Service for spam, harassment, illegal
                activities, or any purpose that violates Meta's Community Guidelines.
              </li>
              <li>
                <strong>Reviewing Responses:</strong> We recommend regularly monitoring automated
                responses to ensure they align with your brand voice and comply with applicable
                regulations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">5. AI-Generated Content</h2>
            <p>
              The Service uses artificial intelligence (Anthropic's Claude API) to generate
              responses. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                AI-generated responses may not always be accurate, appropriate, or suitable for
                your audience. You are responsible for reviewing and approving the instructions
                that guide response generation.
              </li>
              <li>
                The Service is provided &ldquo;as is&rdquo; and we do not guarantee the quality,
                accuracy, or appropriateness of AI-generated content.
              </li>
              <li>
                We are not liable for any damages or harm arising from AI-generated responses
                sent through the Service.
              </li>
              <li>
                You retain all rights to the content generated on your behalf. However, you grant
                us a license to process this content as necessary to provide the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">6. Instagram API and Token Usage</h2>
            <p>
              The Service accesses Instagram data through Meta's Graph API. By connecting your
              account:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                You grant us permission to read your Instagram comments, media metadata, and
                account information as required to provide the Service.
              </li>
              <li>
                You grant us permission to send messages on your behalf via the
                <code className="bg-secondary px-1 py-0.5 rounded text-sm mx-1">private_replies</code>
                API endpoint.
              </li>
              <li>
                We store an encrypted access token to maintain the connection. This token is
                automatically refreshed before expiration to ensure uninterrupted service.
              </li>
              <li>
                You may revoke access at any time by disconnecting your Instagram account in
                settings or by deleting your account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">7. Fees and Payments</h2>
            <p>
              The Service may be offered on a subscription basis. Fees, if any, will be clearly
              communicated at the time of purchase. We reserve the right to change our pricing
              with reasonable notice. All fees are non-refundable except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, DM Automation shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including but not
              limited to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Loss of profits, data, or business opportunities.</li>
              <li>Damages resulting from automated messages sent through the Service.</li>
              <li>
                Service interruptions, API changes by Meta, or changes to Instagram's platform
                policies.
              </li>
              <li>
                Any unauthorized access to or use of our servers and/or any personal information
                stored therein.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">9. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
              NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              TIMELY, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">10. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account at any time, without prior
              notice, for conduct that we believe violates these Terms or is harmful to other users
              of the Service, us, or third parties, or for any other reason at our sole discretion.
            </p>
            <p className="mt-2">
              Upon termination, your access to the Service will cease immediately. We will delete
              your data in accordance with our Privacy Policy. You may also delete your data at
              any time via our{' '}
              <code className="bg-secondary px-1 py-0.5 rounded text-sm">
                POST /api/data-deletion
              </code>{' '}
              endpoint.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              11. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. Changes will be
              effective immediately upon posting. Your continued use of the Service after any
              changes constitutes acceptance of the new Terms. We will make reasonable efforts to
              notify users of material changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              12. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, United States, without regard to its conflict of law provisions.
              Any disputes arising from these Terms shall be resolved in the courts of Delaware.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">13. Contact</h2>
            <p>
              For questions about these Terms, please contact us at{' '}
              <a href="mailto:legal@dmautomation.app" className="text-accent hover:underline">
                legal@dmautomation.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}