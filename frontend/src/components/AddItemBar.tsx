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
      <form onSubmit={submitLink} className="flex items-stretch gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-gel-sm bg-gel-field px-3.5 py-2.5 shadow-gel-field">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#77777f"
            strokeWidth="2"
            strokeLinecap="round"
            className="shrink-0"
          >
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a link…"
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-paper-50 outline-none placeholder:text-paper-600 disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="shrink-0 rounded-gel-sm bg-gel-accent px-4 text-[13px] font-bold text-accent-ink shadow-gel-accent disabled:opacity-40"
        >
          Save
        </button>
        <IconButton
          title="Upload PDF"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <path d="M12 16V4" />
          <path d="M7.5 8.5 12 4l4.5 4.5" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </IconButton>
        <IconButton title="Add note" disabled={busy} onClick={() => setNoteOpen((v) => !v)}>
          <path d="M12 20h8" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
        </IconButton>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          onChange={onFile}
          className="hidden"
        />
      </form>

      {noteOpen && (
        <form
          onSubmit={submitNote}
          className="space-y-2 rounded-gel-sm bg-gel-surface p-3 shadow-gel"
        >
          <input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title"
            autoFocus
            className="w-full rounded-[10px] bg-ink-800 bg-gel-field px-3 py-2 text-sm font-medium text-paper-50 shadow-gel-field outline-none placeholder:text-paper-600"
          />
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note…"
            rows={4}
            className="w-full rounded-[10px] bg-ink-800 bg-gel-field px-3 py-2 text-sm text-paper-50 shadow-gel-field outline-none placeholder:text-paper-600"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="rounded-md bg-white/5 px-3 py-1.5 text-sm text-paper-400 shadow-gel-sm hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !noteTitle.trim() || !noteText.trim()}
              className="rounded-md bg-gel-accent px-3 py-1.5 text-sm font-bold text-accent-ink shadow-gel-accent disabled:opacity-40"
            >
              Save note
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function IconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="flex w-[42px] shrink-0 items-center justify-center rounded-gel-sm bg-gel-field shadow-gel-sm disabled:opacity-60"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#b8b8bf"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  )
}
