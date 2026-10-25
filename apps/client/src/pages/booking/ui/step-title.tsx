/**
 * The step's title (Booking `.h1`, 28/34; 24/30 on phones) and its line (`.sub`). In move mode the page's own title
 * («Change the time») is the h1 and a step's is an h2 (`.sh`).
 */
export function StepTitle({ title, lead, level = 1 }: { title: string; lead?: string; level?: 1 | 2 }) {
  return (
    <div className="flex flex-col gap-2">
      {level === 1 ? (
        <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.025em] max-sm:text-[24px] max-sm:leading-[30px]">{title}</h1>
      ) : (
        <h2 className="m-0 text-[20px] leading-[26px] font-semibold tracking-[-0.015em]">{title}</h2>
      )}
      {lead && <p className="m-0 text-body text-n-600">{lead}</p>}
    </div>
  )
}
