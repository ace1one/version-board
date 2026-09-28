import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, ChevronDownIcon, CheckIcon, UserIcon } from './Icons';

function UserAvatar({ user, size = 22 }) {
  const [imgError, setImgError] = useState(false);
  if (user?.avatarUrl && !imgError) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || user.username}
        className="user-picker-avatar-img"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = (user?.name || user?.username || '?').charAt(0).toUpperCase();
  return (
    <div
      className="user-picker-avatar-fallback"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, Math.floor(size * 0.45)),
        fontWeight: 600,
        background: 'rgba(79, 209, 165, 0.16)',
        color: 'var(--accent)',
        border: '1px solid rgba(79, 209, 165, 0.3)',
      }}
    >
      {initial}
    </div>
  );
}

export default function UserPicker({
  users = [],
  selectedIds = [], // Array of user IDs (or single id wrapped in array)
  multiple = false,
  onChange,
  currentUser = null,
  placeholder = 'Select user...',
  loading = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
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

  const q = search.toLowerCase().trim();
  const filteredUsers = users.filter((u) => {
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));

  const handleSelect = (user) => {
    if (multiple) {
      if (selectedIds.includes(user.id)) {
        onChange(selectedIds.filter((id) => id !== user.id));
      } else {
        onChange([...selectedIds, user.id]);
      }
    } else {
      if (selectedIds.includes(user.id)) {
        onChange([]);
      } else {
        onChange([user.id]);
      }
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleUnassign = () => {
    onChange([]);
    if (!multiple) {
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleAssignToMe = () => {
    if (!currentUser) return;
    if (multiple) {
      if (!selectedIds.includes(currentUser.id)) {
        onChange([...selectedIds, currentUser.id]);
      }
    } else {
      onChange([currentUser.id]);
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div className="user-picker-container" ref={pickerRef}>
      <button
        type="button"
        className={`user-picker-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <div className="user-picker-trigger-content">
          {!multiple ? (
            selectedUsers.length > 0 ? (
              <div className="user-picker-selected-single">
                <UserAvatar user={selectedUsers[0]} size={20} />
                <span className="user-picker-name">{selectedUsers[0].name}</span>
                <span className="user-picker-username">@{selectedUsers[0].username}</span>
              </div>
            ) : (
              <span className="user-picker-placeholder">{placeholder}</span>
            )
          ) : selectedUsers.length > 0 ? (
            <div className="user-picker-selected-multi">
              <span className="user-picker-count-badge">
                {selectedUsers.length} selected
              </span>
              <div className="user-picker-mini-avatars">
                {selectedUsers.slice(0, 3).map((u) => (
                  <UserAvatar key={u.id} user={u} size={18} />
                ))}
                {selectedUsers.length > 3 && (
                  <span className="user-picker-more-count">+{selectedUsers.length - 3}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="user-picker-placeholder">{placeholder}</span>
          )}
        </div>
        <ChevronDownIcon size={13} className={`user-picker-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-picker-panel">
          {/* Search Header */}
          <div className="user-picker-search-box">
            <SearchIcon size={13} className="search-box-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="user-picker-search-input"
              placeholder="Search by name or @username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Actions (Unassigned / Assign to me) */}
          <div className="user-picker-quick-actions">
            <button
              type="button"
              className={`user-picker-quick-btn ${selectedIds.length === 0 ? 'active' : ''}`}
              onClick={handleUnassign}
            >
              Unassign
            </button>
            {currentUser && (
              <button
                type="button"
                className={`user-picker-quick-btn ${
                  selectedIds.includes(currentUser.id) ? 'active' : ''
                }`}
                onClick={handleAssignToMe}
              >
                Assign to me
              </button>
            )}
          </div>

          {/* User List */}
          <div className="user-picker-items-scroll">
            {loading ? (
              <div className="user-picker-loading">Loading members...</div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    className={`user-picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(user)}
                  >
                    <div className="user-picker-item-left">
                      <UserAvatar user={user} size={24} />
                      <div className="user-picker-item-text">
                        <span className="user-picker-item-name">{user.name}</span>
                        <span className="user-picker-item-username">@{user.username}</span>
                      </div>
                    </div>
                    {isSelected && <CheckIcon size={14} className="user-picker-check" />}
                  </div>
                );
              })
            ) : (
              <div className="user-picker-empty">
                {users.length === 0 ? 'No members found for this project' : `No users matching "${search}"`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
