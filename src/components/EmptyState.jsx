export default function EmptyState({ icon = '📭', title, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl border-2 border-dashed border-navy-200 dark:border-navy-700">
      <div className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <div className="font-semibold text-navy-600 dark:text-navy-300">{title}</div>
      {description && <p className="text-sm text-navy-400 dark:text-navy-500 mt-1 max-w-sm">{description}</p>}
    </div>
  )
}
