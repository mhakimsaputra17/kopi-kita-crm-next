"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { ChatSidebar, type ConversationItem } from "./chat-sidebar";
import { ChatContent } from "./chat-content";

export function ChatLayout() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Key to force ChatContent remount on "new chat" even if already null
  const [chatKey, setChatKey] = useState(0);

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

  // New chat — deselect active, ChatContent will start fresh
  const handleNewChat = useCallback(() => {
    setActiveConvoId(null);
    setChatKey((k) => k + 1); // force remount even if already null
  }, []);

  // Select existing conversation
  const handleSelect = useCallback((id: string) => {
    setActiveConvoId(id);
  }, []);

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
      if (activeConvoId === id) setActiveConvoId(null);
    },
    [activeConvoId],
  );

  // Called by ChatContent when a new conversation is created via chat
  const handleConversationCreated = useCallback(
    (newId: string) => {
      setActiveConvoId(newId);
      fetchConversations(); // refresh list
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
          activeId={activeConvoId}
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

        <ChatContent
          key={chatKey}
          conversationId={activeConvoId}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
}
