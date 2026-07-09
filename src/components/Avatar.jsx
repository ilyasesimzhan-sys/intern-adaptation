export default function Avatar({ src, name, size = 40 }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className="rounded-full bg-navy-100 text-navy-500 font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}
