'use client';

import { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add a note...',
  rows = 3,
  className = '',
  autoFocus = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // Handle paste to clean up formatting if needed
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Formatting functions
  const formatText = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      handleInput();
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+B for bold
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      formatText('bold');
    }
    // Ctrl+I for italic
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      formatText('italic');
    }
    // Ctrl+U for underline
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      formatText('underline');
    }
  };

  // Font size options
  const fontSizeOptions = [
    { label: 'Small', value: '1' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '5' },
    { label: 'Huge', value: '7' },
  ];

  // Font family options
  const fontFamilyOptions = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times', value: 'Times New Roman, serif' },
    { label: 'Courier', value: 'Courier New, monospace' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
  ];

  return (
    <div className={`border border-gray-300 rounded-lg bg-white ${className} ${isFocused ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        {/* Bold */}
        <button
          type="button"
          onClick={() => formatText('bold')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
          title="Bold (Ctrl+B)"
        >
          <span className="font-bold">B</span>
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => formatText('italic')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
          title="Italic (Ctrl+I)"
        >
          <span className="italic">I</span>
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => formatText('underline')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
          title="Underline (Ctrl+U)"
        >
          <span className="underline">U</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Font Size */}
        <div className="relative group">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-sm flex items-center gap-1"
            title="Font Size"
          >
            <span className="text-xs">A</span>
            <span className="text-sm">A</span>
            <span className="text-base">A</span>
          </button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[120px]">
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => formatText('fontSize', option.value)}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div className="relative group">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-sm"
            title="Font Style"
          >
            <span className="font-sans">F</span>
          </button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[140px]">
            {fontFamilyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => formatText('fontName', option.value)}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded"
                style={{ fontFamily: option.value }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Text Color */}
        <div className="relative group">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
            title="Text Color"
          >
            <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: '#000000' }}></div>
          </button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-2">
            <div className="grid grid-cols-4 gap-1">
              {['#000000', '#dc2626', '#059669', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#475569'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => formatText('foreColor', color)}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Clear Formatting */}
        <button
          type="button"
          onClick={() => formatText('removeFormat')}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-sm ml-auto"
          title="Clear Formatting"
        >
          Clear
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`p-3 min-h-[${rows * 24}px] outline-none text-gray-900 overflow-y-auto`}
        style={{ minHeight: `${rows * 24}px` }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        autoFocus={autoFocus}
      />
      
      {/* Placeholder when empty */}
      {!value && (
        <div className="absolute top-12 left-3 pointer-events-none text-gray-400">
          {placeholder}
        </div>
      )}
    </div>
  );
}