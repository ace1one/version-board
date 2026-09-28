import React, { useState } from 'react';
import { FileCodeIcon, CheckIcon } from './Icons';

export default function DiffViewer({ diff, oldPath, newPath, newFile, deletedFile, renamedFile }) {
  const [copied, setCopied] = useState(false);
  const filePath = newPath || oldPath || 'Unknown file';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(filePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse lines and compute line numbers if diff is present
  let addCount = 0;
  let delCount = 0;
  let parsedLines = [];

  if (diff) {
    const lines = diff.split('\n');
    let oldLineNum = 0;
    let newLineNum = 0;

    parsedLines = lines.map((line) => {
      if (line.startsWith('@@')) {
        const match = line.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10) - 1;
          newLineNum = parseInt(match[2], 10) - 1;
        }
        return {
          type: 'hunk',
          content: line,
          oldNum: '',
          newNum: '',
        };
      } else if (line.startsWith('+')) {
        newLineNum++;
        addCount++;
        return {
          type: 'add',
          content: line.slice(1),
          prefix: '+',
          oldNum: '',
          newNum: newLineNum,
        };
      } else if (line.startsWith('-')) {
        oldLineNum++;
        delCount++;
        return {
          type: 'del',
          content: line.slice(1),
          prefix: '-',
          oldNum: oldLineNum,
          newNum: '',
        };
      } else if (line.startsWith('\\ No newline')) {
        return {
          type: 'meta',
          content: line,
          oldNum: '',
          newNum: '',
        };
      } else {
        oldLineNum++;
        newLineNum++;
        return {
          type: 'normal',
          content: line.startsWith(' ') ? line.slice(1) : line,
          prefix: ' ',
          oldNum: oldLineNum,
          newNum: newLineNum,
        };
      }
    });
  }

  return (
    <div className="diff-file-card">
      <div className="diff-file-header">
        <div className="diff-file-title">
          <FileCodeIcon size={15} style={{ color: 'var(--accent)' }} />
          {deletedFile && <span className="diff-badge deleted">DELETED</span>}
          {newFile && <span className="diff-badge added">NEW</span>}
          {renamedFile && <span className="diff-badge renamed">RENAMED</span>}
          <span className="diff-path">{filePath}</span>
        </div>

        <div className="diff-file-meta-actions">
          {diff && (
            <span className="diff-stat-summary">
              {addCount > 0 && <span className="stat-add">+{addCount}</span>}
              {delCount > 0 && <span className="stat-del">-{delCount}</span>}
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
            onClick={handleCopyPath}
            title="Copy file path"
          >
            {copied ? <><CheckIcon size={11} /> Copied</> : 'Copy Path'}
          </button>
        </div>
      </div>

      {diff ? (
        <div className="diff-table-wrap">
          <table className="diff-table">
            <tbody>
              {parsedLines.map((l, i) => (
                <tr key={i} className={`diff-line-row diff-${l.type}`}>
                  <td className="diff-num old-num">{l.oldNum}</td>
                  <td className="diff-num new-num">{l.newNum}</td>
                  <td className="diff-marker">{l.prefix || ' '}</td>
                  <td className="diff-content">
                    <pre>{l.content}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="diff-empty-notice">
          {newFile ? (
            <div className="diff-empty-msg">
              <span style={{ fontSize: '20px' }}>📄</span>
              <p>New empty or binary file created.</p>
            </div>
          ) : deletedFile ? (
            <div className="diff-empty-msg">
              <span style={{ fontSize: '20px' }}>🗑️</span>
              <p>File was deleted in this merge request.</p>
            </div>
          ) : (
            <div className="diff-empty-msg">
              <p>No textual diff changes available for this file.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
