'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface TrashItem {
  id: string
  entityType: string
  entityId: string
  courseId: string | null
  deletedById: string
  deletedAt: string
  payload: Record<string, unknown>
}

function titleFromPayload(item: TrashItem) {
  const payloadTitle = item.payload.title
  return typeof payloadTitle === 'string' ? payloadTitle : item.entityType
}

export default function TrashPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/trash', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load trash')
      setItems(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trash')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
    if (status === 'authenticated') load()
  }, [status])

  const restore = async (id: string) => {
    setRestoring(id)
    setError(null)
    try {
      const res = await fetch('/api/trash/' + id + '/restore', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Restore failed')
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  if (status === 'loading' || loading) return <div className="p-8 text-center">Loading...</div>
  if (!session) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="text-blue-600 hover:underline">← Back</button>
      <div className="mt-5">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trash</h1>
        <p className="mt-1 text-gray-500">
          Deleted courses and content are retained here so accidental deletions can be restored.
        </p>
      </div>

      {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">{item.entityType}</span>
                <h2 className="font-semibold text-gray-900 dark:text-white">{titleFromPayload(item)}</h2>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Deleted {new Date(item.deletedAt).toLocaleString()}
              </p>
              {session.user.role === 'ADMIN' && (
                <p className="text-xs text-gray-400 font-mono mt-1">Deleted by: {item.deletedById}</p>
              )}
            </div>
            <button
              onClick={() => restore(item.id)}
              disabled={restoring === item.id}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {restoring === item.id ? 'Restoring...' : 'Restore'}
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500">
            Trash is empty.
          </div>
        )}
      </div>
    </div>
  )
}
