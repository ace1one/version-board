import React from 'react';

export default function EmptyState({ onAddFirst }) {
  return (
    <section className="empty-state">
      <p>No projects configured yet.</p>
      <button className="btn btn-primary" onClick={onAddFirst}>Add your first project</button>
    </section>
  );
}