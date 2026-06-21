'use client'

import Link from 'next/link'
import { Zap, Edit2, Trash2, ToggleLeft } from 'lucide-react'
import { useState } from 'react'

interface AutomationCardProps {
  id: string
  name: string
  description?: string
  enabled: boolean
  trigger: {
    type: string
    keywords: string[]
  }
  stats: {
    triggersCount: number
    responsesCount: number
  }
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export function AutomationCard({
  id,
  name,
  description,
  enabled,
  trigger,
  stats,
  onToggle,
  onDelete,
}: AutomationCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this automation?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        onDelete(id)
      }
    } catch (error) {
      console.error('Failed to delete automation:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggle = async () => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })
      if (response.ok) {
        onToggle(id, !enabled)
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>
            <span
              className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                enabled
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          <div className="mt-3 flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Trigger:</span>{' '}
              <span className="font-medium text-foreground capitalize">
                {trigger.type.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Triggers:</span>{' '}
              <span className="font-medium text-foreground">
                {stats.triggersCount}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Responses:</span>{' '}
              <span className="font-medium text-foreground">
                {stats.responsesCount}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleToggle}
            className={`rounded-lg p-2 transition-all hover:bg-muted ${
              enabled ? 'text-accent' : 'text-muted-foreground'
            }`}
            title={enabled ? 'Disable' : 'Enable'}
          >
            <ToggleLeft className="h-5 w-5" />
          </button>
          <Link
            href={`/dashboard/automations/${id}`}
            className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            title="Edit"
          >
            <Edit2 className="h-5 w-5" />
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-red-400 disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
