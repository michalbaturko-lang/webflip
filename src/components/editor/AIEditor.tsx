"use client";

import { useState, useCallback, useMemo } from "react";
import ChatPanel from "./ChatPanel";
import InlineEditor from "./InlineEditor";
import VisualDiff from "./VisualDiff";
import UndoStackPanel, { useUndoStack, useUndoKeyboard } from "./UndoStack";
import SmartSuggestions from "./SmartSuggestions";
import EditorToolbar from "./EditorToolbar";
import type { ChatMessage } from "@/types/editor";

interface AIEditorProps {
  token: string;
  variantIndex: number;
  onHtmlUpdate: (html: string) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  initialHtml?: string;
}

export default function AIEditor({
  token,
  variantIndex,
  onHtmlUpdate,
  iframeRef,
  initialHtml,
}: AIEditorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Panel visibility
  const [isDiffVisible, setIsDiffVisible] = useState(false);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isInlineEditEnabled, setIsInlineEditEnabled] = useState(false);

  // Undo/redo stack
  const {
    snapshots,
    currentIndex,
    pushSnapshot,
    undo,
    redo,
    restoreToIndex,
    canUndo,
    canRedo,
  } = useUndoStack(initialHtml);

  const applyHtml = useCallback(
    (html: string) => {
      onHtmlUpdate(html);
    },
    [onHtmlUpdate]
  );

  // Keyboard shortcuts
  useUndoKeyboard(undo, redo, applyHtml);

  // Derive diff from snapshots instead of separate state (#4)
  const beforeHtml = useMemo(
    () => (currentIndex > 0 ? snapshots[currentIndex - 1]?.html || "" : ""),
    [currentIndex, snapshots]
  );
  const afterHtml = useMemo(
    () => snapshots[currentIndex]?.html || "",
    [currentIndex, snapshots]
  );

  // Handle successful edit from chat
  const handleEditSuccess = useCallback(
    (instruction: string, html: string) => {
      pushSnapshot(html, instruction.substring(0, 60));
    },
    [pushSnapshot]
  );

  // Handle inline edit
  const handleInlineEdit = useCallback(
    (instruction: string) => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          const html = doc.documentElement.outerHTML;
          pushSnapshot(html, instruction.substring(0, 60));
        }
      } catch {
        // Ignore cross-origin
      }
    },
    [iframeRef, pushSnapshot]
  );

  const handleUndo = useCallback(() => {
    const html = undo();
    if (html) applyHtml(html);
  }, [undo, applyHtml]);

  const handleRedo = useCallback(() => {
    const html = redo();
    if (html) applyHtml(html);
  }, [redo, applyHtml]);

  const handleRestore = useCallback(
    (index: number) => {
      const html = restoreToIndex(index);
      if (html) applyHtml(html);
    },
    [restoreToIndex, applyHtml]
  );

  const handleSuggestionApply = useCallback(
    (instruction: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `suggest-${Date.now()}`,
          role: "user" as const,
          content: instruction,
          timestamp: new Date(),
          status: "success" as const,
        },
      ]);
    },
    [setMessages]
  );

  const editCount = messages.filter(
    (m) => m.role === "user" && m.status === "success"
  ).length;

  return (
    <>
      <InlineEditor
        iframeRef={iframeRef}
        onEditApplied={handleInlineEdit}
        enabled={isInlineEditEnabled}
      />

      <ChatPanel
        token={token}
        variantIndex={variantIndex}
        onHtmlUpdate={applyHtml}
        onEditSuccess={handleEditSuccess}
        messages={messages}
        setMessages={setMessages}
      />

      <VisualDiff
        beforeHtml={beforeHtml}
        afterHtml={afterHtml}
        isVisible={isDiffVisible}
      />

      <UndoStackPanel
        snapshots={snapshots}
        currentIndex={currentIndex}
        onRestore={handleRestore}
        isVisible={isHistoryVisible}
      />

      <SmartSuggestions
        iframeRef={iframeRef}
        onApply={handleSuggestionApply}
        isVisible={isSuggestionsVisible}
        onClose={() => setIsSuggestionsVisible(false)}
      />

      <EditorToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isDiffVisible={isDiffVisible}
        onToggleDiff={() => setIsDiffVisible((v) => !v)}
        isSuggestionsVisible={isSuggestionsVisible}
        onToggleSuggestions={() => setIsSuggestionsVisible((v) => !v)}
        isHistoryVisible={isHistoryVisible}
        onToggleHistory={() => setIsHistoryVisible((v) => !v)}
        isInlineEditEnabled={isInlineEditEnabled}
        onToggleInlineEdit={() => setIsInlineEditEnabled((v) => !v)}
        editCount={editCount}
      />
    </>
  );
}
