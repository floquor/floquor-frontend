'use client';

import React from 'react';
import { BsPlayFill, BsFileEarmarkPlus, BsArrowCounterclockwise, BsArrowClockwise } from 'react-icons/bs';
import { FaFileImport, FaFileExport } from "react-icons/fa";


interface ToolbarProps {
  onExecute: () => void;
  onNew: () => void;
  onImport: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isExecuting: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onExecute,
  onNew,
  onImport,
  onExport,
  onUndo,
  onRedo,
  isExecuting,
  canUndo,
  canRedo
}) => {
  return (
    <div className="bg-[var(--menu-background)] border-b border-[var(--menu-border)] relative z-40">
      <div className="px-4 py-2 flex items-center gap-1">
        <button
          className="p-2 hover:bg-[var(--menu-hover)] rounded text-green-500 transition-colors disabled:opacity-50"
          onClick={onExecute}
          disabled={isExecuting}
          title="Execute"
        >
          <BsPlayFill size={16} />
        </button>

        <div className="w-px h-5 bg-[var(--menu-border)] mx-2" />

        <button
          className="p-2 hover:bg-[var(--menu-hover)] rounded text-[var(--text-primary)] transition-colors disabled:opacity-50"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <BsArrowCounterclockwise size={16} />
        </button>

        <button
          className="p-2 hover:bg-[var(--menu-hover)] rounded text-[var(--text-primary)] transition-colors disabled:opacity-50"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <BsArrowClockwise size={16} />
        </button>

        <div className="w-px h-5 bg-[var(--menu-border)] mx-2" />

        <button
          className="p-2 hover:bg-[var(--menu-hover)] rounded text-[var(--text-primary)] transition-colors"
          onClick={onNew}
          title="New"
        >
          <BsFileEarmarkPlus size={16} />
        </button>

        <button
          className="p-2 hover:bg-[var(--menu-hover)] rounded text-[var(--text-primary)] transition-colors"
          onClick={onImport}
          title="Import"
        >
          <FaFileImport size={16} />
        </button>

        <button
          className="p-2 hover:bg-[var(--menu-hover)] rounded text-[var(--text-primary)] transition-colors"
          onClick={onExport}
          title="Export"
        >
          <FaFileExport size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar; 