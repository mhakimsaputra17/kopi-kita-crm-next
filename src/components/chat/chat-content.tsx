"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Coffee,
  Copy,
  Check,
  Database,
  TrendingUp,
  UserPlus,
  CalendarDays,
  BarChart3,
  Heart,
  AlertCircle,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import { Shimmer } from "@/components/ai-elements/shimmer";

// ─── Types ───
interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
}

const suggestedPrompts: { text: string; icon: React.ReactNode }[] = [
  { text: "Top tren minggu ini", icon: <TrendingUp className="size-3.5" /> },
  { text: "Siapa pelanggan baru?", icon: <UserPlus className="size-3.5" /> },
  { text: "Buat promo untuk weekend", icon: <CalendarDays className="size-3.5" /> },
  { text: "Analisis segmen terbesar", icon: <BarChart3 className="size-3.5" /> },
  { text: "Pelanggan caramel lovers", icon: <Heart className="size-3.5" /> },
];

const GREETING: ChatMsg = {
  id: "ai-greeting",
  role: "assistant",
  text: "Halo Mimi! 👋 Saya **Kopi AI**, asisten cerdas untuk kedai kopi Kopi Kita. Saya bisa bantu analisis data pelanggan dan buat ide promo.\n\nMau tanya apa hari ini?",
};

// ─── Copy Action ───
function CopyMessageAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <MessageAction
      tooltip={copied ? "Tersalin!" : "Salin"}
      onClick={handleCopy}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </MessageAction>
  );
}

// ─── AI Avatar ───
function KopiAIAvatar() {
  return (
    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#D4A574] to-[#A67C52] flex items-center justify-center shrink-0">
      <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
    </div>
  );
}

// ─── Main Component ───
interface ChatContentProps {
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
}

