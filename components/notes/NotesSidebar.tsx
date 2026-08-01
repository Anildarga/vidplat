'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDuration } from '@/lib/utils';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import RichTextEditor from './RichTextEditor';

interface Note {
  id: string;
  content: string;
  timestamp: number;
  createdAt: string;
  updatedAt: string;
}

interface NotesSidebarProps {
  videoId: string;
  currentTime: number;
  onAddNote?: (timestamp: number, content: string) => void;
  onEditNote?: (noteId: string, content: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 3,
  },
  noteCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  noteContainer: {
    marginBottom: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 5,
    backgroundColor: '#f9fafb',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  date: {
    fontSize: 10,
    color: '#6b7280',
  },
  content: {
    fontSize: 12,
    color: '#111827',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
});

// PDF Document Component
const NotesPDFDocument = ({ notes, video, courseTitle, exportDate }: any) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.title}>Video Notes Export</Text>
        <Text style={pdfStyles.subtitle}>Course: {courseTitle}</Text>
        <Text style={pdfStyles.subtitle}>Video: {video.title}</Text>
        <Text style={pdfStyles.subtitle}>Duration: {formatDuration(video.duration)}</Text>
        <Text style={pdfStyles.noteCount}>Total Notes: {notes.length}</Text>
      </View>

      {notes.map((note: any, index: number) => (
        <View key={note.id} style={pdfStyles.noteContainer}>
          <View style={pdfStyles.noteHeader}>
            <Text style={pdfStyles.timestamp}>
              {formatDuration(note.timestamp)}
            </Text>
            <Text style={pdfStyles.date}>
              {new Date(note.updatedAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={pdfStyles.content}>{note.content}</Text>
        </View>
      ))}

      <View style={pdfStyles.footer}>
        <Text>Exported on {new Date(exportDate).toLocaleString()}</Text>
        <Text>EduPlat - Video Learning Platform</Text>
      </View>
    </Page>
  </Document>
);

export default function NotesSidebar({
  videoId,
  currentTime,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: NotesSidebarProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<any>(null);


  // Fetch notes for the current video
  useEffect(() => {
    if (!videoId) return;

    const fetchNotes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/notes?videoId=${videoId}`);
        const data = await response.json();
        
        if (data.success) {
          setNotes(data.data);
        }
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [videoId]);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          content: newNoteContent,
          timestamp: Math.floor(currentTime),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setNotes([...notes, data.data]);
        setNewNoteContent('');
        if (onAddNote) {
          onAddNote(Math.floor(currentTime), newNoteContent);
        }
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setNotes(notes.map(note => 
          note.id === noteId ? { ...note, content: editContent, updatedAt: data.data.updatedAt } : note
        ));
        setEditingNoteId(null);
        setEditContent('');
        if (onEditNote) {
          onEditNote(noteId, editContent);
        }
      }
    } catch (error) {
      console.error('Error editing note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setNotes(notes.filter(note => note.id !== noteId));
        if (onDeleteNote) {
          onDeleteNote(noteId);
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const response = await fetch(`/api/notes/export?videoId=${videoId}`);
      const data = await response.json();
      
      if (data.success) {
        setExportData(data.data);
        // The PDFDownloadLink will handle the actual download
      } else {
        alert('Failed to export notes: ' + data.error);
      }
    } catch (error) {
      console.error('Error exporting notes:', error);
      alert('Failed to export notes');
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
    }
  };

  const handleJumpToTimestamp = (timestamp: number) => {
    // This would be handled by the parent component
    // For now, we'll just log it
    console.log('Jump to timestamp:', timestamp);
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Video Notes</h2>
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Export
            </button>
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {exportData ? (
                  <PDFDownloadLink
                    document={
                      <NotesPDFDocument
                        notes={exportData.notes}
                        video={exportData.video}
                        courseTitle={exportData.video.courseTitle}
                        exportDate={exportData.exportDate}
                      />
                    }
                    fileName={`notes-${videoId}.pdf`}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {({ loading }) => (
                      loading ? 'Preparing PDF...' : 'Download PDF'
                    )}
                  </PDFDownloadLink>
                ) : (
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isExporting ? 'Exporting...' : 'Export as PDF'}
                  </button>
                )}
                <button
                  onClick={() => {
                    // Export as text
                    const textContent = notes.map(note =>
                      `[${formatDuration(note.timestamp)}] ${note.content}`
                    ).join('\n\n');
                    const blob = new Blob([textContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `notes-${videoId}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setShowExportOptions(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export as Text
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Add timestamped notes while watching
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p>No notes yet. Add your first note below!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-colors shadow-sm">
                {editingNoteId === note.id ? (
                  <div>
                    <RichTextEditor
                      value={editContent}
                      onChange={setEditContent}
                      rows={3}
                      className="mb-3"
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditNote(note.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <button
                        onClick={() => handleJumpToTimestamp(note.timestamp)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {formatDuration(note.timestamp)}
                      </button>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(note)}
                          className="text-sm text-gray-500 hover:text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-sm text-gray-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div
                      className="text-gray-800 whitespace-pre-wrap note-content prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: note.content || '' }}
                    ></div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(note.updatedAt).toLocaleString()}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="mb-2 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Current time: <span className="font-mono">{formatDuration(Math.floor(currentTime))}</span>
          </span>
          <button
            onClick={() => {
              setNewNoteContent(prev => prev + ` [${formatDuration(Math.floor(currentTime))}] `);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Insert timestamp
          </button>
        </div>
        <RichTextEditor
          value={newNoteContent}
          onChange={setNewNoteContent}
          placeholder="Add a note at the current timestamp..."
          rows={3}
          className="mb-3"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            Use toolbar for formatting • Press Ctrl+Enter to save
          </span>
          <button
            onClick={handleAddNote}
            disabled={!newNoteContent.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}