export default function Avatar({ src, name, size = 40, position }) {
  if (src) {
    const pos = position || { x: 50, y: 50 }
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, objectPosition: `${pos.x}% ${pos.y}%` }}
      />
    )
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className="rounded-full bg-navy-100 text-navy-500 dark:bg-navy-800 dark:text-navy-400 font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}
