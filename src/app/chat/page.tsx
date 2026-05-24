"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  MessageCircle,
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
  Send,
  Paperclip,
  X,
  User,
  FileText,
  Image,
  ChevronRight,
  Clock,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  attachment_url?: string;
  attachment_type?: string;
  read_at?: string;
  created_at: string;
}

interface Conversation {
  bookingId: string;
  service: string;
  otherUserId: string;
  otherUserName: string;
  otherAvatar?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getShortPreview(msg: ChatMessage | undefined): string {
  if (!msg) return "No messages yet";
  if (msg.attachment_type === "image") return "📷 Image";
  if (msg.attachment_url) return "📎 File";
  return msg.text.length > 60 ? msg.text.slice(0, 60) + "…" : msg.text;
}

/* ------------------------------------------------------------------ */
/*  Main Chat Page                                                    */
/* ------------------------------------------------------------------ */

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/chat");
    }
  }, [user, authLoading, router]);

  /* ----- state ----- */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  /* ----- fetch conversations ----- */
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Find all bookings the user participates in
      const { data: asCustomer } = await supabase
        .from("bookings")
        .select(
          `id, service, status, created_at,
           taskers!inner(user_id, users!taskers_user_id_fkey(id, full_name, avatar_url))`
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      const { data: asTasker } = await supabase
        .from("bookings")
        .select(
          `id, service, status, created_at,
           users!bookings_customer_id_fkey(id, full_name, avatar_url)`
        )
        .eq("taskers.user_id", user.id)
        .order("created_at", { ascending: false });

      const bookingIds: string[] = [];
      const bookingMap = new Map<
        string,
        { service: string; status: string; createdAt: string }
      >();
      const otherPartyMap = new Map<
        string,
        { id: string; name: string; avatar?: string }
      >();

      for (const b of asCustomer || []) {
        bookingIds.push(b.id);
        bookingMap.set(b.id, {
          service: b.service,
          status: b.status,
          createdAt: b.created_at,
        });
        const taskerUser = (b as any).taskers?.users;
        if (taskerUser) {
          otherPartyMap.set(b.id, {
            id: taskerUser.id,
            name: taskerUser.full_name,
            avatar: taskerUser.avatar_url,
          });
        }
      }

      for (const b of asTasker || []) {
        if (!bookingMap.has(b.id)) {
          bookingIds.push(b.id);
        }
        bookingMap.set(b.id, {
          service: b.service,
          status: b.status,
          createdAt: b.created_at,
        });
        const customer = (b as any).users;
        if (customer) {
          otherPartyMap.set(b.id, {
            id: customer.id,
            name: customer.full_name,
            avatar: customer.avatar_url,
          });
        }
      }

      if (bookingIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // 2. Get last message per booking
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("*")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false });

      // 3. Get unread counts
      const { data: unreadData } = await supabase
        .from("messages")
        .select("booking_id, id", { count: "exact", head: false })
        .in("booking_id", bookingIds)
        .eq("receiver_id", user.id)
        .is("read_at", null);

      // Build unread count map
      const unreadMap = new Map<string, number>();
      for (const m of unreadData || []) {
        unreadMap.set(
          m.booking_id,
          (unreadMap.get(m.booking_id) || 0) + 1
        );
      }

      // 4. Build conversation list
      const latestPerBooking = new Map<string, ChatMessage>();
      for (const m of lastMessages || []) {
        if (!latestPerBooking.has(m.booking_id)) {
          latestPerBooking.set(m.booking_id, m as ChatMessage);
        }
      }

      const convos: Conversation[] = bookingIds
        .filter((id) => bookingMap.has(id))
        .map((bookingId) => {
          const meta = bookingMap.get(bookingId)!;
          const other = otherPartyMap.get(bookingId);
          const lastMsg = latestPerBooking.get(bookingId);
          return {
            bookingId,
            service: meta.service,
            otherUserId: other?.id || "",
            otherUserName: other?.name || "Unknown",
            otherAvatar: other?.avatar,
            lastMessage: lastMsg,
            unreadCount: unreadMap.get(bookingId) || 0,
            updatedAt: lastMsg?.created_at || meta.createdAt,
            status: meta.status,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

      setConversations(convos);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-inbox-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  /* ----- filtered ----- */
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.otherUserName.toLowerCase().includes(q) ||
      c.service.toLowerCase().includes(q)
    );
  });

  /* ----- loading guard ----- */
  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ===================== HEADER ===================== */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all text-gray-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight">
                Messages
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Chat history
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xs w-full hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-gray-900/5 focus:bg-white transition-all"
            />
          </div>
        </div>
      </header>

      {/* ===================== BODY ===================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ---- Conversation List ---- */}
        <aside
          className={`w-full sm:w-96 border-r border-gray-100 flex flex-col bg-gray-50/30 ${
            activeBookingId ? "hidden sm:flex" : "flex"
          }`}
        >
          {/* Mobile search */}
          <div className="p-3 sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-gray-900/5 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="sm" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-7 h-7 text-gray-300" />
                </div>
                <p className="font-bold text-gray-500">
                  {searchQuery
                    ? "No conversations match your search"
                    : "No conversations yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Messages from your bookings will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((conv) => (
                  <button
                    key={conv.bookingId}
                    onClick={() => setActiveBookingId(conv.bookingId)}
                    className={`w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                      activeBookingId === conv.bookingId
                        ? "bg-blue-50/50 border-l-2 border-blue-500"
                        : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {conv.otherAvatar ? (
                        <img
                          src={conv.otherAvatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-gray-900 truncate">
                          {conv.otherUserName}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                          {formatRelativeTime(conv.updatedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-gray-400 truncate mt-0.5">
                        {conv.service}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-[12px] text-gray-500 truncate flex-1">
                          {conv.unreadCount > 0 ? (
                            <span className="font-bold text-gray-900">
                              {getShortPreview(conv.lastMessage)}
                            </span>
                          ) : (
                            getShortPreview(conv.lastMessage)
                          )}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ---- Chat View ---- */}
        <main
          className={`flex-1 flex flex-col ${
            activeBookingId ? "flex" : "hidden sm:flex"
          }`}
        >
          {activeBookingId ? (
            <ChatView
              key={activeBookingId}
              bookingId={activeBookingId}
              currentUserId={user.id}
              onBack={() => setActiveBookingId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  Your Messages
                </h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  Select a conversation from the list to view your chat history.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ChatView – inline persistent chat per conversation                */
/* ================================================================== */

function ChatView({
  bookingId,
  currentUserId,
  onBack,
}: {
  bookingId: string;
  currentUserId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Fetch & subscribe ----
  useEffect(() => {
    let isMounted = true;
    const channelId = Math.random().toString(36).slice(2, 10);
    let channel: any = null;

    const fetchMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (isMounted && data) {
        setMessages(data as ChatMessage[]);
      }
      setLoading(false);
    };

    fetchMessages();

    // Realtime subscription
    channel = supabase
      .channel(`chat-detail-${bookingId}-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: any) => {
          if (isMounted) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              const newMsg = payload.new as ChatMessage;
              // Auto-mark messages from others as read
              if (newMsg.sender_id !== currentUserId) {
                supabase
                  .from("messages")
                  .update({ read_at: new Date().toISOString() })
                  .eq("id", newMsg.id)
                  .then(() => {});
                newMsg.read_at = new Date().toISOString();
              }
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [bookingId, currentUserId]);

  // ---- Auto-scroll ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Mark as read on open ----
  useEffect(() => {
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .neq("sender_id", currentUserId)
      .is("read_at", null)
      .then(() => {});
  }, [bookingId, currentUserId]);

  // ---- File upload ----
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${bookingId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
      const attachmentType = file.type.startsWith("image/") ? "image" : "file";
      await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: currentUserId,
        text: file.name,
        attachment_url: publicUrl,
        attachment_type: attachmentType,
      });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ---- Send message ----
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const text = newMessage;
    setNewMessage("");
    await supabase.from("messages").insert({
      booking_id: bookingId,
      sender_id: currentUserId,
      text,
    });
  };

  // ---- Get read status ----
  const getReadStatus = (msg: ChatMessage) => {
    if (msg.sender_id !== currentUserId) return null;
    if (msg.read_at) return <CheckCheck className="w-3 h-3 text-blue-500" />;
    return <Check className="w-3 h-3 text-gray-300" />;
  };

  return (
    <>
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all text-gray-500 sm:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-gray-900 truncate">Chat</h3>
            <p className="text-[10px] text-gray-400 font-medium truncate">
              Booking #{bookingId.slice(0, 8)}
            </p>
          </div>
        </div>
        <Link
          href={`/booking/${bookingId}/tracking`}
          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline shrink-0"
        >
          Details
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="sm" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-gray-200" />
            </div>
            <p className="text-sm font-medium text-gray-400">
              Send a message to start the conversation…
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            const showTime =
              idx === 0 ||
              new Date(msg.created_at).getTime() -
                new Date(messages[idx - 1].created_at).getTime() >
                600000;
            const isImage =
              msg.attachment_type === "image" && msg.attachment_url;

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="text-center mb-4">
                    <span className="text-[10px] font-medium text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                      {new Date(msg.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                <div
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  {isImage ? (
                    <div
                      className={`max-w-[80%] rounded-2xl overflow-hidden shadow-sm ${
                        isMe
                          ? "rounded-br-sm"
                          : "rounded-bl-sm border border-gray-100"
                      }`}
                    >
                      <img
                        src={msg.attachment_url}
                        alt={msg.text}
                        className="w-full h-auto max-h-64 object-cover"
                        loading="lazy"
                      />
                      {msg.text && (
                        <div
                          className={`px-4 py-2 text-sm ${
                            isMe
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-800"
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}
                    </div>
                  ) : msg.attachment_url ? (
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm flex items-center gap-3 ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm shadow-sm"
                          : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      <FileText className="w-5 h-5 shrink-0" />
                      <span className="truncate">{msg.text}</span>
                    </a>
                  ) : (
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm shadow-sm"
                          : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400 mt-1 font-medium px-1 flex items-center gap-1">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {getReadStatus(msg)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="p-4 bg-white border-t border-gray-100 flex gap-2 items-center shrink-0"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors disabled:opacity-50"
          title="Attach file"
        >
          {uploading ? (
            <LoadingSpinner size="xs" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm transition-colors outline-none"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </>
  );
}
