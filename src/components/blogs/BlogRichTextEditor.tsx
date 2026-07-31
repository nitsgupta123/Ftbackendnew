"use client";

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Node, Extension, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Youtube } from "@tiptap/extension-youtube";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extensions";
import {
  Undo2,
  Redo2,
  Minus,
  Plus,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link2,
  ImageIcon,
  Video as VideoIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ListChecks,
  List,
  ListOrdered,
  MoreVertical,
  ChevronDown,
  Check,
  Highlighter,
  Type,
  Code2,
  Quote,
  Table2,
  Maximize2,
} from "lucide-react";
import { uploadMediaFile } from "@/lib/media-api";

interface BlogRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
];

const TEXT_STYLES = [
  { label: "Normal text", value: "p", previewClassName: "text-sm text-[#3C4043]" },
  { label: "Heading 1", value: "h1", previewClassName: "text-2xl font-semibold text-[#202124]" },
  { label: "Heading 2", value: "h2", previewClassName: "text-xl font-semibold text-[#202124]" },
  { label: "Heading 3", value: "h3", previewClassName: "text-lg font-medium text-[#5F6368]" },
  { label: "Heading 4", value: "h4", previewClassName: "text-base font-medium text-[#5F6368]" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 24, 36, 48];
const ZOOM_LEVELS = [50, 75, 90, 100, 125, 150, 200];
const LINE_HEIGHTS = [
  { label: "Single", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "Double", value: "2" },
];

const TEXT_COLOR_PALETTE = [
  { label: "Grays", colors: ["#000000", "#434343", "#666666", "#999999", "#B7B7B7", "#CCCCCC", "#D9D9D9", "#FFFFFF"] },
  {
    label: "Colors",
    colors: [
      "#980000",
      "#FF0000",
      "#FF9900",
      "#FFFF00",
      "#00FF00",
      "#00FFFF",
      "#4A86E8",
      "#0000FF",
      "#9900FF",
      "#FF00FF",
      "#A68231",
      "#E06666",
    ],
  },
];

const HIGHLIGHT_COLOR_PALETTE = [
  {
    label: "Background",
    colors: [
      "#FFFF00",
      "#FCE8B2",
      "#F4C7C3",
      "#C9DAF8",
      "#D9EAD3",
      "#EAD1DC",
      "#D9D9D9",
      "#FFFFFF",
      "#FFE599",
      "#B6D7A8",
      "#A4C2F4",
      "#D5A6BD",
    ],
  },
];

function normalizeColor(color?: string | null) {
  if (!color) return null;
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) return trimmed.toUpperCase();

  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const hex = [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
      .map((value) => Number(value).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`.toUpperCase();
  }

  return trimmed.toUpperCase();
}

function colorsMatch(a?: string | null, b?: string | null) {
  return normalizeColor(a) === normalizeColor(b);
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const ParagraphLineHeight = Extension.create({
  name: "paragraphLineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
});

const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "true",
        style: "max-width:100%;height:auto;border-radius:0.5rem;",
      }),
    ];
  },
  addCommands() {
    return {
      setVideo:
        (options: { src: string }) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    video: {
      setVideo: (options: { src: string }) => ReturnType;
    };
  }
}

function isYoutubeUrl(url: string) {
  return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(url);
}

function normalizeYoutubeUrl(url: string) {
  const trimmed = url.trim();
  const shortMatch = trimmed.match(/(?:youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/watch?v=${shortMatch[1]}`;
  }

  const longMatch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (longMatch?.[1]) {
    return `https://www.youtube.com/watch?v=${longMatch[1]}`;
  }

  const embedMatch = trimmed.match(/\/embed\/([A-Za-z0-9_-]{6,})/i);
  if (embedMatch?.[1]) {
    return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
  }

  return trimmed;
}

function setBlockLineHeight(editor: Editor, lineHeight: string) {
  const { state, view } = editor;
  const { $from } = state.selection;
  const node = $from.parent;

  if (node.type.name !== "paragraph" && node.type.name !== "heading") {
    return false;
  }

  const pos = $from.before($from.depth);
  view.dispatch(
    state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      lineHeight,
    })
  );
  return true;
}

function getCurrentTextStyle(editor: Editor) {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("heading", { level: 4 })) return "h4";
  return "p";
}

function getCurrentFontSize(editor: Editor) {
  const size = editor.getAttributes("textStyle").fontSize as string | undefined;
  if (!size) return 11;
  const parsed = Number.parseInt(size, 10);
  return Number.isNaN(parsed) ? 11 : parsed;
}

