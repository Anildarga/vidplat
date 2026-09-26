'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { uploadToCloudinaryBrowser } from '@/lib/cloudinary-browser'

interface CourseDocument {
  id: string
  title: string
  url: string
  fileName: string
  mimeType: string
  size: number
}

export default function CourseDocumentsPage() {
  const params = useParams()
  const courseId = params.id as string
  const [documents, setDocuments] = useState<CourseDocument[]>([])
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/courses/' + courseId + '/documents', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load documents')
      setDocuments(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId])

  const addDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Select a file first')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const uploaded = await uploadToCloudinaryBrowser(file, 'document')
      const res = await fetch('/api/courses/' + courseId + '/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || file.name,
          url: uploaded.url,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          resourceType: uploaded.resource_type || 'raw',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save document')
      setDocuments((prev) => [...prev, data.data])
      setTitle('')
      setFile(null)
      const input = document.getElementById('document-file') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document upload failed')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (documentId: string) => {
    if (!confirm('Move this document to trash?')) return
    const res = await fetch('/api/courses/' + courseId + '/documents/' + documentId, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to delete document')
      return
    }
    setDocuments((prev) => prev.filter((item) => item.id !== documentId))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href={'/instructor/courses/' + courseId + '/edit'} className="text-blue-600 hover:underline">← Back to Course</Link>
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Course Documents</h1>
        <p className="mt-1 text-gray-500">Upload PPT, PDF, DOC, Excel, ZIP, or other course files.</p>
      </div>

      {error && <div className="mt-4 p-3 rounded bg-red-50 text-red-700">{error}</div>}

      <form onSubmit={addDocument} className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title (optional)"
          className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
        />
        <input
          id="document-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
          className="block w-full text-sm"
        />
        <p className="text-xs text-gray-500">Maximum 50 MB per document.</p>
        <button type="submit" disabled={uploading} className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
          {uploading ? 'Uploading...' : 'Add Document'}
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {loading ? <p>Loading...</p> : documents.map((document) => (
          <div key={document.id} className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{document.title}</p>
              <p className="text-sm text-gray-500 truncate">{document.fileName}</p>
            </div>
            <div className="flex gap-2">
              <a href={document.url} target="_blank" rel="noreferrer" className="px-3 py-2 border rounded-lg text-sm">Open</a>
              <button onClick={() => remove(document.id)} className="px-3 py-2 text-red-600 border rounded-lg text-sm">Move to trash</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
