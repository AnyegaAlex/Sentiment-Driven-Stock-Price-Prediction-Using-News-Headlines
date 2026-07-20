import React from 'react';
import { SiReact, SiFastapi, SiPytorch, SiPostgresql } from 'react-icons/si';
import { FaGitAlt } from 'react-icons/fa';

const techStack = [
  { icon: SiReact, label: 'React' },
  { icon: SiFastapi, label: 'FastAPI' },
  { icon: SiPytorch, label: 'PyTorch' },
  { icon: SiPostgresql, label: 'PostgreSQL' },
  { icon: FaGitAlt, label: 'Open Source' },
];

const TrustedEngineering = () => (
  <section className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-semibold text-gray-900 dark:text-white">Built with</span>
        {techStack.map((tech) => (
          <div key={tech.label} className="flex items-center gap-2">
            <tech.icon className="h-6 w-6" />
            <span>{tech.label}</span>
          </div>
        ))}
        <span className="text-gray-400 dark:text-gray-600">•</span>
        <span className="font-mono text-xs bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full">
          MIT License
        </span>
      </div>
    </div>
  </section>
);

export default TrustedEngineering;