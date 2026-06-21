import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | DM Automation',
  description: 'Privacy policy for DM Automation - Instagram DM automation service.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-accent transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 22, 2026</p>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              DM Automation (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our Instagram DM automation service.
            </p>
            <p className="mt-2">
              By using our service, you agree to the collection and use of information in accordance with
              this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.1 Instagram Account Data</h3>
            <p>When you connect your Instagram account to our service, we collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Instagram Profile Information:</strong> Your Instagram user ID, username,
                display name, and profile picture URL.
              </li>
              <li>
                <strong>Instagram Media:</strong> Information about your Instagram media posts
                (reels, images, videos) including media IDs, captions, and engagement metrics.
              </li>
              <li>
                <strong>Comments:</strong> Comments left on your Instagram posts, including the
                comment text, author ID, and timestamp.
              </li>
              <li>
                <strong>Direct Messages:</strong> Messages sent and received through our
                automation system. We do not store your full DM history — only messages
                generated or processed by our automation rules.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.2 Access Tokens</h3>
            <p>
              We store an encrypted Instagram long-lived access token that allows us to read
              comments, send automated replies, and manage your Instagram integration. This token
              is encrypted at rest and is never shared with third parties.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.3 Account Information</h3>
            <p>
              If you create an account directly, we collect your email address. If you connect via
              Instagram OAuth, we use your Instagram user ID as your primary identifier.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Providing the Service:</strong> To read and respond to comments and
                direct messages on your Instagram account based on your configured automation rules.
              </li>
              <li>
                <strong>AI-Powered Responses:</strong> To generate automated replies using AI
                (Claude API) based on the content of incoming comments and your configured
                instructions. The comment text is sent to our AI provider for response generation.
              </li>
              <li>
                <strong>Token Management:</strong> To automatically refresh your Instagram access
                token before it expires, ensuring uninterrupted service.
              </li>
              <li>
                <strong>Improving the Service:</strong> To analyze usage patterns and improve our
                automation algorithms.
              </li>
              <li>
                <strong>Communication:</strong> To send you service-related notifications, such
                as automation activity summaries or important account updates.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">4. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share data only in the following circumstances:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>AI Service Provider:</strong> Comment text is sent to Anthropic (Claude API)
                solely for the purpose of generating automated responses. Anthropic does not use
                your data to train their models.
              </li>
              <li>
                <strong>Meta (Instagram):</strong> We interact with Meta's Instagram Graph API
                to read comments and send messages. This is governed by Meta's Platform Terms.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information if required to do
                so by law or in response to valid legal requests.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale
                of assets, your data may be transferred as part of that transaction.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide you
              with the service. You can request deletion of your data at any time (see Section 8).
              Specifically:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Access tokens:</strong> Retained until you disconnect your Instagram account
                or delete your account.
              </li>
              <li>
                <strong>Automation rules and logs:</strong> Retained for the duration of your account
                and up to 90 days after account deletion for audit purposes.
              </li>
              <li>
                <strong>Sent replies:</strong> A log of replies sent through our system is retained
                for service quality and debugging purposes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your data:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                Instagram access tokens are encrypted at rest using AES-256 encryption.
              </li>
              <li>
                All API communication uses TLS/SSL encryption.
              </li>
              <li>
                Database access is restricted to authorized services only.
              </li>
              <li>
                We follow security best practices for session management and authentication.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the following rights:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Access:</strong> Request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong>Rectification:</strong> Request correction of inaccurate data.
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your data (see our Data Deletion
                endpoint).
              </li>
              <li>
                <strong>Portability:</strong> Request a copy of your data in a machine-readable format.
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw your consent at any time by disconnecting
                your Instagram account or deleting your account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              8. Data Deletion
            </h2>
            <p>
              You can request deletion of your data through our automated Data Deletion endpoint
              at{' '}
              <code className="bg-secondary px-1 py-0.5 rounded text-sm">
                POST /api/data-deletion
              </code>
              . This endpoint complies with Meta's data deletion callback requirements.
              Upon receiving a verified request, we will delete all associated data from our
              database within 48 hours. You will receive a confirmation URL and code for your
              records.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">9. Third-Party Services</h2>
            <p>Our service integrates with the following third-party services:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Meta / Instagram:</strong> Instagram Graph API and Basic Display API for
                authentication and data access.
              </li>
              <li>
                <strong>Anthropic (Claude):</strong> AI-powered response generation. Comment text
                is sent to Anthropic's API for processing.
              </li>
              <li>
                <strong>MongoDB:</strong> Database hosting for storing your account data.
              </li>
              <li>
                <strong>Vercel:</strong> Application hosting and deployment.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the &ldquo;Last
              updated&rdquo; date. You are advised to review this policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@dmautomation.app" className="text-accent hover:underline">
                privacy@dmautomation.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}