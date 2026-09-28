import React, { useState, useEffect, useRef } from 'react';
import { GitBranchIcon, TagIcon, SearchIcon, ChevronDownIcon, CheckIcon, StarIcon } from './Icons';

export default function BranchDropdown({
  branches = [],
  tags = [],
  selectedRef = '',
  defaultBranch = 'master',
  onSelect,
  loading = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'branches' | 'tags'
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isCurrentTag = tags.some((t) => t.name === selectedRef);
  const isCurrentDefault = selectedRef === defaultBranch;

  const q = search.toLowerCase().trim();

  const filteredBranches = branches.filter((b) => !q || b.name.toLowerCase().includes(q));
  const filteredTags = tags.filter((t) => !q || t.name.toLowerCase().includes(q));

  const showBranches = filterType === 'all' || filterType === 'branches';
  const showTags = filterType === 'all' || filterType === 'tags';

  const handleItemClick = (refName) => {
    onSelect(refName);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <span className="dropdown-icon-wrap">
          {isCurrentTag ? <TagIcon size={14} className="icon-tag" /> : <GitBranchIcon size={14} className="icon-branch" />}
        </span>
        <span className="dropdown-selected-label">{selectedRef || defaultBranch}</span>
        {isCurrentDefault && <span className="dropdown-pill default-pill">default</span>}
        {isCurrentTag && <span className="dropdown-pill tag-pill-sm">tag</span>}
        <ChevronDownIcon size={13} className={`dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-dropdown-panel">
          {/* Search Header */}
          <div className="dropdown-search-box">
            <SearchIcon size={13} className="search-box-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="dropdown-search-input"
              placeholder="Filter branches & tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="search-clear-btn" onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="dropdown-filter-pills">
            <button
              type="button"
              className={`dropdown-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`dropdown-filter-btn ${filterType === 'branches' ? 'active' : ''}`}
              onClick={() => setFilterType('branches')}
            >
              Branches ({branches.length})
            </button>
            {tags.length > 0 && (
              <button
                type="button"
                className={`dropdown-filter-btn ${filterType === 'tags' ? 'active' : ''}`}
                onClick={() => setFilterType('tags')}
              >
                Tags ({tags.length})
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="dropdown-items-scroll">
            {/* Branches Section */}
            {showBranches && filteredBranches.length > 0 && (
              <div className="dropdown-section">
                <div className="dropdown-section-title">
                  <GitBranchIcon size={12} /> Branches
                </div>
                {filteredBranches.map((b) => {
                  const isSelected = selectedRef === b.name;
                  return (
                    <div
                      key={b.name}
                      className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleItemClick(b.name)}
                    >
                      <div className="dropdown-item-left">
                        <GitBranchIcon size={13} className="item-icon branch" />
                        <span className="dropdown-item-name">{b.name}</span>
                        {b.default && <span className="dropdown-item-badge">default</span>}
                      </div>
                      {isSelected && <CheckIcon size={14} className="dropdown-item-check" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tags Section */}
            {showTags && filteredTags.length > 0 && (
              <div className="dropdown-section">
                <div className="dropdown-section-title">
                  <TagIcon size={12} /> Tags &amp; Releases
                </div>
                {filteredTags.map((t) => {
                  const isSelected = selectedRef === t.name;
                  return (
                    <div
                      key={t.name}
                      className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleItemClick(t.name)}
                    >
                      <div className="dropdown-item-left">
                        <TagIcon size={13} className="item-icon tag" />
                        <span className="dropdown-item-name">{t.name}</span>
                      </div>
                      {isSelected && <CheckIcon size={14} className="dropdown-item-check" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty Search Result */}
            {((showBranches && filteredBranches.length === 0) || !showBranches) &&
              ((showTags && filteredTags.length === 0) || !showTags) && (
                <div className="dropdown-no-results">No branch or tag matching &ldquo;{search}&rdquo;</div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
