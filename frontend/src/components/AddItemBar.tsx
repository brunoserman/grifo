import { useRef, useState } from 'react'
import type { Item } from '../types'
import { saveLink, saveNote, uploadPdf } from '../api'

type Props = {
  onAdded: (item: Item) => void
  onError: (message: string) => void
}

// The top bar: paste a URL, upload a PDF, or open a small form to write a note.
export default function AddItemBar({ onAdded, onError }: Props) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function run(action: () => Promise<Item>) {
    setBusy(true)
    try {
      const item = await action()
      onAdded(item)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    await run(() => saveLink(url.trim()))
    setUrl('')
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteTitle.trim() || !noteText.trim()) return
    await run(() => saveNote(noteTitle.trim(), noteText.trim()))
    setNoteTitle('')
    setNoteText('')
    setNoteOpen(false)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await run(() => uploadPdf(file))
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submitLink} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a link to save…"
          disabled={busy}
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 outline-none focus:border-neutral-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          Save
        </button>
      </form>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-60"
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          disabled={busy}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-60"
        >
          New note
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          onChange={onFile}
          className="hidden"
        />
      </div>

      {noteOpen && (
        <form
          onSubmit={submitNote}
          className="space-y-2 rounded-lg border border-neutral-300 bg-white p-3"
        >
          <input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
          />
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note…"
            rows={4}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !noteTitle.trim() || !noteText.trim()}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
            >
              Save note
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
