"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { MessageSquare, Trash2, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-messages";

interface AdminNote {
  id: string;
  note: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  targetUserId: string;
  currentAdminId: string;
}

export default function AdminNotes({ targetUserId, currentAdminId }: Props) {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    fetchNotes();
  }, [targetUserId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // Try the RPC first
      const { data, error } = await supabase
        .rpc('get_admin_notes_for_user', { p_target_user_id: targetUserId });

      if (error) {
        console.error("RPC failed, falling back to direct query:", error);
        const { data: fallback, error: fallbackErr } = await supabase
          .from("admin_notes")
          .select("*, users!admin_notes_created_by_fkey(full_name)")
          .eq("target_user_id", targetUserId)
          .order("created_at", { ascending: false });

        if (!fallbackErr && fallback) {
          setNotes(fallback.map((n: any) => ({
            id: n.id,
            note: n.note,
            created_by: n.created_by,
            created_by_name: n.users?.full_name || "Admin",
            created_at: n.created_at,
            updated_at: n.updated_at,
          })));
        }
      } else if (data) {
        setNotes(data as AdminNote[]);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("admin_notes").insert({
        target_user_id: targetUserId,
        note: newNote.trim(),
        created_by: currentAdminId,
      });

      if (error) throw error;
      setNewNote("");
      fetchNotes();
    } catch (err: any) {
      console.error("Failed to add note:", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase.from("admin_notes").delete().eq("id", noteId);
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) {
      console.error("Failed to delete note:", err);
    }
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <div className="flex gap-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a private admin note..."
          rows={2}
          className="flex-1 bg-gray-50 border-2 border-transparent rounded-xl p-3 text-sm font-medium focus:bg-white focus:border-indigo-500/20 focus:outline-none transition-all resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              addNote();
            }
          }}
        />
        <Button
          variant="brand"
          size="pill"
          onClick={addNote}
          disabled={saving || !newNote.trim()}
          className="self-end"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-gray-300" />
          </div>
          <p className="font-bold text-gray-400 text-sm">No Notes</p>
          <p className="text-xs text-gray-400 mt-1">Staff notes will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-gray-50 rounded-xl p-4 border border-gray-100 group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed flex-1">
                  {note.note}
                </p>
                {note.created_by === currentAdminId && (
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                  <UserRound className="w-3 h-3 text-indigo-500" />
                </div>
                <span className="text-[10px] font-bold text-gray-500">
                  {note.created_by_name}
                </span>
                <span className="text-[10px] text-gray-400">·</span>
                <span className="text-[10px] text-gray-400">
                  {formatDate(note.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
