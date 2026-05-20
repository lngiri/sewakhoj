import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { X, Send, User, Paperclip, Image, FileText, Check, CheckCheck } from "lucide-react";

interface Message {
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

export default function ChatModal({
  bookingId,
  currentUserId,
  otherUserName,
  otherUserId,
  onClose,
}: {
  bookingId: string;
  currentUserId: string;
  otherUserName: string;
  otherUserId?: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelIdRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastChannelRef = useRef<any>(null);

  // Mark messages as read when chat opens
  const markAsRead = useCallback(async () => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .neq("sender_id", currentUserId)
      .is("read_at", null);

    if (!error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id !== currentUserId && !m.read_at
            ? { ...m, read_at: new Date().toISOString() }
            : m
        )
      );
    }
  }, [bookingId, currentUserId]);

  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  // Realtime message subscription
  useEffect(() => {
    channelIdRef.current += 1;
    const currentChannelId = channelIdRef.current;
    let isMounted = true;
    let channel: any = null;

    const setupSubscription = () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      channel = supabase
        .channel(`chat:${bookingId}-${uniqueId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `booking_id=eq.${bookingId}`,
          },
          (payload: any) => {
            if (isMounted && currentChannelId === channelIdRef.current) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.new.id)) return prev;
                const newMsg = payload.new as Message;
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
    };

    fetchMessages();
    setupSubscription();

    // Typing indicator broadcast channel
    const broadcastUniqueId = Math.random().toString(36).substring(2, 10);
    const broadcastChannel = supabase.channel(
      `typing:${bookingId}-${broadcastUniqueId}`,
      {
        config: { broadcast: { self: false } },
      }
    );

    broadcastChannel
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (isMounted && payload.payload.userId !== currentUserId) {
          setIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            if (isMounted) setIsTyping(false);
          }, 3000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload: any) => {
        if (isMounted && payload.payload.userId !== currentUserId) {
          setIsTyping(false);
        }
      })
      .subscribe();

    broadcastChannelRef.current = broadcastChannel;

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      if (broadcastChannelRef.current)
        supabase.removeChannel(broadcastChannelRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    setMessagesLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (error) {
      setFetchError("Failed to load messages.");
    } else if (data) {
      setMessages(data as Message[]);
    }
    setMessagesLoading(false);
  };

  // Typing indicator broadcast
  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: "broadcast",
        event: value ? "typing" : "stop_typing",
        payload: { userId: currentUserId },
      });
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${bookingId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);

      const attachmentType = file.type.startsWith("image/") ? "image" : "file";

      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: currentUserId,
        text: file.name,
        attachment_url: publicUrl,
        attachment_type: attachmentType,
      });

      if (error) console.error("Failed to send attachment:", error);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("messages").insert({
      booking_id: bookingId,
      sender_id: currentUserId,
      text: newMessage,
    });

    if (!error) {
      setNewMessage("");
      // Broadcast stop typing
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "stop_typing",
          payload: { userId: currentUserId },
        });
      }
    }
  };

  const getReadStatus = (msg: Message) => {
    if (msg.sender_id !== currentUserId) return null;
    if (msg.read_at) {
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    }
    return <Check className="w-3 h-3 text-gray-300" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col h-[600px] max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sewakhoj-red/10 text-sewakhoj-red rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{otherUserName}</h3>
              <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                {isTyping ? (
                  <>
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce [animation-delay:300ms]" />
                    </span>
                    <span className="text-[10px] font-medium text-green-600">
                      typing...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{" "}
                    Online
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
          {messagesLoading ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : fetchError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-3">{fetchError}</p>
              <button onClick={fetchMessages} className="text-xs font-black text-sewakhoj-red uppercase tracking-widest hover:underline">Retry</button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">
              Send a message to start the conversation...
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              const isImage =
                msg.attachment_type === "image" && msg.attachment_url;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  {isImage ? (
                    <div
                      className={`max-w-[80%] rounded-2xl overflow-hidden shadow-sm ${
                        isMe ? "rounded-br-sm" : "rounded-bl-sm border border-gray-100"
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
                              ? "bg-sewakhoj-red text-white"
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
                          ? "bg-sewakhoj-red text-white rounded-br-sm shadow-sm"
                          : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      <FileText className="w-5 h-5 shrink-0" />
                      <span className="truncate">{msg.text}</span>
                    </a>
                  ) : (
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? "bg-sewakhoj-red text-white rounded-br-sm shadow-sm"
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
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="p-4 bg-white border-t border-gray-100 flex gap-2 items-center"
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
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-sewakhoj-red focus:ring-1 focus:ring-sewakhoj-red rounded-xl px-4 py-3 text-sm transition-colors"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-sewakhoj-red text-white w-12 h-12 flex items-center justify-center rounded-xl hover:bg-sewakhoj-red-light transition-colors disabled:opacity-50 disabled:hover:bg-sewakhoj-red"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
