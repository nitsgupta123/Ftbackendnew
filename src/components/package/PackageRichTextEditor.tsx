"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Mark, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import BulletList from "@tiptap/extension-bullet-list";

export type PackageListStyle = "main" | "divider" | "detail";

interface PackageRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  caption?: string;
}

const BrandGold = Mark.create({
  name: "brandGold",
  parseHTML() {
    return [{ tag: 'span[data-brand-gold="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-brand-gold": "true",
        class: "pkg-brand-gold",
      }),
      0,
    ];
  },
  addCommands() {
    return {
      toggleBrandGold:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    brandGold: {
      toggleBrandGold: () => ReturnType;
    };
  }
}

const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      listStyle: {
        default: "main" as PackageListStyle,
        parseHTML: (element) =>
          (element.getAttribute("data-list-style") as PackageListStyle) || "main",
        renderHTML: (attributes) => ({
          "data-list-style": attributes.listStyle || "main",
          class: `pkg-list pkg-list--${attributes.listStyle || "main"}`,
        }),
      },
    };
  },
});

const toolbarButtonClass =
  "h-7 px-2.5 text-xs font-medium rounded-[6px] transition-all duration-150 border inline-flex items-center gap-1 bg-white text-gray-600 border-[#E5E7EB] hover:border-gray-400 hover:bg-gray-50";
const toolbarActiveClass =
  "bg-[#1F2A44] text-white border-[#1F2A44] shadow-sm hover:bg-[#1F2A44] hover:border-[#1F2A44]";

function isListStyleActive(editor: NonNullable<ReturnType<typeof useEditor>>, style: PackageListStyle) {
  return (
    editor.isActive("bulletList") &&
    (editor.getAttributes("bulletList").listStyle as PackageListStyle | undefined) === style
  );
}

function toggleListStyle(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  style: PackageListStyle
) {
  if (isListStyleActive(editor, style)) {
    editor.chain().focus().toggleBulletList().run();
    return;
  }

  if (editor.isActive("bulletList")) {
    editor.chain().focus().updateAttributes("bulletList", { listStyle: style }).run();
    return;
  }

  editor
    .chain()
    .focus()
    .toggleBulletList()
    .updateAttributes("bulletList", { listStyle: style })
    .run();
}

export default function PackageRichTextEditor({
  value,
  onChange,
  placeholder = "Write content…",
  label,
  caption,
}: PackageRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        heading: false,
        codeBlock: false,
        blockquote: false,
      }),
      StyledBulletList,
      BrandGold,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "pkg-editor-content min-h-[140px] px-4 py-3 text-sm text-gray-900 focus:outline-none",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current && next !== (current === "<p></p>" ? "" : current)) {
      editor.commands.setContent(next || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold text-[#1F2A44] mb-2">{label}</label>
        )}
        <div className="min-h-[180px] rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB]" />
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-[#1F2A44] mb-2">{label}</label>
      )}

      <div className="overflow-hidden rounded-[12px] border border-[#E5E7EB]">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E5E7EB] bg-[#F8F9FB] px-3 py-2">
          <button
            type="button"
            className={`${toolbarButtonClass} ${editor.isActive("bold") ? toolbarActiveClass : ""}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            B
          </button>

          <button
            type="button"
            className={`${toolbarButtonClass} ${isListStyleActive(editor, "main") ? toolbarActiveClass : ""}`}
            onClick={() => toggleListStyle(editor, "main")}
            title="Main bullet"
          >
            • Main
          </button>

          <button
            type="button"
            className={`${toolbarButtonClass} ${isListStyleActive(editor, "divider") ? toolbarActiveClass : ""}`}
            onClick={() => toggleListStyle(editor, "divider")}
            title="Divider style"
          >
            / Divider
          </button>

          <button
            type="button"
            className={`${toolbarButtonClass} ${isListStyleActive(editor, "detail") ? toolbarActiveClass : ""}`}
            onClick={() => toggleListStyle(editor, "detail")}
            title="Detail style"
          >
            – Detail
          </button>

          <button
            type="button"
            className={`${toolbarButtonClass} ${editor.isActive("brandGold") ? toolbarActiveClass : ""}`}
            onClick={() => editor.chain().focus().toggleBrandGold().run()}
            title="Brand gold"
          >
            Brand gold
          </button>
        </div>

        <EditorContent editor={editor} />
      </div>

      {caption && <p className="mt-1.5 text-xs italic text-gray-400">{caption}</p>}
    </div>
  );
}
