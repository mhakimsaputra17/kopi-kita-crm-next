"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { ChatSidebar, type ConversationItem } from "./chat-sidebar";
import { ChatContent } from "./chat-content";

interface ChatLayoutProps {
  conversationId: string | null;
}

export function ChatLayout({ conversationId }: ChatLayoutProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // New chat — navigate to /chat (no ID)
  const handleNewChat = useCallback(() => {
    router.push("/chat");
  }, [router]);

  // Select existing conversation — navigate to /chat/[id]
  const handleSelect = useCallback(
    (id: string) => {
      if (id !== conversationId) {
        router.push(`/chat/${id}`);
      }
    },
    [router, conversationId],
  );

  // Rename
  const handleRename = useCallback(async (id: string, title: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  }, []);

  // Delete
  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        router.push("/chat");
      }
    },
    [conversationId, router],
  );

  // Called by ChatContent when a new conversation is created via chat
  const handleConversationCreated = useCallback(
    (newId: string) => {
      // Shallow URL update — change browser URL without triggering Next.js
      // navigation or React re-render. This prevents the ChatContent from
      // unmounting/remounting mid-stream (same pattern as ChatGPT/Claude).
      window.history.replaceState(null, "", `/chat/${newId}`);
      fetchConversations(); // refresh sidebar list
    },
    [fetchConversations],
  );

  return (
    <div className="flex h-[calc(100vh-140px)]">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-200 overflow-hidden border-r border-border/30 bg-card/50 shrink-0`}
      >
        <ChatSidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle sidebar button */}
        <div className="flex items-center px-2 py-1.5 border-b border-border/30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeft className="size-4" />
            )}
          </button>
        </div>

        {/* key = conversationId forces full remount on conversation switch.
            For new chats (null), use stable "__new__" so shallow URL updates
            after first AI response don't cause a remount. */}
        <ChatContent
          key={conversationId ?? "__new__"}
          conversationId={conversationId}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
}
