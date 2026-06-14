// Avatar dùng chung: hiện ảnh nếu có, ngược lại hiện chữ cái đầu trên nền trung tính.
interface AvatarProps {
  name?: string;
  src?: string | null;
  className?: string; // kích thước/bo góc, vd "w-7 h-7"
}

// màu nền ổn định theo tên
const BG = ['bg-stone-300', 'bg-blue-200', 'bg-emerald-200', 'bg-amber-200', 'bg-violet-200', 'bg-rose-200', 'bg-cyan-200'];
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({ name = '', src, className = 'w-7 h-7' }: AvatarProps) {
  if (src) {
    return <img src={src} alt={name} className={`${className} rounded-full object-cover bg-stone-100`} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const bg = BG[hash(name) % BG.length];
  return (
    <div className={`${className} rounded-full flex items-center justify-center ${bg}`}>
      <span className="text-[0.7em] font-semibold text-stone-700 leading-none">{initial}</span>
    </div>
  );
}
