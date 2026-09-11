import type { ReactNode } from 'react'
import Markdown from 'react-markdown'
import { Link } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import { FileTypeIcon } from './FileTypeIcon'

export interface CiteItem {
  index?: number
  documentId: string
  documentTitle: string
  heading?: string | null
  excerpt?: string
}

function citeDomId(scope: string | undefined, index: number) {
  return scope ? `kh-cite-${scope}-${index}` : `kh-cite-${index}`
}

/** 代码块外的 [n] 转成 markdown 锚点链接，便于 AnswerMarkdown 拦截 */
function linkifyCitations(text: string): string {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part
      return part.replace(/\[(\d+)\]/g, '[[$1]](#cite-$1)')
    })
    .join('')
}

/**
 * RAG / 检索引用卡片。标题新开标签打开文档，避免问答页被冲掉。
 */
export function SourceCiteList({
  items,
  scope,
  activeIndex,
  onSelect,
}: {
  items: CiteItem[]
  scope?: string
  activeIndex?: number | null
  onSelect?: (index: number | null) => void
}) {
  if (!items.length) return null
  return (
    <div className="kh-cite-list">
      {items.map((s, i) => {
        const index = s.index
        const active = index != null && activeIndex === index
        return (
          <Link
            key={`${s.documentId}-${index ?? i}`}
            id={index != null ? citeDomId(scope, index) : undefined}
            className={`kh-cite${active ? ' active' : ''}`}
            to={`/documents/${s.documentId}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (index != null) onSelect?.(index)
            }}
            onMouseEnter={() => {
              if (index != null) onSelect?.(index)
            }}
            onMouseLeave={() => onSelect?.(null)}
          >
            <FileTypeIcon name={s.documentTitle} />
            <div className="kh-cite-body">
              <div className="kh-cite-title">
                {index != null ? `[${index}] ` : ''}
                {s.documentTitle}
              </div>
              {s.heading ? <div className="kh-cite-heading">{s.heading}</div> : null}
              {s.excerpt ? <div className="kh-cite-excerpt">{s.excerpt}</div> : null}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

/** Markdown 回答，并把 [n] 做成可高亮对应引用卡片的角标 */
export function AnswerMarkdown({
  text,
  sources,
  scope,
  onCite,
}: {
  text: string
  sources?: CiteItem[]
  scope?: string
  onCite?: (index: number | null) => void
}) {
  const byIndex = new Map(
    (sources ?? []).filter((s) => s.index != null).map((s) => [s.index as number, s]),
  )
  const md = linkifyCitations(text)

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          const citeMatch = href?.match(/^#cite-(\d+)$/)
          if (citeMatch) {
            const index = Number(citeMatch[1])
            const src = byIndex.get(index)
            if (!src) return <span>{children}</span>
            return (
              <button
                type="button"
                className="kh-cite-inline"
                title={src.documentTitle}
                onClick={() => {
                  onCite?.(index)
                  document
                    .getElementById(citeDomId(scope, index))
                    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }}
              >
                {children}
              </button>
            )
          }
          if (!href) return <span>{children}</span>
          return (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          )
        },
      }}
    >
      {md}
    </Markdown>
  )
}

/** 把回答里的 [n] 做成指向对应文档的链接（纯文本，非 Markdown） */
export function AnswerWithCitations({
  text,
  sources,
}: {
  text: string
  sources?: CiteItem[]
}): ReactNode {
  const byIndex = new Map(
    (sources ?? []).filter((s) => s.index != null).map((s) => [s.index as number, s]),
  )
  const parts = text.split(/(\[\d+\])/)
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/)
        if (!match) return <span key={i}>{part}</span>
        const src = byIndex.get(Number(match[1]))
        if (!src) return <span key={i}>{part}</span>
        return (
          <Link
            key={i}
            className="kh-cite-inline"
            to={`/documents/${src.documentId}`}
            target="_blank"
            rel="noreferrer"
          >
            {part}
          </Link>
        )
      })}
    </>
  )
}
