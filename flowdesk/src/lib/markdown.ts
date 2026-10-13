/**
 * A small, dependency-free Markdown renderer for the note preview.
 * Supports the subset the editor toolbar produces: headings, bold, italic,
 * inline code, links, blockquotes, code fences, bullet/numbered/checklists,
 * and horizontal rules. Output is escaped before formatting to avoid injecting
 * raw HTML from note content.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inline(text: string): string {
  let t = escapeHtml(text)
  // links [label](url)
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    const safe = /^https?:\/\//i.test(url) ? url : '#'
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-brand-600 underline">${label}</a>`
  })
  // bold **x**
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // italic *x* or _x_
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  t = t.replace(/_([^_]+)_/g, '<em>$1</em>')
  // inline code `x`
  t = t.replace(/`([^`]+)`/g, '<code class="rounded bg-canvas px-1 py-0.5 text-[0.85em]">$1</code>')
  return t
}

/** Render a markdown string to safe HTML for preview. */
export function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const html: string[] = []
  let i = 0
  type ListKind = 'ul' | 'ol' | null
  let listOpen: ListKind = null

  const closeList = () => {
    if (listOpen) {
      html.push(`</${listOpen}>`)
      listOpen = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // code fence
    if (line.trim().startsWith('```')) {
      closeList()
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(escapeHtml(lines[i]))
        i++
      }
      i++ // skip closing fence
      html.push(
        `<pre class="overflow-x-auto rounded-btn bg-canvas p-3 text-sm"><code>${buf.join('\n')}</code></pre>`,
      )
      continue
    }

    // horizontal rule
    if (/^---+\s*$/.test(line)) {
      closeList()
      html.push('<hr class="my-4 border-line" />')
      i++
      continue
    }

    // headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      closeList()
      const level = h[1].length
      const sizes = ['text-2xl', 'text-xl', 'text-lg']
      html.push(
        `<h${level} class="${sizes[level - 1]} font-bold text-ink mt-5 mb-2">${inline(h[2])}</h${level}>`,
      )
      i++
      continue
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      closeList()
      html.push(
        `<blockquote class="border-l-2 border-brand-300 pl-3 text-ink-muted italic my-2">${inline(line.replace(/^>\s?/, ''))}</blockquote>`,
      )
      i++
      continue
    }

    // checklist
    const check = /^[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line)
    if (check) {
      if (listOpen !== 'ul') {
        closeList()
        html.push('<ul class="my-2 space-y-1">')
        listOpen = 'ul'
      }
      const checked = check[1].toLowerCase() === 'x'
      html.push(
        `<li class="flex items-center gap-2"><input type="checkbox" disabled ${checked ? 'checked' : ''} class="h-3.5 w-3.5 rounded border-line" /><span class="${checked ? 'line-through text-ink-subtle' : ''}">${inline(check[2])}</span></li>`,
      )
      i++
      continue
    }

    // bullet list
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      if (listOpen !== 'ul') {
        closeList()
        html.push('<ul class="my-2 list-disc pl-5 space-y-1">')
        listOpen = 'ul'
      }
      html.push(`<li>${inline(bullet[1])}</li>`)
      i++
      continue
    }

    // numbered list
    const num = /^\d+\.\s+(.*)$/.exec(line)
    if (num) {
      if (listOpen !== 'ol') {
        closeList()
        html.push('<ol class="my-2 list-decimal pl-5 space-y-1">')
        listOpen = 'ol'
      }
      html.push(`<li>${inline(num[1])}</li>`)
      i++
      continue
    }

    // blank line
    if (line.trim() === '') {
      closeList()
      i++
      continue
    }

    // paragraph
    closeList()
    html.push(`<p class="my-2 leading-relaxed">${inline(line)}</p>`)
    i++
  }

  closeList()
  return html.join('\n')
}
