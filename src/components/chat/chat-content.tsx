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
  Search,
  Users,
  Lightbulb,
  Tag,
  MessageSquare,
  PenLine,
  Wrench,
  Sparkles,
  GitCompareArrows,
  CupSoda,
  History,
  Crown,
  PieChart,
  Target,
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
  PromptInputButton,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { ModelSelector } from "@/components/chat/model-selector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ai-models";
import type { AIModel } from "@/lib/ai-models";
import type { LucideIcon } from "lucide-react";

// ─── Types ───
interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
}

interface ToolEvent {
  name: string;
  status: "executing" | "done";
}

const TOOL_DISPLAY: Record<string, { icon: LucideIcon; label: string }> = {
  generate_promo: { icon: Sparkles, label: "Membuat ide promo..." },
  search_customers: { icon: Search, label: "Mencari pelanggan..." },
  get_customer_stats: { icon: BarChart3, label: "Mengambil statistik..." },
  analyze_segments: { icon: PieChart, label: "Menganalisis segmen..." },
  get_customer_growth: { icon: TrendingUp, label: "Mengambil data pertumbuhan..." },
  get_promo_history: { icon: History, label: "Mengambil riwayat promo..." },
  find_top_customers: { icon: Crown, label: "Mencari pelanggan terbaik..." },
  compare_segments: { icon: GitCompareArrows, label: "Membandingkan segmen..." },
  get_drink_analysis: { icon: CupSoda, label: "Menganalisis minuman..." },
  suggest_new_promo: { icon: Target, label: "Mencari peluang promo baru..." },
};

// ─── Tool Catalog for tool picker ───
interface ToolCatalogItem {
  id: string;
  icon: LucideIcon;
  name: string;
  description: string;
  prompt: string;
  group: "data" | "promo";
}

const TOOL_CATALOG: ToolCatalogItem[] = [
  // Data & Analisis
  {
    id: "get_customer_stats",
    icon: BarChart3,
    name: "Statistik Pelanggan",
    description: "Total pelanggan, tag populer, minuman favorit",
    prompt: "Tampilkan statistik pelanggan keseluruhan",
    group: "data",
  },
  {
    id: "search_customers",
    icon: Search,
    name: "Cari Pelanggan",
    description: "Cari pelanggan berdasarkan nama, tag, atau minuman",
    prompt: "Daftar semua pelanggan",
    group: "data",
  },
  {
    id: "analyze_segments",
    icon: PieChart,
    name: "Analisis Segmen",
    description: "Deep dive segmen: top drinks, related tags, member",
    prompt: "Analisis segmen sweet drinks",
    group: "data",
  },
  {
    id: "get_customer_growth",
    icon: TrendingUp,
    name: "Pertumbuhan Pelanggan",
    description: "Timeline pertumbuhan harian/mingguan",
    prompt: "Tampilkan pertumbuhan pelanggan minggu ini",
    group: "data",
  },
  {
    id: "find_top_customers",
    icon: Crown,
    name: "Pelanggan Terbaik",
    description: "Ranking pelanggan paling aktif & loyal",
    prompt: "Siapa 5 pelanggan paling loyal?",
    group: "data",
  },
  {
    id: "compare_segments",
    icon: GitCompareArrows,
    name: "Bandingkan Segmen",
    description: "Bandingkan 2 segmen: jumlah, drinks, overlap",
    prompt: "Bandingkan segmen oat milk vs caramel",
    group: "data",
  },
  {
    id: "get_drink_analysis",
    icon: CupSoda,
    name: "Analisis Minuman",
    description: "Ranking minuman populer dengan tags & pelanggan",
    prompt: "Tampilkan analisis minuman terlaris",
    group: "data",
  },
  // Promo & Kampanye
  {
    id: "generate_promo",
    icon: Sparkles,
    name: "Generate Promo",
    description: "Buat 2-3 kampanye promo AI berdasarkan data",
    prompt: "Buatkan ide promo untuk minggu ini",
    group: "promo",
  },
  {
    id: "get_promo_history",
    icon: History,
    name: "Riwayat Promo",
    description: "Lihat semua promo yang pernah dibuat",
    prompt: "Tampilkan riwayat promo yang sudah dibuat",
    group: "promo",
  },
  {
    id: "suggest_new_promo",
    icon: Target,
    name: "Saran Promo Baru",
    description: "Cari segmen yang belum pernah dipromo",
    prompt: "Segmen mana yang belum pernah dipromo?",
    group: "promo",
  },
];

