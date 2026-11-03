'use client';

import React, { useState, memo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Plus,
  Calendar,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  Clock,
} from 'lucide-react';
import type { RoomNote } from '../types';

interface RoomNotesModalProps {
  roomId: string | null;
  onClose: () => void;
}

// Sub-component: Isolated Add Note Form so typing does not re-render the notes list
const AddNoteForm: React.FC<{
  onAdd: (text: string) => void;
  onCancel: () => void;
}> = ({ onAdd, onCancel }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">كتابة ملاحظة جديدة:</span>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>تُحفظ تلقائياً مع تاريخ ووقت اليوم</span>
        </span>
      </div>
      <textarea
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اكتب تفاصيل الملاحظة هنا (مواصفات، تنبيهات فنية، صيانة مرتقبة)..."
        className="w-full p-3.5 rounded-2xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm text-slate-800 bg-white"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm"
        >
          حفظ الملاحظة
        </button>
      </div>
    </form>
  );
};

// Sub-component: Individual Memoized Note Card
const NoteCard = memo<{
  note: RoomNote;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
}>(({ note, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);

  const handleSave = () => {
    if (!editText.trim()) return;
    onUpdate(note.id, editText.trim());
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-50 hover:bg-amber-50/40 rounded-2xl p-4 border border-slate-200/80 transition-colors space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/60 font-semibold text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span>{note.date}</span>
        </span>

        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                title="حفظ"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditText(note.text);
                  setIsEditing(false);
                }}
                className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"
                title="إلغاء"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-white rounded-lg transition-colors"
                title="تعديل الملاحظة"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                title="حذف الملاحظة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          rows={2}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-amber-400 text-xs text-slate-800 bg-white outline-none"
        />
      ) : (
        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {note.text}
        </p>
      )}
    </div>
  );
});

NoteCard.displayName = 'NoteCard';

export const RoomNotesModal: React.FC<RoomNotesModalProps> = ({ roomId, onClose }) => {
  const { rooms, addRoomNote, deleteRoomNote, updateRoomNote } = useApp();
  const [isAdding, setIsAdding] = useState(false);

  if (!roomId) return null;

  const room = rooms.find((r) => r.id === roomId);
  if (!room) return null;

  const notes = room.roomNotes || [];

  const handleAddSubmit = useCallback((text: string) => {
    addRoomNote(room.id, text);
    setIsAdding(false);
  }, [addRoomNote, room.id]);

  const handleDelete = useCallback((noteId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
      deleteRoomNote(room.id, noteId);
    }
  }, [deleteRoomNote, room.id]);

  const handleUpdate = useCallback((noteId: string, text: string) => {
    updateRoomNote(room.id, noteId, text);
  }, [updateRoomNote, room.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 no-print">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">سجل ملاحظات القاعة</h2>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  {notes.length} ملاحظة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {room.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button & New Note Form */}
        <div className="p-6 border-b border-slate-100 bg-white">
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>إضافة ملاحظة جديدة</span>
            </button>
          ) : (
            <AddNoteForm
              onAdd={handleAddSubmit}
              onCancel={() => setIsAdding(false)}
            />
          )}
        </div>

        {/* Notes List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {notes.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">لا توجد ملاحظات مسجلة لهذه القاعة حتى الآن</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                يمكنك الضغط على زر "إضافة ملاحظة جديدة" بالأعلى لتسجيل ومتابعة أي ملاحظات أو تنبيهات مع تواريخها.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
