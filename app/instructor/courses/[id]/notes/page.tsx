'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface CourseNote {
  id: string
  title: string
  content: string
  order: number
}

export default function CourseNotesPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const [notes, setNotes] = useState<CourseNote[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/courses/' + courseId + '/notes', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load notes')
      setNotes(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId])

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const res = await fetch('/api/courses/' + courseId + '/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add note')
      setNotes((prev) => [...prev, data.data])
      setTitle('')
      setContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (noteId: string) => {
    if (!confirm('Move this note to trash?')) return
    const res = await fetch('/api/courses/' + courseId + '/notes/' + noteId, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to delete note')
      return
    }
    setNotes((prev) => prev.filter((item) => item.id !== noteId))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href={'/instructor/courses/' + courseId + '/edit'} className="text-blue-600 hover:underline">← Back to Course</Link>
      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Course Notes</h1>
          <p className="mt-1 text-gray-500">Add notes that become course content after publication.</p>
        </div>
      </div>

      {error && <div className="mt-4 p-3 rounded bg-red-50 text-red-700">{error}</div>}

      <form onSubmit={addNote} className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          required
          className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          rows={10}
          required
          className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
        />
        <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : 'Add Note'}
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {loading ? <p>Loading...</p> : notes.map((note) => (
          <div key={note.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{note.title}</h2>
              <button onClick={() => remove(note.id)} className="text-red-600 text-sm">Move to trash</button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">{note.content}</pre>
          </div>
        ))}
        {!loading && notes.length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500">No notes yet.</div>
        )}
      </div>
    </div>
  )
}
