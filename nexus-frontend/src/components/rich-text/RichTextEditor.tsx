import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  Undo2,
  Redo2,
  Heading2,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { plainTextToRteHtml, normalizeRichText } from '@/lib/richText';

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-40',
        active ? 'bg-accent-subtle text-accent' : 'text-ink-muted hover:bg-canvas hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-4 w-px bg-border" />;
}

/**
 * TipTap rich text editor (HTML in, HTML out). Used for long-form CMS copy
 * (service descriptions, FAQ answers, process steps). The value is normalized
 * on blur so blank editors clear the field entirely.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write here…',
  minHeight = 160,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [focused, setFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: plainTextToRteHtml(value),
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: { class: 'px-4 py-3' },
      handleDOMEvents: {
        focus: () => {
          setFocused(true);
          return false;
        },
        blur: () => {
          setFocused(false);
          onChange(normalizeRichText(editor?.getHTML() ?? ''));
          return false;
        },
      },
    },
  });

  // Sync external resets (e.g. the drawer reopening with a different record).
  useEffect(() => {
    if (!editor) return;
    const next = plainTextToRteHtml(value);
    if (editor.getHTML() !== next) editor.commands.setContent(next);
  }, [editor, value]);

  if (!editor) return null;

  const can = (fn: () => boolean) => fn();

  return (
    <div
      className={cn(
        'rich-text-editor overflow-hidden rounded-xl border border-border bg-surface transition-colors',
        focused && 'border-accent/60 ring-2 ring-accent/20'
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-canvas/60 px-2 py-1.5">
        <ToolbarButton
          label="Heading"
          active={can(() => editor.isActive('heading', { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label="Insert link"
          active={editor.isActive('link')}
          onClick={() => {
            const prev = editor.getAttributes('link') as { href?: string };
            const url = window.prompt('Link URL', prev.href ?? 'https://');
            if (url === null) return;
            if (url.trim() === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Remove link" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton label="Undo" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none prose-p:my-2 prose-headings:font-semibold prose-headings:text-ink prose-a:text-accent prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:border-l-accent"
        style={{ minHeight }}
      />
    </div>
  );
}
