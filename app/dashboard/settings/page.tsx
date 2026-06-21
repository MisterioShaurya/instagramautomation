'use client'

import { useSession } from '@/lib/session'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MessageCircle } from 'lucide-react'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'unauthenticated') {
    router.push('/auth/login?callbackUrl=/dashboard/settings')
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your account and integrations
            </p>
          </div>

          {/* Account Settings */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Account Information
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">
                    Instagram Username
                  </label>
                  <div className="mt-2 rounded-lg border border-border bg-muted p-3 text-foreground">
                    {session?.name || session?.instagramUserId || 'Connected'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">
                    User ID
                  </label>
                  <div className="mt-2 rounded-lg border border-border bg-muted p-3 text-foreground">
                    {session?.instagramUserId || session?.userId || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Instagram Integration */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Instagram Integration
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your Instagram account is connected and ready for automation
                  </p>
                </div>
                <MessageCircle className="h-8 w-8 text-accent" />
              </div>
            </div>

            {/* Preferences */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Preferences
              </h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Email Notifications
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about automation activity
                    </p>
                  </div>
                  <button className="h-6 w-10 rounded-full bg-accent transition-all" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Weekly Analytics Report
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly performance summaries
                    </p>
                  </div>
                  <button className="h-6 w-10 rounded-full bg-muted transition-all" />
                </div>
              </div>
            </div>

            {/* Billing */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Billing</h2>
              <div className="mt-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold text-accent">Free Plan</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upgrade to access premium features and unlimited automations
                </p>
                <button className="mt-4 rounded-lg border border-accent px-6 py-2 font-medium text-accent transition-all hover:bg-accent/10">
                  View Pricing
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6">
              <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                These actions cannot be undone
              </p>
              <button className="mt-4 rounded-lg border border-red-500/50 px-6 py-2 font-medium text-red-400 transition-all hover:bg-red-500/10">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