export function ChatContent({ conversationId, onConversationCreated }: ChatContentProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const convoIdRef = useRef<string | null>(conversationId ?? null);
  // Track IDs created in this session so we skip refetching them
  const createdInSession = useRef<Set<string>>(new Set());

  // Update ref when prop changes
  useEffect(() => {
    convoIdRef.current = conversationId ?? null;
  }, [conversationId]);

  // Load messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      // New chat — reset to greeting
      setMessages([GREETING]);
      return;
    }

    // Skip reload if this conversation was just created by our own chat
    if (createdInSession.current.has(conversationId)) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/conversations/${conversationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const loaded: ChatMsg[] = data.messages.map(
          (m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            text: m.content,
          }),
        );
        setMessages(loaded.length > 0 ? loaded : [GREETING]);
      })
      .catch(() => {
        if (!cancelled) setMessages([GREETING]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg: ChatMsg = {
        id: `user-${Date.now()}`,
        role: "user",
        text: text.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      const aiMsgId = `ai-${Date.now()}`;
      let aiMsgAdded = false;

      try {
        abortRef.current = new AbortController();

        // Build messages array for the API (exclude greeting, include conversation history)
        const historyForApi = [
          ...messages.filter((m) => m.id !== "ai-greeting" && !m.error),
          userMsg,
        ].map((m) => ({ role: m.role, content: m.text }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: historyForApi,
            conversationId: convoIdRef.current,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6);
            if (payload === "[DONE]") break;

            try {
              const data = JSON.parse(payload);
              if (data.error) throw new Error(data.error);
              if (data.conversationId) {
                // New conversation was created — notify parent
                convoIdRef.current = data.conversationId;
                createdInSession.current.add(data.conversationId);
                onConversationCreated?.(data.conversationId);
              }
              if (data.content) {
                if (!aiMsgAdded) {
                  // Add assistant message only on first content chunk
                  aiMsgAdded = true;
                  setMessages((prev) => [
                    ...prev,
                    { id: aiMsgId, role: "assistant", text: data.content },
                  ]);
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, text: m.text + data.content }
                        : m,
                    ),
                  );
                }
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      // If stream ended without any content
      if (!aiMsgAdded) {
        setMessages((prev) => [
          ...prev,
          { id: aiMsgId, role: "assistant", text: "Maaf, respons AI kosong. Coba kirim ulang pertanyaanmu ya! 🙏", error: true },
        ]);
      }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const errorText =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setMessages((prev) => {
          // If we never added the AI message, add it as error
          if (!aiMsgAdded) {
            return [
              ...prev,
              { id: aiMsgId, role: "assistant", text: `Maaf, terjadi kesalahan: ${errorText}. Coba lagi ya! 🙏`, error: true },
            ];
          }
          return prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  text: `Maaf, terjadi kesalahan: ${errorText}. Coba lagi ya! 🙏`,
                  error: true,
                }
              : m,
          );
        });
      } finally {
        setIsTyping(false);
        abortRef.current = null;
      }
    },
    [isTyping, messages, onConversationCreated],
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (message.text.trim()) {
        sendMessage(message.text);
      }
    },
    [sendMessage],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion);
    },
    [sendMessage],
  );

  const askedTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => m.text);
  const availablePrompts = suggestedPrompts.filter(
    (p) => !askedTexts.includes(p.text),
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Status Bar */}
      <div className="flex items-center px-4 sm:px-6 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#8B9D77]/8 border border-[#8B9D77]/15">
          <div className="relative flex items-center justify-center">
            <Database className="w-3 h-3 text-[#8B9D77]" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#8B9D77] rounded-full" />
          </div>
          <span className="text-[#5E7248] dark:text-[#8B9D77] text-xs font-medium">
            Terhubung dengan data 47 pelanggan
          </span>
        </div>
      </div>

      {/* Chat Area with ai-elements */}
      <Conversation className="flex-1">
        <ConversationContent className="gap-6 px-4 sm:px-6 py-5 sm:py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="size-5 border-2 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin" />
                <span className="text-sm">Memuat riwayat chat...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4A574]/20 to-[#A67C52]/10 flex items-center justify-center">
                  <Coffee className="size-8 text-[#D4A574]" />
                </div>
              }
              title="Halo Mimi!"
              description="Tanyakan apa saja tentang data pelanggan atau minta saya buatkan ide promo."
              className="[&_h3]:font-display [&_h3]:text-lg [&_h3]:text-foreground [&_p]:text-muted-foreground"
            />
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="group/msg">
                {msg.role === "assistant" ? (
                  <div className="flex items-start gap-2.5 sm:gap-3 max-w-full sm:max-w-[85%]">
                    <KopiAIAvatar />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-display text-[0.78rem] font-semibold mb-1.5 block">
                        Kopi AI
                      </span>
                      <Message from="assistant">
                        <MessageContent>
                          {msg.error ? (
                            <div className="flex items-start gap-2 text-destructive">
                              <AlertCircle className="size-4 mt-0.5 shrink-0" />
                              <span className="text-sm">{msg.text}</span>
                            </div>
                          ) : (
                            <MessageResponse>{msg.text}</MessageResponse>
                          )}
                        </MessageContent>
                        {msg.text && !msg.error && (
                          <MessageActions className="mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
                            <CopyMessageAction text={msg.text} />
                          </MessageActions>
                        )}
                      </Message>
                    </div>
                  </div>
                ) : (
                  <Message from="user" className="max-w-[85%] sm:max-w-[75%]">
                    <MessageContent>
                      <span className="text-sm leading-relaxed">{msg.text}</span>
                    </MessageContent>
                  </Message>
                )}
              </div>
            ))
          )}

          {/* Typing Indicator — shows while waiting for first token */}
          {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-start gap-2.5 sm:gap-3">
              <KopiAIAvatar />
              <div className="flex-1 min-w-0">
                <span className="text-foreground font-display text-[0.78rem] font-semibold mb-1.5 block">
                  Kopi AI
                </span>
                <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-card border border-border/30">
                  <Shimmer
                    className="text-sm text-[#D4A574]"
                    duration={1.5}
                    as="span"
                  >
                    Sedang menganalisis data pelanggan...
                  </Shimmer>
                </div>
              </div>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton
          className="dark:bg-card bg-card border-border/40 shadow-lg shadow-background/50 hover:bg-secondary"
        />
      </Conversation>

      {/* Suggested Prompts using ai-elements Suggestion */}
      {availablePrompts.length > 0 && (
        <div className="px-4 sm:px-6 pb-2">
          <Suggestions>
            {availablePrompts.map((prompt) => (
              <Suggestion
                key={prompt.text}
                suggestion={prompt.text}
                onClick={handleSuggestionClick}
                disabled={isTyping}
                className="shrink-0 gap-1.5"
              >
                {prompt.icon}
                {prompt.text}
              </Suggestion>
            ))}
          </Suggestions>
        </div>
      )}

      {/* Input Bar using ai-elements PromptInput */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2 sm:pt-3">
        <PromptInput
          onSubmit={handleSubmit}
          className="border border-border/40 rounded-xl shadow-sm focus-within:border-[#D4A574]/30 focus-within:ring-2 focus-within:ring-[#D4A574]/8 transition-all"
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Ketik pertanyaan tentang pelanggan atau promo..."
              disabled={isTyping}
              className="min-h-[44px] max-h-[120px]"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit
              disabled={!input.trim() || isTyping}
              className="bg-gradient-to-br from-[#D4A574] to-[#A67C52] text-white hover:shadow-md hover:shadow-[#D4A574]/20 border-0"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
