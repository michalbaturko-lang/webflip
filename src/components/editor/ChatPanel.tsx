"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Minus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import UpsellCard from "./UpsellCard";
import type { ChatMessage, EditApiResponse } from "@/types/editor";

const MAX_MESSAGES = 100;

interface ChatPanelProps {
  token: string;
  variantIndex: number;
  onHtmlUpdate: (html: string) => void;
  onEditSuccess: (instruction: string, html: string) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function ChatPanel({
  token,
  variantIndex,
  onHtmlUpdate,
  onEditSuccess,
  messages,
  setMessages,
}: ChatPanelProps) {
  const t = useTranslations("editor");
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const suggestions = [
    t("suggestion1"),
    t("suggestion2"),
    t("suggestion3"),
    t("suggestion4"),
    t("suggestion5"),
    t("suggestion6"),
  ];

  const trimMessages = useCallback(
    (msgs: ChatMessage[]): ChatMessage[] => {
      if (msgs.length > MAX_MESSAGES) {
        return msgs.slice(msgs.length - MAX_MESSAGES);
      }
      return msgs;
    },
    []
  );

  // Load persisted history with AbortController (#5)
  useEffect(() => {
    if (historyLoaded) return;
    const controller = new AbortController();

    async function loadHistory() {
      try {
        const res = await fetch(`/api/analyze/${token}/edit/${variantIndex}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.history?.length > 0) {
          const loaded: ChatMessage[] = [];
          const limitedHistory = data.history.slice(-50);
          for (const h of limitedHistory) {
            loaded.push({
              id: `hist-user-${h.timestamp}`,
              role: "user",
              content: h.instruction || "",
              timestamp: new Date(h.timestamp),
              status: "success",
            });
            loaded.push({
              id: `hist-asst-${h.timestamp}`,
              role: "assistant",
              content: t("changeApplied"),
              timestamp: new Date(h.timestamp),
              status: "success",
            });
          }
          setMessages(trimMessages(loaded));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Silent fail for other errors
      } finally {
        setHistoryLoaded(true);
      }
    }
    loadHistory();
    return () => controller.abort();
  }, [token, variantIndex, historyLoaded, setMessages, trimMessages, t]);

  // Auto-scroll
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSubmit = useCallback(
    async (text?: string) => {
      const inst = text || instruction;
      if (!inst.trim() || isLoading) return;

      // Abort previous in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setInstruction("");

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: inst.trim(),
        timestamp: new Date(),
        status: "success",
      };

      const pendingMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        status: "pending",
      };

      setMessages((m) => trimMessages([...m, userMsg, pendingMsg]));

      try {
        const res = await fetch(`/api/analyze/${token}/edit/${variantIndex}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: inst.trim() }),
          signal: controller.signal,
        });

        const data: EditApiResponse = await res.json();

        if (res.status === 422 && data.upsell) {
          setMessages((m) =>
            trimMessages(
              m.map((msg) =>
                msg.id === pendingMsg.id
                  ? {
                      ...msg,
                      content: data.message || t("outOfScope"),
                      status: "upsell" as const,
                      errorMessage: data.message,
                    }
                  : msg
              )
            )
          );
          return;
        }

        if (!res.ok) {
          setMessages((m) =>
            trimMessages(
              m.map((msg) =>
                msg.id === pendingMsg.id
                  ? {
                      ...msg,
                      content: data.error || t("editFailed"),
                      status: "error" as const,
                      errorMessage: data.error,
                    }
                  : msg
              )
            )
          );
          return;
        }

        setMessages((m) =>
          trimMessages(
            m.map((msg) =>
              msg.id === pendingMsg.id
                ? {
                    ...msg,
                    content: t("changeApplied"),
                    status: "success" as const,
                  }
                : msg
            )
          )
        );
        if (data.html) {
          onHtmlUpdate(data.html);
          onEditSuccess(inst.trim(), data.html);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMessages((m) =>
          trimMessages(
            m.map((msg) =>
              msg.id === pendingMsg.id
                ? {
                    ...msg,
                    content: t("networkError"),
                    status: "error" as const,
                    errorMessage: t("networkError"),
                  }
                : msg
            )
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [instruction, isLoading, token, variantIndex, onHtmlUpdate, onEditSuccess, setMessages, trimMessages, t]
  );

  const handleContactClick = useCallback(() => {
    window.location.href =
      "mailto:info@webflip.ai?subject=Professional%20website%20services%20inquiry";
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const userEditCount = messages.filter(
    (m) => m.status === "success" && m.role === "user"
  ).length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label={t("title")}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl shadow-purple-500/25 text-white font-medium text-sm transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        style={{
          background:
            "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
        }}
      >
        <MessageCircle className="h-4 w-4" />
        {t("title")}
        {userEditCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/20">
            {userEditCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden transition-all duration-300"
      style={{
        width: "380px",
        height: isMinimized ? "52px" : "520px",
        background:
          "linear-gradient(180deg, rgba(15, 15, 25, 0.97) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-lg"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
            }}
          >
            <MessageCircle className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm text-white">{t("title")}</span>
          {userEditCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              {t("editsApplied", { count: userEditCount })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? t("expand") : t("minimize")}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            aria-label={t("close")}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div
            ref={messagesRef}
            aria-live="polite"
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed20, #5b21b620)",
                    }}
                  >
                    <MessageCircle className="h-6 w-6 text-purple-400" />
                  </div>
                  <p className="text-sm text-gray-300 font-medium">
                    {t("description")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("descriptionSub")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-1">
                    {t("suggestions")}
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSubmit(s)}
                      disabled={isLoading}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2 group disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                    >
                      <ChevronRight className="h-3 w-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-br-sm text-xs text-white bg-purple-600/40 border border-purple-500/20">
                        {msg.content}
                      </div>
                    </div>
                  ) : msg.status === "pending" ? (
                    <div className="flex items-center gap-2 px-2 py-1 text-xs text-purple-300">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{t("applying")}</span>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  ) : msg.status === "upsell" ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-300">
                        {t("upsellIntro")}
                      </div>
                      <UpsellCard
                        message={msg.errorMessage}
                        onContact={handleContactClick}
                      />
                    </div>
                  ) : msg.status === "success" ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{msg.content}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 px-2 py-1 rounded-lg text-xs text-red-400 max-w-[85%]">
                      <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span>{msg.errorMessage || msg.content}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-white/10 flex-shrink-0">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("placeholder")}
                disabled={isLoading}
                rows={2}
                aria-label={t("placeholder")}
                className="w-full resize-none rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-500 border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/25 transition-colors disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!instruction.trim() || isLoading}
                aria-label={t("send")}
                className="absolute right-2 bottom-2.5 p-1.5 rounded-lg transition-all disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                style={{
                  background:
                    instruction.trim() && !isLoading
                      ? "linear-gradient(135deg, #7c3aed, #5b21b6)"
                      : "transparent",
                }}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-purple-300 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5 px-1">
              {t("enterToSend")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
