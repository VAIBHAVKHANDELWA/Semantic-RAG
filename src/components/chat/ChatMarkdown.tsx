import React from 'react';

interface ChatMarkdownProps {
  content: string;
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content }) => {
  if (!content) return null;

  // Split into blocks by double newlines or table boundaries
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length > 0 || tableHeader.length > 0) {
      elements.push(
        <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/60 shadow-inner">
          <table className="w-full text-xs text-left text-slate-300">
            {tableHeader.length > 0 && (
              <thead className="bg-slate-800/80 text-cyan-300 font-semibold border-b border-slate-700">
                <tr>
                  {tableHeader.map((h, i) => (
                    <th key={i} className="px-3 py-2 whitespace-nowrap">
                      {renderInlineText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-800">
              {tableRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/80'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-200">
                      {renderInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
    }
    inTable = false;
  };

  const renderInlineText = (text: string): React.ReactNode => {
    // Matches **bold**, `code`, *italic*
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line is a table line
    if (line.includes('|') && !line.startsWith('###')) {
      // Check if it is a separator line (e.g. |---|---| or ---)
      if (line.match(/^[\s|\-:]+$/)) {
        continue;
      }

      const cols = line.split('|').map(c => c.trim()).filter((c, idx, arr) => {
        // filter outer empties from leading/trailing pipe
        if ((idx === 0 || idx === arr.length - 1) && c === '') return false;
        return true;
      });

      if (!inTable) {
        inTable = true;
        tableHeader = cols;
      } else {
        tableRows.push(cols);
      }
      continue;
    } else if (inTable) {
      flushTable(`table-${i}`);
    }

    if (!line) {
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-emerald-400 mt-2 mb-1 flex items-center space-x-1.5">
          <span>{renderInlineText(line.slice(4))}</span>
        </h4>
      );
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-cyan-300 mt-2.5 mb-1.5">
          {renderInlineText(line.slice(3))}
        </h3>
      );
      continue;
    }

    // Bullet points
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      const bulletText = line.replace(/^[•\-\*]\s*/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start space-x-2 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
          <div className="text-xs text-slate-200 leading-relaxed flex-1">
            {renderInlineText(bulletText)}
          </div>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-slate-200 leading-relaxed my-1">
        {renderInlineText(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable('table-final');
  }

  return <div className="space-y-0.5">{elements}</div>;
};
