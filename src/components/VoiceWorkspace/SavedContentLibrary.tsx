import React, { useState } from 'react';
import { GeneratedContent, ContentStatus } from '../../types/workspace';

interface SavedContentLibraryProps {
  savedItems: GeneratedContent[];
  onSelectContent: (item: GeneratedContent) => void;
  onDeleteItem: (id: string) => void;
  onUpdateStatus: (id: string, status: ContentStatus) => void;
}

export const SavedContentLibrary: React.FC<SavedContentLibraryProps> = ({
  savedItems,
  onSelectContent,
  onDeleteItem,
  onUpdateStatus,
}) => {
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredItems = savedItems.filter((item) => {
    const matchFormat = filterFormat === 'all' || item.format === filterFormat;
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchFormat && matchStatus;
  });

  return (
    <div className="saved-library-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            <i className="fa-solid fa-bookmark"></i> Content Library & Pipeline
          </h2>
          <p className="panel-subtitle">
            Manage your saved video blueprints, script drafts, and published content.
          </p>
        </div>

        {/* Filter controls */}
        <div className="library-filters">
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Formats</option>
            <option value="shorts">YouTube Shorts</option>
            <option value="reels">Instagram Reels</option>
            <option value="linkedin">LinkedIn Posts</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scripted">Scripted</option>
            <option value="ready-to-film">Ready to Film</option>
            <option value="posted">Posted</option>
          </select>
        </div>
      </div>

      {savedItems.length === 0 ? (
        <div className="empty-library-state">
          <div className="empty-icon">
            <i className="fa-solid fa-folder-open"></i>
          </div>
          <h3>No saved content yet</h3>
          <p>
            Generate a content blueprint using voice commands or the trend explorer, then click "Save Content" to organize your scripts here.
          </p>
        </div>
      ) : (
        <div className="saved-grid">
          {filteredItems.map((item) => (
            <div key={item.id} className="saved-item-card">
              <div className="saved-card-top">
                <span className="saved-format-tag">
                  {item.format === 'shorts' && <i className="fa-brands fa-youtube"></i>}
                  {item.format === 'reels' && <i className="fa-brands fa-instagram"></i>}
                  {item.format === 'linkedin' && <i className="fa-brands fa-linkedin"></i>}
                  <span>{item.format.toUpperCase()}</span>
                </span>
                <span className="saved-date">{item.createdAt}</span>
              </div>

              <h4 className="saved-title">{item.topicTitle}</h4>
              <p className="saved-preview-hook">
                "{item.hooks.curiosity || item.hooks.contrarian}"
              </p>

              {/* Status Selector */}
              <div className="status-selector-row">
                <label className="status-label">Status:</label>
                <select
                  value={item.status}
                  onChange={(e) => onUpdateStatus(item.id, e.target.value as ContentStatus)}
                  className={`status-dropdown status-${item.status}`}
                >
                  <option value="draft">Draft</option>
                  <option value="scripted">Scripted</option>
                  <option value="ready-to-film">Ready to Film</option>
                  <option value="posted">Posted</option>
                </select>
              </div>

              {/* Card actions */}
              <div className="saved-card-actions">
                <button
                  type="button"
                  className="open-in-studio-btn"
                  onClick={() => onSelectContent(item)}
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                  <span>Open in Studio</span>
                </button>
                <button
                  type="button"
                  className="delete-item-btn"
                  onClick={() => onDeleteItem(item.id)}
                  title="Delete from library"
                >
                  <i className="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