// ─── Tool Picker Component ───
function ToolPicker({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const dataTools = TOOL_CATALOG.filter((t) => t.group === "data");
  const promoTools = TOOL_CATALOG.filter((t) => t.group === "promo");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PromptInputButton
          tooltip="Panggil Tool"
          disabled={disabled}
          variant={open ? "default" : "ghost"}
          onClick={() => setOpen(!open)}
        >
          <Wrench className="size-4" />
          <span className="hidden sm:inline text-xs">Tools</span>
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        side="top"
        align="start"
        sideOffset={8}
      >
        <Command>
          <CommandInput placeholder="Cari tool..." />
          <CommandList>
            <CommandEmpty>Tool tidak ditemukan.</CommandEmpty>
            <CommandGroup heading="📊 Data & Analisis">
              {dataTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <CommandItem
                    key={tool.id}
                    onSelect={() => {
                      onSelect(tool.prompt);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2.5 py-2"
                  >
                    <div className="mt-0.5 p-1 rounded bg-[#D4A574]/10">
                      <Icon className="size-3.5 text-[#A67C52] dark:text-[#D4A574]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight dark:text-[#F5EDE4]">{tool.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight dark:text-[#BFA898]">{tool.description}</p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="🎯 Promo & Kampanye">
              {promoTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <CommandItem
                    key={tool.id}
                    onSelect={() => {
                      onSelect(tool.prompt);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2.5 py-2"
                  >
                    <div className="mt-0.5 p-1 rounded bg-[#D4A574]/10">
                      <Icon className="size-3.5 text-[#A67C52] dark:text-[#D4A574]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight dark:text-[#F5EDE4]">{tool.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight dark:text-[#BFA898]">{tool.description}</p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const ALL_SUGGESTIONS: { text: string; icon: React.ReactNode }[] = [
  // Data & Statistik
  { text: "Top tren minggu ini", icon: <TrendingUp className="size-3.5" /> },
  { text: "Berapa total pelanggan sekarang?", icon: <Users className="size-3.5" /> },
  { text: "Ringkasan bisnis hari ini", icon: <BarChart3 className="size-3.5" /> },
  { text: "Pertumbuhan pelanggan bulan ini", icon: <TrendingUp className="size-3.5" /> },

  // Pelanggan
  { text: "Siapa pelanggan baru minggu ini?", icon: <UserPlus className="size-3.5" /> },
  { text: "Pelanggan paling loyal", icon: <Crown className="size-3.5" /> },
  { text: "Daftar semua pelanggan", icon: <Users className="size-3.5" /> },
  { text: "Siapa yang suka oat milk?", icon: <Search className="size-3.5" /> },
  { text: "Pelanggan yang suka caramel", icon: <Heart className="size-3.5" /> },

  // Minuman & Menu
  { text: "Minuman paling populer", icon: <CupSoda className="size-3.5" /> },
  { text: "Ranking menu terlaris", icon: <CupSoda className="size-3.5" /> },
  { text: "Minuman apa yang paling banyak diminta?", icon: <CupSoda className="size-3.5" /> },

  // Segmen & Analisis
  { text: "Analisis segmen sweet drinks", icon: <PieChart className="size-3.5" /> },
  { text: "Analisis pelanggan morning coffee", icon: <PieChart className="size-3.5" /> },
  { text: "Bandingkan oat milk vs caramel", icon: <GitCompareArrows className="size-3.5" /> },
  { text: "Bandingkan sweet drinks vs black coffee", icon: <GitCompareArrows className="size-3.5" /> },
  { text: "Segmen mana yang paling besar?", icon: <PieChart className="size-3.5" /> },

  // Promo & Kampanye
  { text: "Buat promo untuk weekend", icon: <CalendarDays className="size-3.5" /> },
  { text: "Buat ide promo untuk pelanggan baru", icon: <Sparkles className="size-3.5" /> },
  { text: "Segmen belum pernah dipromo", icon: <Target className="size-3.5" /> },
  { text: "Riwayat promo yang sudah dibuat", icon: <History className="size-3.5" /> },
  { text: "Saran kampanye untuk bulan depan", icon: <Lightbulb className="size-3.5" /> },

  // Strategi Bisnis
  { text: "Tag minat yang paling populer", icon: <Tag className="size-3.5" /> },
  { text: "Ide menu baru berdasarkan tren", icon: <Lightbulb className="size-3.5" /> },
  { text: "Pelanggan cold drinks ada berapa?", icon: <Search className="size-3.5" /> },
];

// Shuffle & pick N suggestions (Fisher-Yates)
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

function useRandomSuggestions(excluded: string[], count = 5) {
  const [picks, setPicks] = useState<typeof ALL_SUGGESTIONS>([]);

  useEffect(() => {
    const available = ALL_SUGGESTIONS.filter((s) => !excluded.includes(s.text));
    setPicks(pickRandom(available, count));
  }, [excluded.length, count]); // re-shuffle when user asks something new

  return picks;
}

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

// ─── Thinking Steps — contextual fake reasoning ───
interface ThinkingStep {
  icon: LucideIcon;
  label: string;
  delay: number; // ms before this step appears
}

function getThinkingSteps(query: string): ThinkingStep[] {
  const q = query.toLowerCase();

  // Promo-related
  if (q.includes("promo") || q.includes("diskon") || q.includes("penawaran") || q.includes("campaign")) {
    return [
      { icon: Database, label: "Membaca data pelanggan...", delay: 0 },
      { icon: Tag, label: "Menganalisis segmen target...", delay: 400 },
      { icon: Lightbulb, label: "Menyusun ide promo...", delay: 900 },
    ];
  }

  // Segment/customer analysis
  if (q.includes("segmen") || q.includes("analisis") || q.includes("lovers") || q.includes("pelanggan")) {
    return [
      { icon: Database, label: "Membaca data pelanggan...", delay: 0 },
      { icon: Search, label: "Mencari pelanggan yang cocok...", delay: 400 },
      { icon: Users, label: "Mengelompokkan berdasarkan preferensi...", delay: 900 },
    ];
  }

  // Trend/statistics
  if (q.includes("tren") || q.includes("trend") || q.includes("statistik") || q.includes("top") || q.includes("populer")) {
    return [
      { icon: Database, label: "Mengambil data terbaru...", delay: 0 },
      { icon: BarChart3, label: "Menghitung statistik...", delay: 400 },
      { icon: TrendingUp, label: "Menganalisis tren...", delay: 900 },
    ];
  }

  // New customers
  if (q.includes("baru") || q.includes("new") || q.includes("bergabung")) {
    return [
      { icon: Database, label: "Membaca data pelanggan...", delay: 0 },
      { icon: UserPlus, label: "Mengidentifikasi pelanggan baru...", delay: 400 },
      { icon: PenLine, label: "Menyusun daftar...", delay: 900 },
    ];
  }

  // WhatsApp message
  if (q.includes("whatsapp") || q.includes("wa") || q.includes("pesan")) {
    return [
      { icon: Users, label: "Memilih pelanggan target...", delay: 0 },
      { icon: Lightbulb, label: "Menyusun strategi pesan...", delay: 400 },
      { icon: MessageSquare, label: "Menulis pesan personal...", delay: 900 },
    ];
  }

  // Default — generic
  return [
    { icon: Database, label: "Membaca data pelanggan...", delay: 0 },
    { icon: Search, label: "Menganalisis pertanyaan...", delay: 400 },
    { icon: PenLine, label: "Menyusun jawaban...", delay: 900 },
  ];
}

// ─── Thinking Indicator (Chain of Thought) ───
function ThinkingIndicator({ query, toolEvents }: { query: string; toolEvents: ToolEvent[] }) {
  const steps = getThinkingSteps(query);
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < steps.length; i++) {
      timers.push(
        setTimeout(() => setVisibleCount(i + 1), steps[i].delay),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [steps]);

  // Merge fake steps + real tool events
  const hasTools = toolEvents.length > 0;

  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      <KopiAIAvatar />
      <div className="flex-1 min-w-0">
        <span className="text-foreground dark:text-[#F5EDE4] font-display text-[0.78rem] font-semibold mb-1.5 block">
          Kopi AI
        </span>
        <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-card border border-border/30 dark:text-[#F5EDE4]">
          <ChainOfThought defaultOpen>
            <ChainOfThoughtHeader>
              {hasTools ? "Menjalankan aksi..." : "Sedang berpikir..."}
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {/* Show fake steps first (before any tool events arrive) */}
              {!hasTools && steps.slice(0, visibleCount).map((step, i) => (
                <ChainOfThoughtStep
                  key={step.label}
                  icon={step.icon}
                  label={step.label}
                  status={i < visibleCount - 1 ? "complete" : "active"}
                />
              ))}
              {/* Show real tool events when they arrive */}
              {hasTools && (
                <>
                  <ChainOfThoughtStep
                    icon={Database}
                    label="Membaca data pelanggan..."
                    status="complete"
                  />
                  {toolEvents.map((te) => {
                    const display = TOOL_DISPLAY[te.name] ?? { icon: Wrench, label: te.name };
                    return (
                      <ChainOfThoughtStep
                        key={te.name}
                        icon={display.icon}
                        label={display.label}
                        status={te.status === "done" ? "complete" : "active"}
                      />
                    );
                  })}
                  {toolEvents.every((te) => te.status === "done") && (
                    <ChainOfThoughtStep
                      icon={PenLine}
                      label="Menyusun jawaban..."
                      status="active"
                    />
                  )}
                </>
              )}
            </ChainOfThoughtContent>
          </ChainOfThought>
        </div>
      </div>
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
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL.id);
  const abortRef = useRef<AbortController | null>(null);
  const convoIdRef = useRef<string | null>(conversationId ?? null);

  // Load messages on mount (component is fully remounted via key when switching)
  useEffect(() => {
    if (!conversationId) return; // new chat — keep greeting

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

  // Abort any in-flight AI request when unmounting (chat switch / new chat)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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
            model: selectedModel,
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
                // New conversation was created — notify parent (updates URL)
                convoIdRef.current = data.conversationId;
                onConversationCreated?.(data.conversationId);
              }
              // Tool execution events → update CoT steps
              if (data.tool) {
                setActiveTools((prev) => {
                  const existing = prev.findIndex((t) => t.name === data.tool.name);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = data.tool;
                    return updated;
                  }
                  return [...prev, data.tool];
                });
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
        setActiveTools([]);
        abortRef.current = null;
      }
    },
    [isTyping, messages, onConversationCreated, selectedModel],
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
  const availablePrompts = useRandomSuggestions(askedTexts, 5);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Status Bar */}
      <div className="flex items-center px-4 sm:px-6 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#8B9D77]/8 border border-[#8B9D77]/15">
          <div className="relative flex items-center justify-center">
            <Database className="w-3 h-3 text-[#8B9D77]" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#8B9D77] rounded-full" />
          </div>
          <span className="text-[#5E7248] dark:text-[#A8B99A] text-xs font-medium">
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
                <span className="text-sm dark:text-[#BFA898]">Memuat riwayat chat...</span>
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
              className="[&_h3]:font-display [&_h3]:text-lg [&_h3]:text-foreground dark:[&_h3]:text-[#F5EDE4] [&_p]:text-muted-foreground dark:[&_p]:text-[#BFA898]"
            />
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="group/msg">
                {msg.role === "assistant" ? (
                  <div className="flex items-start gap-2.5 sm:gap-3 max-w-full sm:max-w-[85%]">
                    <KopiAIAvatar />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground dark:text-[#F5EDE4] font-display text-[0.78rem] font-semibold mb-1.5 block">
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
                            <MessageResponse className="prose prose-sm prose-kopi max-w-none dark:text-[#F5EDE4] dark:[&_strong]:text-[#F5EDE4] dark:[&_h1]:text-[#F5EDE4] dark:[&_h2]:text-[#F5EDE4] dark:[&_h3]:text-[#F5EDE4] dark:[&_h4]:text-[#F5EDE4] dark:[&_p]:text-[#F5EDE4] dark:[&_li]:text-[#F5EDE4] dark:[&_blockquote]:text-[#E8C9A8] dark:[&_code]:text-[#E8C9A8] dark:[&_a]:text-[#D4A574]">{msg.text}</MessageResponse>
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
                  <div className="flex items-start gap-2.5 sm:gap-3 max-w-[85%] sm:max-w-[75%] ml-auto flex-row-reverse">
                    <img
                      src="/kopikita.webp"
                      alt="You"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-2 ring-[#D4A574]/20"
                    />
                    <Message from="user">
                      <MessageContent>
                        <span className="text-sm leading-relaxed">{msg.text}</span>
                      </MessageContent>
                    </Message>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Thinking Indicator — Chain of Thought while waiting for first token */}
          {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
            <ThinkingIndicator
              query={messages.filter((m) => m.role === "user").at(-1)?.text ?? ""}
              toolEvents={activeTools}
            />
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
            <PromptInputTools>
              <ToolPicker onSelect={sendMessage} disabled={isTyping} />
              <ModelSelector
                models={AVAILABLE_MODELS as unknown as AIModel[]}
                selectedModelId={selectedModel}
                onModelChange={setSelectedModel}
                disabled={isTyping}
              />
            </PromptInputTools>
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
