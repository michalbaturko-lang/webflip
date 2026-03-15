"use client";

import { useState, useCallback } from "react";
import ChatPanel, { type ChatMessage } from "./ChatPanel";
import InlineEditor from "./InlineEditor";
import VisualDiff from "./VisualDiff";
import UndoStackPanel, { useUndoStack, useUndoKeyboard } from "./UndoStack";
import SmartSuggestions from "./SmartSuggestions";
import EditorToolbar from "./EditorToolbar";

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
  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Panel visibility states
  const [isDiffVisible, setIsDiffVisible] = useState(false);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isInlineEditEnabled, setIsInlineEditEnabled] = useState(false);

  // Diff state - track before/after HTML
  const [beforeHtml, setBeforeHtml] = useState("");
  const [afterHtml, setAfterHtml] = useState("");

  // Undo/Redo stack
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

  // Apply HTML to iframe
  const applyHtml = useCallback(
    (html: string) => {
      onHtmlUpdate(html);
    },
    [onHtmlUpdate]
  );

  // Keyboard shortcuts for undo/redo
  useUndoKeyboard(undo, redo, applyHtml);

  // Handle successful edit from chat
  const handleEditSuccess = useCallback(
    (instruction: string, html: string) => {
      // Store before HTML for diff
      const currentHtml =
        snapshots.length > 0 ? snapshots[currentIndex]?.html || "" : "";
      setBeforeHtml(currentHtml);
      setAfterHtml(html);

      // Push to undo stack
      pushSnapshot(html, instruction.substring(0, 60));
    },
    [snapshots, currentIndex, pushSnapshot]
  );

  // Handle inline edit
  const handleInlineEdit = useCallback(
    (instruction: string) => {
      // Get current HTML from iframe for snapshot
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          const html = doc.documentElement.outerHTML;
          const currentHtml =
            snapshots.length > 0
              ? snapshots[currentIndex]?.html || ""
              : "";
          setBeforeHtml(currentHtml);
          setAfterHtml(html);
          pushSnapshot(html, instruction.substring(0, 60));
        }
      } catch {
        // Ignore cross-origin
      }
    },
    [iframeRef, snapshots, currentIndex, pushSnapshot]
  );

  // Undo handler
  const handleUndo = useCallback(() => {
    const html = undo();
    if (html) {
      applyHtml(html);
      // Update diff
      const prevIdx = currentIndex - 1;
      if (prevIdx >= 0 && snapshots[prevIdx]) {
        setAfterHtml(snapshots[prevIdx].html);
        setBeforeHtml(prevIdx > 0 ? snapshots[prevIdx - 1]?.html || "" : "");
      }
    }
  }, [undo, applyHtml, currentIndex, snapshots]);

  // Redo handler
  const handleRedo = useCallback(() => {
    const html = redo();
    if (html) {
      applyHtml(html);
    }
  }, [redo, applyHtml]);

  // Restore to specific snapshot
  const handleRestore = useCallback(
    (index: number) => {
      const html = restoreToIndex(index);
      if (html) {
        applyHtml(html);
        setAfterHtml(html);
        setBeforeHtml(index > 0 ? snapshots[index - 1]?.html || "" : "");
      }
    },
    [restoreToIndex, applyHtml, snapshots]
  );

  // Handle suggestion apply - send through chat
  const handleSuggestionApply = useCallback(
    (instruction: string) => {
      // This will trigger the chat panel to send the instruction
      // We add a user message and let the chat panel handle the API call
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
      {/* Inline click-to-edit */}
      <InlineEditor
        iframeRef={iframeRef}
        onEditApplied={handleInlineEdit}
        enabled={isInlineEditEnabled}
      />

      {/* Chat panel - floating bottom-right */}
      <ChatPanel
        token={token}
        variantIndex={variantIndex}
        onHtmlUpdate={applyHtml}
        onEditSuccess={handleEditSuccess}
        messages={messages}
        setMessages={setMessages}
      />

      {/* Visual diff panel */}
      <VisualDiff
        beforeHtml={beforeHtml}
        afterHtml={afterHtml}
        isVisible={isDiffVisible}
      />

      {/* Undo/redo history timeline */}
      <UndoStackPanel
        snapshots={snapshots}
        currentIndex={currentIndex}
        onRestore={handleRestore}
        isVisible={isHistoryVisible}
      />

      {/* Smart suggestions */}
      <SmartSuggestions
        iframeRef={iframeRef}
        onApply={handleSuggestionApply}
        isVisible={isSuggestionsVisible}
        onClose={() => setIsSuggestionsVisible(false)}
      />

      {/* Bottom toolbar */}
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
