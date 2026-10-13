import { useEffect } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Markdown } from 'tiptap-markdown'

export interface RichEditorProps {
  /** Initial content as Markdown (the DB storage format). */
  markdown: string
  /** Fired on every change with the serialized Markdown. */
  onChange: (markdown: string) => void
  /** Receives the editor instance so a parent toolbar can drive it. */
  onReady?: (editor: Editor) => void
  placeholder?: string
  autofocus?: boolean
}

/**
 * WYSIWYG note editor built on Tiptap. Content is read/written as Markdown so
 * the existing notes.content column format is preserved unchanged.
 */
export function RichEditor({
  markdown,
  onChange,
  onReady,
  placeholder = 'Start writing...',
  autofocus = false,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      // Serializes the document to/from Markdown; keeps the DB format stable.
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: markdown,
    autofocus: autofocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'note-prose min-h-[55vh] max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown() as string
      onChange(md)
    },
  })

  // Hand the instance up once it exists.
  useEffect(() => {
    if (editor && onReady) onReady(editor)
  }, [editor, onReady])

  // Destroy on unmount.
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <EditorContent editor={editor} />
}
