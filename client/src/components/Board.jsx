import React from 'react';
import ProjectCard from './ProjectCard';

export default function Board({ results, gitlabUrl }) {
  return (
    <section className="board">
      {results.map((r, i) => (
        <ProjectCard key={`${r.key}-${i}`} result={r} gitlabUrl={gitlabUrl} />
      ))}
    </section>
  );
}