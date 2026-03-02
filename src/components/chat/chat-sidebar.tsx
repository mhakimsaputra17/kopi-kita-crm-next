"use client";

import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  conversations: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const saveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  // Group conversations: Today, Yesterday, Older
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  const today: ConversationItem[] = [];
  const yesterday: ConversationItem[] = [];
  const older: ConversationItem[] = [];

  for (const c of conversations) {
    const d = new Date(c.updatedAt);
    if (d >= todayStart) today.push(c);
    else if (d >= yesterdayStart) yesterday.push(c);
    else older.push(c);
  }

  const renderGroup = (label: string, items: ConversationItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 mb-1.5">
          {label}
        </p>
        {items.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
              c.id === activeId
                ? "bg-[#D4A574]/10 text-[#3C2415] border border-[#D4A574]/20"
                : "hover:bg-muted/50 text-foreground/80"
            }`}
            onClick={() => c.id !== editingId && onSelect(c.id)}
          >
            <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
            {editingId === c.id ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 bg-transparent border-b border-[#D4A574]/40 outline-none text-sm py-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="p-0.5 hover:text-[#8B9D77]">
                  <Check className="size-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="p-0.5 hover:text-destructive">
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 truncate">{c.title}</span>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(c.id, c.title); }}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* New Chat button */}
      <div className="p-3 border-b border-border/30">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border/40 hover:bg-muted/50 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" />
          Chat Baru
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            Belum ada riwayat chat. Mulai percakapan baru!
          </p>
        ) : (
          <>
            {renderGroup("Hari ini", today)}
            {renderGroup("Kemarin", yesterday)}
            {renderGroup("Sebelumnya", older)}
          </>
        )}
      </div>
    </div>
  );
}
