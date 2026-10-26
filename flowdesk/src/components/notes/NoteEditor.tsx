import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Check,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Quote,
  RefreshCw,
  Star,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/time'
import { RichEditor } from '@/components/notes/RichEditor'
import type { Note, Notebook } from '@/api/notesApi'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface NoteEditorProps {
  note: Note
  notebooks: Notebook[]
  /** Persist edits. Returns the saved note or null on failure. */
  onSave: (patch: { title: string; content: string }) => Promise<Note | null>
  onToggleFavorite: () => void
  onDelete: () => void
  onMoveToNotebook: (notebookId: number | null) => void
  /** On mobile, show a back control that returns to the list. */
  onBack?: () => void
  /** Clicking the notebook in the breadcrumb opens the move dialog. */
  onBreadcrumbClick?: () => void
  /** Focus mode collapses the notes browser for a wider writing area. */
  focusMode?: boolean
  onToggleFocus?: () => void
  /** Rendered below the note content (e.g. the Linked items section). */
  belowContent?: ReactNode
}

const AUTOSAVE_MS = 700

/** Full-width WYSIWYG writing workspace with autosave and a live toolbar. */
export function NoteEditor({
  note,
  notebooks,
  onSave,
  onToggleFavorite,
  onDelete,
  onMoveToNotebook,
  onBack,
  onBreadcrumbClick,
  focusMode,
  onToggleFocus,
  belowContent,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [menuOpen, setMenuOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<number | null>(null)
  // Latest content, kept in a ref so the debounce always sees current text.
  const contentRef = useRef(note.content ?? '')
  // Monotonic token so a slow save cannot overwrite the state of a newer one.
  const saveSeq = useRef(0)
  // Snapshot of what is actually persisted, to skip no-op saves.
  const persisted = useRef({ title: note.title, content: note.content ?? '' })

  // Re-seed local state when switching to a different note. (The RichEditor is
  // remounted via a key in the parent, so its content re-seeds automatically.)
  useEffect(() => {
    setTitle(note.title)
    contentRef.current = note.content ?? ''
    persisted.current = { title: note.title, content: note.content ?? '' }
    setSaveState('idle')
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus the title of a freshly created, still-untitled note.
  useEffect(() => {
    if (note.title === 'Untitled Note' && (note.content ?? '') === '') {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const runSave = useCallback(
    async (nextTitle: string, nextContent: string) => {
      if (
        nextTitle === persisted.current.title &&
        nextContent === persisted.current.content
      ) {
        return
      }
      const seq = ++saveSeq.current
      setSaveState('saving')
      const saved = await onSave({
        title: nextTitle.trim() || 'Untitled Note',
        content: nextContent,
      })
      if (seq !== saveSeq.current) return
      if (saved) {
        persisted.current = { title: saved.title, content: saved.content ?? '' }
        setSaveState('saved')
      } else {
        setSaveState('error')
      }
    },
    [onSave],
  )

  const scheduleSave = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void runSave(title, contentRef.current)
    }, AUTOSAVE_MS)
    // title is read fresh via closure on each schedule call below
  }, [runSave, title])

  const onTitleChange = (v: string) => {
    setTitle(v)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void runSave(v, contentRef.current)
    }, AUTOSAVE_MS)
  }

  const onContentChange = (md: string) => {
    contentRef.current = md
    scheduleSave()
  }

  // Flush pending timer on unmount / note switch.
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [note.id])

  // Close the more-options menu on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setMoveOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const breadcrumb = [note.notebookName ? note.notebookName : 'Unfiled'].filter(Boolean)

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-6 py-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-ink-subtle">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-1 rounded-btn border border-line px-2 py-1 text-ink-muted hover:bg-canvas lg:hidden"
            >
              ← Notes
            </button>
          )}
          {onToggleFocus && (
            <button
              onClick={onToggleFocus}
              title={focusMode ? 'Show notes list' : 'Focus mode (hide list)'}
              aria-label={focusMode ? 'Show notes list' : 'Focus mode'}
              className="mr-1 hidden rounded-btn border border-line p-1.5 text-ink-muted hover:bg-canvas lg:inline-flex"
            >
              {focusMode ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
          <span className="truncate">Notes</span>
          {breadcrumb.map((b) => (
            <span key={b} className="flex items-center gap-2">
              <span className="text-ink-subtle">/</span>
              <button
                onClick={onBreadcrumbClick}
                className="truncate rounded px-1 py-0.5 text-ink-muted hover:bg-canvas hover:text-brand-700"
                title="Change notebook"
              >
                {b}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SaveStatus
            state={saveState}
            updatedAt={note.updatedAt}
            onRetry={() => void runSave(title, contentRef.current)}
          />
          <button
            onClick={onToggleFavorite}
            title={note.favorite ? 'Unfavorite' : 'Favorite'}
            className={cn(
              'rounded-btn border border-line p-1.5 hover:bg-canvas',
              note.favorite ? 'text-amber-500' : 'text-ink-muted',
            )}
          >
            <Star className={cn('h-4 w-4', note.favorite && 'fill-amber-400')} />
          </button>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              title="More options"
              className="rounded-btn border border-line p-1.5 text-ink-muted hover:bg-canvas"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-btn border border-line bg-white py-1 shadow-popover">
                <button
                  onClick={() => setMoveOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-ink hover:bg-canvas"
                >
                  Move to notebook…
                </button>
                {moveOpen && (
                  <div className="max-h-48 overflow-y-auto border-y border-line bg-canvas/40">
                    <button
                      onClick={() => {
                        onMoveToNotebook(null)
                        setMenuOpen(false)
                        setMoveOpen(false)
                      }}
                      className="block w-full px-5 py-1.5 text-left text-sm text-ink-muted hover:bg-canvas"
                    >
                      Unfiled
                    </button>
                    {notebooks.map((nb) => (
                      <button
                        key={nb.id}
                        onClick={() => {
                          onMoveToNotebook(nb.id)
                          setMenuOpen(false)
                          setMoveOpen(false)
                        }}
                        className={cn(
                          'block w-full px-5 py-1.5 text-left text-sm hover:bg-canvas',
                          nb.id === note.notebookId ? 'text-brand-700' : 'text-ink',
                        )}
                      >
                        {nb.name}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    if (window.confirm(`Delete "${note.title}"? This cannot be undone.`)) {
                      onDelete()
                    }
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-canvas"
                >
                  <Trash2 className="h-4 w-4" /> Delete note
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formatting toolbar — drives the live editor */}
      <Toolbar editor={editor} />

      {/* Writing canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-6 py-8">
          <input
            ref={titleInputRef}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full border-none p-0 text-3xl font-bold text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-0"
          />
          <div className="mt-6">
            <RichEditor
              markdown={note.content ?? ''}
              onChange={onContentChange}
              onReady={setEditor}
              autofocus={!(note.title === 'Untitled Note' && (note.content ?? '') === '')}
            />
          </div>
          {belowContent}
        </div>
      </div>
    </div>
  )
}

/** Toolbar that reflects and controls the active Tiptap editor. */
function Toolbar({ editor }: { editor: Editor | null }) {
  // Re-render on selection/content changes so active states stay in sync.
  const [, force] = useState(0)
  useEffect(() => {
    if (!editor) return
    const update = () => force((n) => n + 1)
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  if (!editor) {
    return <div className="h-[41px] border-b border-line" />
  }

  const btn = (
    active: boolean,
    onClick: () => void,
    title: string,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={cn(
        'rounded p-1.5 hover:bg-canvas',
        active ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:text-ink',
      )}
    >
      {icon}
    </button>
  )

  const addLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-6 py-1.5">
      {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'Heading 1', <Heading1 className="h-4 w-4" />)}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading 2', <Heading2 className="h-4 w-4" />)}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Heading 3', <Heading3 className="h-4 w-4" />)}
      <Divider />
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold (Ctrl/Cmd+B)', <Bold className="h-4 w-4" />)}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic (Ctrl/Cmd+I)', <Italic className="h-4 w-4" />)}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Underline (Ctrl/Cmd+U)', <UnderlineIcon className="h-4 w-4" />)}
      {btn(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), 'Inline code', <Code className="h-4 w-4" />)}
      <Divider />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Bulleted list', <List className="h-4 w-4" />)}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Numbered list', <ListOrdered className="h-4 w-4" />)}
      {btn(editor.isActive('taskList'), () => editor.chain().focus().toggleTaskList().run(), 'Checklist', <ListChecks className="h-4 w-4" />)}
      <Divider />
      {btn(editor.isActive('link'), addLink, 'Link', <Link2 className="h-4 w-4" />)}
      {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Blockquote', <Quote className="h-4 w-4" />)}
      {btn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), 'Code block', <Code className="h-4 w-4" />)}
      {btn(false, () => editor.chain().focus().setHorizontalRule().run(), 'Divider', <Minus className="h-4 w-4" />)}
      <Divider />
      {btn(
        editor.isActive('table'),
        () =>
          editor.isActive('table')
            ? editor.chain().focus().deleteTable().run()
            : editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
                .run(),
        editor.isActive('table') ? 'Delete table' : 'Insert table',
        <Table2 className="h-4 w-4" />,
      )}
      {/* Row/column controls appear only while the cursor is inside a table */}
      {editor.isActive('table') && (
        <>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Add column"
            className="rounded px-1.5 py-1 text-xs font-medium text-ink-muted hover:bg-canvas hover:text-ink"
          >
            +Col
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add row"
            className="rounded px-1.5 py-1 text-xs font-medium text-ink-muted hover:bg-canvas hover:text-ink"
          >
            +Row
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Delete column"
            className="rounded px-1.5 py-1 text-xs font-medium text-ink-muted hover:bg-canvas hover:text-ink"
          >
            −Col
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Delete row"
            className="rounded px-1.5 py-1 text-xs font-medium text-ink-muted hover:bg-canvas hover:text-ink"
          >
            −Row
          </button>
        </>
      )}
    </div>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-line" />
}

function SaveStatus({
  state,
  updatedAt,
  onRetry,
}: {
  state: SaveState
  updatedAt: string
  onRetry: () => void
}) {
  if (state === 'saving') {
    return <span className="text-xs text-ink-subtle">Saving…</span>
  }
  if (state === 'error') {
    return (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
      >
        <RefreshCw className="h-3 w-3" /> Save failed — retry
      </button>
    )
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-accent-green">
        <Check className="h-3 w-3" /> Saved
      </span>
    )
  }
  return <span className="text-xs text-ink-subtle">Edited {timeAgo(updatedAt)}</span>
}
