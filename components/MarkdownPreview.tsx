import React, { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  onClose: () => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, onClose }) => {
  // Simple markdown to HTML converter for Skillable-specific syntax
  const renderMarkdown = (markdown: string): string => {
    let html = markdown;

    // Convert Skillable-specific blocks first
    // ShowGuided blocks
    html = html.replace(/:::ShowGuided\(ShowGuided=Yes\)([\s\S]*?):::/g, (match, content) => {
      return `<div class="guided-block">${content}</div>`;
    });

    // ShowAdvanced blocks
    html = html.replace(/:::ShowAdvanced\(ShowAdvanced=Yes\)([\s\S]*?):::/g, (match, content) => {
      return `<div class="advanced-block">${content}</div>`;
    });

    // ShowActivity blocks
    html = html.replace(/:::ShowActivity\(ShowActivity=Yes\)([\s\S]*?):::/g, (match, content) => {
      return `<div class="activity-block">${content}</div>`;
    });

    // Convert blockquote-style content (lines starting with >)
    html = html.replace(/^>(.+)$/gm, '<blockquote>$1</blockquote>');

    // Convert [!note], [!help], [+alert] blocks
    html = html.replace(/>\[!note\]\s*(.+)/g, '<div class="note-block">📝 Note: $1</div>');
    html = html.replace(/>\[!help\]\s*(.+)/g, '<div class="help-block">💡 Help: $1</div>');
    html = html.replace(/>\[\+alert\]\s*(.+)/g, '<div class="alert-block">⚠️ Alert: $1</div>');
    html = html.replace(/>\[!knowledge\]\s*(.+)/g, '<div class="knowledge-block">📚 Knowledge: $1</div>');
    html = html.replace(/>\[\+hint\]\s*(.+)/g, '<div class="hint-block">💭 Hint: $1</div>');

    // Convert challenge-title and overview tags
    html = html.replace(/>\[challenge-title\]:\s*(.+)/g, '<h1 class="challenge-title">$1</h1>');
    html = html.replace(/>\[overview\]:\s*(.+)/g, '<div class="overview">$1</div>');
    html = html.replace(/>\[recap\]:/g, '<div class="recap"><h3>Recap</h3>');
    html = html.replace(/>\[next-steps\]:/g, '<div class="next-steps"><h3>Next Steps</h3>');

    // Convert headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Convert bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Convert code blocks (backticks)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert +++ syntax (input text)
    html = html.replace(/\+\+\+(.+?)\+\+\+/g, '<span class="input-text">$1</span>');

    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\s*"([^"]+)"\)/g, '<a href="$2" title="$3">$1</a>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Convert list items
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convert line breaks
    html = html.replace(/\n\n/g, '<br/><br/>');
    html = html.replace(/\n/g, '<br/>');

    return html;
  };

  const htmlContent = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Markdown Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            &times;
          </button>
        </div>

        <div
          className="markdown-preview prose max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        <style>{`
          .markdown-preview {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
          }

          .markdown-preview h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 1em 0 0.5em 0;
            color: #1a1a1a;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0.3em;
          }

          .markdown-preview h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 1em 0 0.5em 0;
            color: #1a1a1a;
          }

          .markdown-preview h3 {
            font-size: 1.25em;
            font-weight: bold;
            margin: 0.8em 0 0.4em 0;
            color: #1a1a1a;
          }

          .markdown-preview .challenge-title {
            color: #059669;
            border-bottom: 3px solid #059669;
          }

          .markdown-preview .overview {
            background-color: #f0f9ff;
            border-left: 4px solid #0284c7;
            padding: 1em;
            margin: 1em 0;
            border-radius: 4px;
          }

          .markdown-preview blockquote {
            border-left: 4px solid #d1d5db;
            padding-left: 1em;
            margin: 0.5em 0;
            color: #6b7280;
          }

          .markdown-preview .guided-block {
            background-color: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 1em;
            margin: 1em 0;
          }

          .markdown-preview .advanced-block {
            background-color: #e0e7ff;
            border: 1px solid #6366f1;
            border-radius: 8px;
            padding: 1em;
            margin: 1em 0;
          }

          .markdown-preview .activity-block {
            background-color: #ecfccb;
            border: 1px solid #84cc16;
            border-radius: 8px;
            padding: 1em;
            margin: 1em 0;
          }

          .markdown-preview .note-block {
            background-color: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 0.8em;
            margin: 0.8em 0;
            border-radius: 4px;
          }

          .markdown-preview .help-block {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 0.8em;
            margin: 0.8em 0;
            border-radius: 4px;
          }

          .markdown-preview .alert-block {
            background-color: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 0.8em;
            margin: 0.8em 0;
            border-radius: 4px;
          }

          .markdown-preview .knowledge-block {
            background-color: #f3e8ff;
            border-left: 4px solid #a855f7;
            padding: 0.8em;
            margin: 0.8em 0;
            border-radius: 4px;
          }

          .markdown-preview .hint-block {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 0.8em;
            margin: 0.8em 0;
            border-radius: 4px;
          }

          .markdown-preview ul {
            margin: 0.5em 0;
            padding-left: 2em;
          }

          .markdown-preview li {
            margin: 0.3em 0;
          }

          .markdown-preview strong {
            font-weight: 600;
            color: #1f2937;
          }

          .markdown-preview em {
            font-style: italic;
            color: #4b5563;
          }

          .markdown-preview code {
            background-color: #f3f4f6;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #be185d;
          }

          .markdown-preview .input-text {
            background-color: #fef3c7;
            padding: 0.2em 0.5em;
            border-radius: 3px;
            font-family: monospace;
            font-weight: 500;
            color: #92400e;
            border: 1px solid #fbbf24;
          }

          .markdown-preview a {
            color: #2563eb;
            text-decoration: underline;
          }

          .markdown-preview a:hover {
            color: #1d4ed8;
          }

          .markdown-preview .recap,
          .markdown-preview .next-steps {
            background-color: #f0fdf4;
            border: 1px solid #22c55e;
            border-radius: 8px;
            padding: 1em;
            margin: 1em 0;
          }
        `}</style>
      </div>
    </div>
  );
};