function getNearestFontSizeIndex(size: number) {
  let nearestIndex = 0;
  for (let index = 0; index < FONT_SIZES.length; index += 1) {
    if (Math.abs(FONT_SIZES[index] - size) < Math.abs(FONT_SIZES[nearestIndex] - size)) {
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

function getCurrentFontFamily(editor: Editor) {
  const family = editor.getAttributes("textStyle").fontFamily as string | undefined;
  if (!family) return FONT_FAMILIES[0].value;
  const match = FONT_FAMILIES.find((item) => item.value === family);
  return match?.value ?? FONT_FAMILIES[0].value;
}

function useCloseOnOutsideClick(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as globalThis.Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onClose, ref]);
}

function useEditorRefresh(editor: Editor) {
  const [, refresh] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const handleUpdate = () => refresh();
    editor.on("transaction", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);
    return () => {
      editor.off("transaction", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor]);
}

function ToolbarSeparator() {
  return <div className="mx-1 h-7 w-px shrink-0 bg-[#DADCE0]" />;
}

function ToolbarIconButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-[#D3D8E0] disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-[#C8D0DB] text-[#1F2937]" : "text-[#3C4043]"
      }`}
    >
      {children}
    </button>
  );
}

function TextColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  const isLight = color.toUpperCase() === "#FFFFFF" || color.toUpperCase() === "#FFFF00";

  return (
    <button
      type="button"
      title={color}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md border bg-white text-sm font-semibold transition hover:scale-105 ${
        selected ? "border-[#1A73E8] ring-2 ring-[#1A73E8]/30" : "border-[#DADCE0]"
      }`}
    >
      <span style={{ color }} className={isLight ? "drop-shadow-sm" : undefined}>
        A
      </span>
    </button>
  );
}

function HighlightColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={color}
      onClick={onClick}
      className={`h-7 w-7 rounded-md border transition hover:scale-105 ${
        selected ? "border-[#1A73E8] ring-2 ring-[#1A73E8]/30" : "border-[#DADCE0]"
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

function ColorPalettePanel({
  title,
  groups,
  selectedColor,
  onSelect,
  onReset,
  resetLabel,
  variant,
}: {
  title: string;
  groups: { label: string; colors: string[] }[];
  selectedColor?: string | null;
  onSelect: (color: string) => void;
  onReset: () => void;
  resetLabel: string;
  variant: "text" | "highlight";
}) {
  return (
    <div className="w-[236px] rounded-lg border border-[#DADCE0] bg-white p-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-[#3C4043]">{title}</p>
      {groups.map((group) => (
        <div key={group.label} className="mb-3 last:mb-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[#80868B]">
            {group.label}
          </p>
          <div className="grid grid-cols-8 gap-1.5">
            {group.colors.map((color) =>
              variant === "text" ? (
                <TextColorSwatch
                  key={color}
                  color={color}
                  selected={colorsMatch(selectedColor, color)}
                  onClick={() => onSelect(color)}
                />
              ) : (
                <HighlightColorSwatch
                  key={color}
                  color={color}
                  selected={colorsMatch(selectedColor, color)}
                  onClick={() => onSelect(color)}
                />
              )
            )}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="mt-2 w-full rounded-md border border-[#DADCE0] px-2 py-1.5 text-left text-xs text-[#3C4043] hover:bg-[#F1F3F4]"
      >
        {resetLabel}
      </button>
    </div>
  );
}

function ToolbarSelect({
  value,
  onChange,
  options,
  className = "",
  ariaLabel,
  showCheck = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
    previewClassName?: string;
    previewStyle?: React.CSSProperties;
  }[];
  className?: string;
  ariaLabel: string;
  showCheck?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value)?.label ?? value;

  useCloseOnOutsideClick(open, () => setOpen(false), rootRef);

  return (
    <div className={`relative shrink-0 ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-full items-center justify-between gap-1 rounded border-0 bg-transparent px-2 text-sm text-[#3C4043] hover:bg-[#D3D8E0] focus:outline-none focus:ring-1 focus:ring-[#A68231]/40"
      >
        <span className="truncate">{selected}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#5F6368]" />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[100] min-w-[210px] overflow-hidden rounded-lg border border-[#DADCE0] bg-white py-1 shadow-xl">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#F1F3F4] ${
                  isSelected && !showCheck ? "bg-[#E8F0FE]" : ""
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {showCheck && (
                  <span className="w-4 shrink-0 text-[#3C4043]">
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                )}
                <span
                  className={`truncate ${option.previewClassName ?? "text-sm text-[#3C4043]"}`}
                  style={option.previewStyle}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GoogleDocsToolbar({
  editor,
  zoom,
  onZoomChange,
  onImageClick,
  onVideoClick,
  uploading,
}: {
  editor: Editor;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onImageClick: () => void;
  onVideoClick: () => void;
  uploading: boolean;
}) {
  useEditorRefresh(editor);

  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showLineMenu, setShowLineMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const alignMenuRef = useRef<HTMLDivElement>(null);
  const lineMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const highlightMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const currentTextColor = editor.getAttributes("textStyle").color as string | undefined;
  const currentHighlightColor = editor.getAttributes("highlight").color as string | undefined;

  function openTextColorMenu() {
    setShowHighlightMenu(false);
    setShowColorMenu((value) => !value);
  }

  function openHighlightMenu() {
    setShowColorMenu(false);
    setShowHighlightMenu((value) => !value);
  }

  const fontSize = getCurrentFontSize(editor);

  useCloseOnOutsideClick(showAlignMenu, () => setShowAlignMenu(false), alignMenuRef);
  useCloseOnOutsideClick(showLineMenu, () => setShowLineMenu(false), lineMenuRef);
  useCloseOnOutsideClick(showColorMenu, () => setShowColorMenu(false), colorMenuRef);
  useCloseOnOutsideClick(showHighlightMenu, () => setShowHighlightMenu(false), highlightMenuRef);
  useCloseOnOutsideClick(showMoreMenu, () => setShowMoreMenu(false), moreMenuRef);

  function applyTextStyle(style: string) {
    if (style === "p") {
      editor.chain().focus().setParagraph().run();
      return;
    }
    if (style === "h1") {
      editor.chain().focus().setHeading({ level: 1 }).run();
      return;
    }
    if (style === "h2") {
      editor.chain().focus().setHeading({ level: 2 }).run();
      return;
    }
    if (style === "h3") {
      editor.chain().focus().setHeading({ level: 3 }).run();
      return;
    }
    if (style === "h4") {
      editor.chain().focus().setHeading({ level: 4 }).run();
    }
  }

  function changeFontSize(delta: number) {
    const currentIndex = getNearestFontSizeIndex(fontSize);
    const nextIndex = Math.min(FONT_SIZES.length - 1, Math.max(0, currentIndex + delta));
    editor.chain().focus().setFontSize(`${FONT_SIZES[nextIndex]}px`).run();
  }

  return (
    <div className="border-b border-[#DADCE0] bg-[#EDF2FA]">
      <div className="relative z-30 flex flex-wrap items-center gap-0.5 overflow-visible px-2 py-1.5">
        <ToolbarIconButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarIconButton>

        <ToolbarSeparator />

        <ToolbarSelect
          ariaLabel="Zoom"
          className="min-w-[72px]"
          value={String(zoom)}
          onChange={(value) => onZoomChange(Number(value))}
          options={ZOOM_LEVELS.map((level) => ({ label: `${level}%`, value: String(level) }))}
        />

        <ToolbarSeparator />

        <ToolbarSelect
          ariaLabel="Text style"
          className="min-w-[120px]"
          value={getCurrentTextStyle(editor)}
          onChange={applyTextStyle}
          options={TEXT_STYLES}
          showCheck
        />
        <ToolbarSelect
          ariaLabel="Font family"
          className="min-w-[88px]"
          value={getCurrentFontFamily(editor)}
          onChange={(value) => editor.chain().focus().setFontFamily(value).run()}
          options={FONT_FAMILIES.map((font) => ({
            ...font,
            previewStyle: { fontFamily: font.value },
          }))}
          showCheck
        />

        <div className="flex shrink-0 items-center rounded-md border border-[#DADCE0] bg-white">
          <button
            type="button"
            title="Decrease font size"
            className="flex h-7 w-7 items-center justify-center text-[#3C4043] hover:bg-[#F1F3F4]"
            onClick={() => changeFontSize(-1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="flex h-7 min-w-[28px] items-center justify-center border-x border-[#DADCE0] px-1 text-sm text-[#3C4043]">
            {fontSize}
          </span>
          <button
            type="button"
            title="Increase font size"
            className="flex h-7 w-7 items-center justify-center text-[#3C4043] hover:bg-[#F1F3F4]"
            onClick={() => changeFontSize(1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <ToolbarSeparator />

        <ToolbarIconButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarIconButton>

        <div className="relative" ref={colorMenuRef}>
          <ToolbarIconButton title="Text color" active={showColorMenu} onClick={openTextColorMenu}>
            <span className="flex flex-col items-center">
              <Type className="h-4 w-4" style={{ color: currentTextColor || "#3C4043" }} />
              <span
                className="mt-0.5 h-1 w-4 rounded-sm border border-[#DADCE0]"
                style={{ backgroundColor: currentTextColor || "#000000" }}
              />
            </span>
          </ToolbarIconButton>
          {showColorMenu && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-[100]">
              <ColorPalettePanel
                title="Text color"
                groups={TEXT_COLOR_PALETTE}
                selectedColor={currentTextColor}
                variant="text"
                resetLabel="Reset text color"
                onSelect={(color) => {
                  editor.chain().focus().setColor(color).run();
                  setShowColorMenu(false);
                }}
                onReset={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorMenu(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="relative" ref={highlightMenuRef}>
          <ToolbarIconButton title="Highlight color" active={showHighlightMenu} onClick={openHighlightMenu}>
            <span className="relative flex h-4 w-4 items-center justify-center">
              <Highlighter className="h-4 w-4" />
              <span
                className="absolute -bottom-1 left-0 right-0 h-1 rounded-sm border border-[#DADCE0]"
                style={{ backgroundColor: currentHighlightColor || "#FFFF00" }}
              />
            </span>
          </ToolbarIconButton>
          {showHighlightMenu && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-[100]">
              <ColorPalettePanel
                title="Background color"
                groups={HIGHLIGHT_COLOR_PALETTE}
                selectedColor={currentHighlightColor}
                variant="highlight"
                resetLabel="Remove highlight"
                onSelect={(color) => {
                  editor.chain().focus().setHighlight({ color }).run();
                  setShowHighlightMenu(false);
                }}
                onReset={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightMenu(false);
                }}
              />
            </div>
          )}
        </div>

        <ToolbarSeparator />

        <ToolbarIconButton
          title="Insert link"
          active={editor.isActive("link")}
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Enter URL", previousUrl ?? "https://");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton title="Insert image" disabled={uploading} onClick={onImageClick}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton title="Upload video" disabled={uploading} onClick={onVideoClick}>
          <VideoIcon className="h-4 w-4" />
        </ToolbarIconButton>

        <ToolbarSeparator />

        <div className="relative" ref={alignMenuRef}>
          <button
            type="button"
            title="Alignment"
            onClick={() => setShowAlignMenu((value) => !value)}
            className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded px-1.5 text-[#3C4043] hover:bg-[#D3D8E0]"
          >
            <AlignLeft className="h-4 w-4" />
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showAlignMenu && (
            <div className="absolute left-0 top-full z-20 mt-1 flex rounded-lg border border-[#DADCE0] bg-white p-1 shadow-lg">
              {[
                { icon: AlignLeft, align: "left" as const },
                { icon: AlignCenter, align: "center" as const },
                { icon: AlignRight, align: "right" as const },
                { icon: AlignJustify, align: "justify" as const },
              ].map(({ icon: Icon, align }) => (
                <button
                  key={align}
                  type="button"
                  className={`flex h-8 w-8 items-center justify-center rounded hover:bg-[#F1F3F4] ${
                    editor.isActive({ textAlign: align }) ? "bg-[#E8EAED]" : ""
                  }`}
                  onClick={() => {
                    editor.chain().focus().setTextAlign(align).run();
                    setShowAlignMenu(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={lineMenuRef}>
          <button
            type="button"
            title="Line spacing"
            onClick={() => setShowLineMenu((value) => !value)}
            className="inline-flex h-8 shrink-0 items-center rounded px-1.5 text-[#3C4043] hover:bg-[#D3D8E0]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h12M8 12h12M8 18h12M4 6v12" />
            </svg>
          </button>
          {showLineMenu && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-[#DADCE0] bg-white py-1 shadow-lg">
              {LINE_HEIGHTS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm text-[#3C4043] hover:bg-[#F1F3F4]"
                  onClick={() => {
                    setBlockLineHeight(editor, item.value);
                    setShowLineMenu(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarIconButton
          title="Checklist"
          active={editor.isActive("taskList")}
          onClick={() => {
            if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
              editor.chain().focus().liftListItem("listItem").run();
            }
            editor.chain().focus().toggleTaskList().run();
          }}
        >
          <ListChecks className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton
          title="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => {
            if (editor.isActive("taskList")) {
              editor.chain().focus().liftListItem("taskItem").run();
            }
            editor.chain().focus().toggleBulletList().run();
          }}
        >
          <List className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => {
            if (editor.isActive("taskList")) {
              editor.chain().focus().liftListItem("taskItem").run();
            }
            editor.chain().focus().toggleOrderedList().run();
          }}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarIconButton>

        <ToolbarSeparator />

        <div className="relative" ref={moreMenuRef}>
          <ToolbarIconButton title="More options" active={showMoreMenu} onClick={() => setShowMoreMenu((value) => !value)}>
            <MoreVertical className="h-4 w-4" />
          </ToolbarIconButton>
          {showMoreMenu && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-[#DADCE0] bg-white py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#F1F3F4]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const chain = editor.chain().focus();
                  if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
                    chain.liftListItem("listItem");
                  }
                  if (editor.isActive("taskList")) {
                    chain.liftListItem("taskItem");
                  }
                  if (editor.isActive("codeBlock")) {
                    chain.toggleCodeBlock();
                  }
                  chain.toggleBlockquote().run();
                  setShowMoreMenu(false);
                }}
              >
                <Quote className="h-4 w-4" /> Quote
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#F1F3F4]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const chain = editor.chain().focus();
                  if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
                    chain.liftListItem("listItem");
                  }
                  if (editor.isActive("taskList")) {
                    chain.liftListItem("taskItem");
                  }
                  if (editor.isActive("blockquote")) {
                    chain.toggleBlockquote();
                  }
                  chain.toggleCodeBlock().run();
                  setShowMoreMenu(false);
                }}
              >
                <Code2 className="h-4 w-4" /> Code block
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#F1F3F4]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                  setShowMoreMenu(false);
                }}
              >
                <Table2 className="h-4 w-4" /> Insert table
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#F1F3F4]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setShowMoreMenu(false);
                  const url = window.prompt("Enter YouTube URL", "https://www.youtube.com/watch?v=");
                  if (!url?.trim()) return;

                  const normalized = normalizeYoutubeUrl(url);
                  if (!isYoutubeUrl(normalized)) {
                    window.alert("Please enter a valid YouTube URL.");
                    return;
                  }

                  const inserted = editor
                    .chain()
                    .focus()
                    .setYoutubeVideo({
                      src: normalized,
                      width: 640,
                      height: 360,
                    })
                    .run();

                  if (!inserted) {
                    window.alert("Could not embed this YouTube video. Please try another URL.");
                  }
                }}
              >
                <Maximize2 className="h-4 w-4" /> Embed YouTube
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BlogRichTextEditor({
  value,
  onChange,
  placeholder = "Write your blog content...",
}: BlogRichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: { class: "blog-editor-highlight" },
      }),
      FontFamily,
      FontSize,
      ParagraphLineHeight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: { class: "blog-editor-image" },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "blog-editor-table" },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({
        controls: true,
        nocookie: true,
        width: 640,
        height: 360,
        HTMLAttributes: { class: "blog-editor-youtube" },
      }),
      Video,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "blog-editor-content min-h-[320px] px-6 py-4 text-sm text-gray-900 focus:outline-none max-w-none",
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  async function handleMediaUpload(file: File, expectedKind: "image" | "video") {
    if (!editor) return;
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadMediaFile(file);
      if (expectedKind === "video" || result.kind === "video") {
        editor.chain().focus().setVideo({ src: result.url }).run();
      } else {
        editor.chain().focus().setImage({ src: result.url }).run();
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!editor) {
    return (
      <div className="rounded-lg border border-[#DADCE0] bg-white px-3 py-2.5 text-sm text-gray-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="blog-rich-text-editor rounded-lg border border-[#DADCE0] bg-white shadow-sm">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleMediaUpload(file, "image");
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleMediaUpload(file, "video");
        }}
      />

      <GoogleDocsToolbar
        editor={editor}
        zoom={zoom}
        onZoomChange={setZoom}
        uploading={uploading}
        onImageClick={() => imageInputRef.current?.click()}
        onVideoClick={() => videoInputRef.current?.click()}
      />

      {uploadError && (
        <p className="border-b border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-xs text-[#B91C1C]">
          {uploadError}
        </p>
      )}

      <div style={{ zoom: zoom / 100 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
