import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getPhaseBlocksByProjectId } from '../../data/mockData';
import { PHASE_META, DEV_PHASES } from '../../types';
import type { PhaseBlock } from '../../types';
import {
  Search, Plus, GripVertical
} from 'lucide-react';
import {
  format, parseISO, differenceInDays, addDays,
  eachWeekOfInterval, eachMonthOfInterval
} from 'date-fns';
import PhaseDetailModal from './PhaseDetailModal';
import CreatePhaseModal from '../Modals/CreatePhaseModal';

const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 52;

export default function PipelineTimeline() {
  const {
    orgProjects, phaseBlocks, searchQuery, phaseFilter, statusFilter, zoomLevel,
    setSearchQuery, setPhaseFilter, setZoomLevel, openPhaseDetail, openCreatePhase,
    updatePhaseBlock,
  } = useApp();

  const boardRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStartX = useRef(0);
  const panScrollLeft = useRef(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [hoverPhase, setHoverPhase] = useState<string | null>(null);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return orgProjects.filter(p => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orgProjects, searchQuery, statusFilter]);

  // Determine timeline range
  const allPbs = phaseBlocks;
  const minDate = useMemo(() => {
    if (allPbs.length === 0) return addDays(today, -30);
    const dates = allPbs.map(pb => parseISO(pb.startDate));
    return addDays(new Date(Math.min(...dates.map(d => d.getTime()))), -14);
  }, [allPbs]);

  const maxDate = useMemo(() => {
    if (allPbs.length === 0) return addDays(today, 60);
    const dates = allPbs.map(pb => parseISO(pb.endDate));
    return addDays(new Date(Math.max(...dates.map(d => d.getTime()))), 30);
  }, [allPbs]);

  const today = new Date();

  // Generate timeline columns based on zoom
  const { columns, colWidth, totalWidth } = useMemo(() => {
    let cols: Date[] = [];
    let width = 0;
    if (zoomLevel === 'week') {
      cols = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
      width = 80;
    } else if (zoomLevel === 'month') {
      cols = eachMonthOfInterval({ start: minDate, end: maxDate });
      width = 120;
    } else {
      // year - one column per quarter roughly
      const years: Date[] = [];
      let d = new Date(minDate);
      d.setMonth(0, 1);
      while (d <= maxDate) {
        years.push(new Date(d));
        d.setFullYear(d.getFullYear() + 1);
      }
      cols = years;
      width = 200;
    }
    return { columns: cols, colWidth: width, totalWidth: cols.length * width };
  }, [minDate, maxDate, zoomLevel]);

  // Position helpers
  const getDatePos = useCallback((date: Date) => {
    if (columns.length === 0) return 0;
    if (zoomLevel === 'week') {
      return (differenceInDays(date, columns[0]) / 7) * colWidth;
    } else if (zoomLevel === 'month') {
      const months = (date.getFullYear() - columns[0].getFullYear()) * 12 + (date.getMonth() - columns[0].getMonth());
      return months * colWidth;
    } else {
      return (date.getFullYear() - columns[0].getFullYear()) * colWidth;
    }
  }, [columns, colWidth, zoomLevel]);

  const getPosDate = useCallback((px: number) => {
    const ratio = px / colWidth;
    if (zoomLevel === 'week') {
      return addDays(columns[0], Math.round(ratio * 7));
    } else if (zoomLevel === 'month') {
      return new Date(columns[0].getFullYear(), columns[0].getMonth() + Math.round(ratio), 1);
    } else {
      return new Date(columns[0].getFullYear() + Math.round(ratio), 0, 1);
    }
  }, [columns, colWidth, zoomLevel]);

  const todayPos = getDatePos(today);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.phase-block') || (e.target as HTMLElement).closest('.resize-handle')) return;
    isPanning.current = true;
    panStartX.current = e.clientX;
    panScrollLeft.current = boardRef.current?.scrollLeft || 0;
    (e.target as HTMLElement).style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !boardRef.current) return;
    boardRef.current.scrollLeft = panScrollLeft.current - (e.clientX - panStartX.current);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    isPanning.current = false;
    (e.target as HTMLElement).style.cursor = '';
  }, []);

  // Drag phase block
  const handleDragEnd = useCallback((pb: PhaseBlock, info: any) => {
    const deltaX = info.offset.x;
    const newStartPx = getDatePos(parseISO(pb.startDate)) + deltaX;
    const newStart = getPosDate(newStartPx);
    const duration = differenceInDays(parseISO(pb.endDate), parseISO(pb.startDate));
    const newEnd = addDays(newStart, duration);
    updatePhaseBlock(pb.id, {
      startDate: format(newStart, 'yyyy-MM-dd'),
      endDate: format(newEnd, 'yyyy-MM-dd'),
    });
    setDraggingId(null);
  }, [getDatePos, getPosDate, updatePhaseBlock]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, pb: PhaseBlock, edge: 'left' | 'right') => {
    e.stopPropagation();
    setResizingId(pb.id);
    const startX = e.clientX;
    const startDate = parseISO(pb.startDate);
    const endDate = parseISO(pb.endDate);
    const startPx = getDatePos(startDate);
    const endPx = getDatePos(endDate);

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      if (edge === 'left') {
        const newPx = Math.max(0, startPx + delta);
        const newDate = getPosDate(newPx);
        updatePhaseBlock(pb.id, { startDate: format(newDate, 'yyyy-MM-dd') });
      } else {
        const newPx = Math.max(startPx + colWidth * 0.5, endPx + delta);
        const newDate = getPosDate(newPx);
        updatePhaseBlock(pb.id, { endDate: format(newDate, 'yyyy-MM-dd') });
      }
    };

    const handleUp = () => {
      setResizingId(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [getDatePos, getPosDate, colWidth, updatePhaseBlock]);

  // Scroll to today on mount
  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.scrollLeft = todayPos - boardRef.current.clientWidth / 3;
    }
  }, [zoomLevel]);

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-900">Development Pipeline</h1>
            <span className="text-xs text-gray-400">{filteredProjects.length} projects · {phaseBlocks.length} phases</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text" placeholder="Search projects..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm 
                           focus:outline-none focus:ring-2 focus:ring-slate-500 w-44"
              />
            </div>
            {/* Zoom */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {(['week', 'month', 'year'] as const).map(z => (
                <button key={z} onClick={() => setZoomLevel(z)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors
                    ${zoomLevel === z ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {z === 'week' ? 'Tuần' : z === 'month' ? 'Tháng' : 'Năm'}
                </button>
              ))}
            </div>
            <button onClick={() => openCreatePhase()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium 
                         rounded-lg hover:bg-slate-800 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tạo Phase
            </button>
          </div>
        </div>
      </div>

      {/* Main board */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left - Project List */}
        <div className="w-56 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto z-20">
          <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">
            Projects
          </div>
          {filteredProjects.map(project => {
            const pbCount = phaseBlocks.filter(pb => pb.projectId === project.id).length;
            return (
              <div key={project.id}
                className="px-4 py-3 border-b border-gray-100 hover:bg-white transition-colors"
                style={{ height: ROW_HEIGHT }}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    project.status === 'On Track' ? 'bg-emerald-400' :
                    project.status === 'At Risk' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm font-medium text-slate-900 truncate">{project.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">{pbCount} phases</span>
                  <span className="text-[10px] text-gray-300">|</span>
                  <span className="text-[10px] text-gray-400">{project.progress}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right - Timeline */}
        <div
          ref={boardRef}
          className="flex-1 overflow-auto relative select-none"
          style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="relative" style={{ width: totalWidth + 200, minHeight: '100%' }}>
            {/* Column headers */}
            <div className="sticky top-0 z-10 flex bg-gray-50 border-b border-gray-200" style={{ height: HEADER_HEIGHT }}>
              {columns.map((col, i) => (
                <div key={i}
                  className="flex-shrink-0 border-r border-gray-200 px-2 flex items-center justify-center text-xs font-medium text-gray-500"
                  style={{ width: colWidth }}>
                  {zoomLevel === 'week' && (
                    <span>{format(col, 'dd/MM')} - {format(addDays(col, 6), 'dd/MM')}</span>
                  )}
                  {zoomLevel === 'month' && format(col, 'MM/yyyy')}
                  {zoomLevel === 'year' && format(col, 'yyyy')}
                </div>
              ))}
            </div>

            {/* Grid lines */}
            {columns.map((_, i) => (
              <div key={`grid-${i}`}
                className="absolute top-0 bottom-0 border-r border-gray-100"
                style={{ left: i * colWidth, width: colWidth }} />
            ))}

            {/* Today marker - behind blocks */}
            <div className="absolute top-0 bottom-0 z-0 pointer-events-none" style={{ left: todayPos }}>
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold 
                              px-1 py-0.5 rounded-b whitespace-nowrap">
                TODAY
              </div>
              <div className="w-px h-full bg-red-400/60" />
            </div>

            {/* Project rows with phase blocks */}
            {filteredProjects.map((project) => {
              const pbs = getPhaseBlocksByProjectId(project.id);
              const filteredPbs = phaseFilter === 'All' ? pbs : pbs.filter(pb => pb.phaseType === phaseFilter);

              return (
                <div key={project.id}
                  className="relative border-b border-gray-100"
                  style={{ height: ROW_HEIGHT, top: 0 }}>
                  {filteredPbs.map(pb => {
                    const meta = PHASE_META[pb.phaseType];
                    const left = getDatePos(parseISO(pb.startDate));
                    const right = getDatePos(parseISO(pb.endDate));
                    const width = Math.max(24, right - left);
                    const isHover = hoverPhase === pb.id;
                    const isDrag = draggingId === pb.id;

                    return (
                      <motion.div
                        key={pb.id}
                        className={`phase-block absolute top-1.5 h-[calc(100%-12px)] rounded-lg border 
                                    cursor-pointer group overflow-hidden z-10
                                    ${meta.bg} ${meta.border}`}
                        style={{
                          left, width,
                          opacity: isDrag ? 0.8 : 1,
                          boxShadow: isHover ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        }}
                        drag="x"
                        dragMomentum={false}
                        dragConstraints={{ left: -left, right: totalWidth - left - width }}
                        onDragStart={() => setDraggingId(pb.id)}
                        onDragEnd={(_, info) => handleDragEnd(pb, info)}
                        onMouseEnter={() => setHoverPhase(pb.id)}
                        onMouseLeave={() => setHoverPhase(null)}
                        onClick={() => {
                          if (!draggingId && !resizingId) openPhaseDetail(pb.id);
                        }}
                        whileHover={{ scale: 1.01 }}
                      >
                        {/* Resize handles */}
                        <div className="resize-handle absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize 
                                        hover:bg-black/10 z-20"
                          onMouseDown={e => handleResizeStart(e, pb, 'left')} />
                        <div className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize 
                                        hover:bg-black/10 z-20"
                          onMouseDown={e => handleResizeStart(e, pb, 'right')} />

                        {/* Content */}
                        <div className="px-2 py-1 flex items-center gap-1.5 h-full">
                          <GripVertical className="w-3 h-3 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100" />
                          <span className={`text-[11px] font-semibold ${meta.color} truncate`}>
                            {pb.phaseType} · {pb.title}
                          </span>
                        </div>

                        {/* Tooltip */}
                        {isHover && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 
                                          bg-gray-900 text-white text-[10px] rounded-md shadow-lg whitespace-nowrap z-30">
                            <div className="font-semibold">{pb.title}</div>
                            <div className="text-gray-300">{meta.label}</div>
                            <div className="text-gray-400">
                              {format(parseISO(pb.startDate), 'dd/MM/yyyy')} - {format(parseISO(pb.endDate), 'dd/MM/yyyy')}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}

            {/* Spacer */}
            <div style={{ height: 40 }} />
          </div>
        </div>
      </div>

      {/* Phase Filter Bar at bottom */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-2 flex items-center gap-2">
        <span className="text-xs text-gray-400 mr-1">Phase filter:</span>
        <button
          onClick={() => setPhaseFilter('All')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors
            ${phaseFilter === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
          All
        </button>
        {DEV_PHASES.map(phase => {
          const meta = PHASE_META[phase];
          const count = phaseBlocks.filter(pb => pb.phaseType === phase).length;
          return (
            <button
              key={phase}
              onClick={() => setPhaseFilter(phaseFilter === phase ? 'All' : phase)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1
                ${phaseFilter === phase
                  ? `${meta.bg} ${meta.color} ${meta.border}`
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${meta.bg.replace('bg-', 'bg-').replace('50', '400')}`} />
              {phase} ({count})
            </button>
          );
        })}
      </div>

      {/* Modals */}
      <PhaseDetailModal />
      <CreatePhaseModal />
    </div>
  );
}
