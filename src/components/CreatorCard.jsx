// Небольшая карточка с указанием автора сайта, с водяным знаком из инициалов на фоне.
export default function CreatorCard() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-navy-900 border border-navy-700/80 px-3 py-3">
      <span
        aria-hidden="true"
        className="pointer-events-none select-none absolute -right-2 -bottom-5 text-[72px] font-black italic leading-none tracking-tighter text-sky-500/10"
      >
        EI
      </span>
      <div className="relative">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-400">Crafted by</div>
        <div className="text-sm font-bold text-white mt-0.5">Esimzhanov Ilyas</div>
        <div className="text-[10px] text-navy-400 mt-0.5">Kazakhtelecom Corporate University</div>
      </div>
    </div>
  )
}
