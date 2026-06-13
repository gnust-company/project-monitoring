import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;        // text phụ bên phải (vd: role)
  avatar?: string;      // ảnh đại diện
  dotClass?: string;    // chấm màu (vd: trạng thái / phase)
  labelClass?: string;  // class màu cho label (vd: màu theo phase)
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  /** Render tùy biến phần hiển thị trong nút (ghi đè layout mặc định) */
  renderTrigger?: (selected: DropdownOption | undefined) => ReactNode;
}

// Dropdown tùy biến dùng chung — thay cho <select> gốc để đồng bộ bo góc/style
export default function Dropdown({
  value, options, onChange, placeholder = 'Chọn...',
  className = '', align = 'left', renderTrigger,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-white border rounded-xl text-sm transition-all
          ${open ? 'ring-2 ring-ink/15 border-ink' : 'border-stone-200 hover:border-stone-300'}`}>
        {renderTrigger ? renderTrigger(selected) : (
          <>
            {selected?.avatar && <img src={selected.avatar} className="w-5 h-5 rounded-full flex-shrink-0" alt="" />}
            {selected?.dotClass && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${selected.dotClass}`} />}
            <span className={`flex-1 text-left truncate ${selected ? (selected.labelClass ?? 'text-stone-700 font-medium') : 'text-stone-400'}`}>
              {selected?.label ?? placeholder}
            </span>
            {selected?.hint && <span className="text-[10px] text-stone-400 flex-shrink-0">{selected.hint}</span>}
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-30 top-full mt-1.5 min-w-full bg-white border border-stone-200 rounded-xl
                         shadow-lg shadow-black/[0.06] overflow-hidden max-h-60 overflow-y-auto p-1
                         ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <button key={opt.value} type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-left text-sm rounded-lg transition-colors
                  ${active ? 'bg-stone-100' : 'hover:bg-stone-50'}`}>
                {opt.avatar && <img src={opt.avatar} className="w-5 h-5 rounded-full flex-shrink-0" alt="" />}
                {opt.dotClass && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dotClass}`} />}
                <span className={`flex-1 truncate ${active ? 'text-ink font-medium' : (opt.labelClass ?? 'text-stone-700')}`}>
                  {opt.label}
                </span>
                {opt.hint && <span className="text-[10px] text-stone-400 flex-shrink-0">{opt.hint}</span>}
                {active && <Check className="w-3.5 h-3.5 text-ink flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
