/** The step's title (Booking `.h1`, 28/34; 24/30 on phones) and its line (`.sub`). */
export function StepTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.025em] max-sm:text-[24px] max-sm:leading-[30px]">{title}</h1>
      {lead && <p className="m-0 text-body text-n-600">{lead}</p>}
    </div>
  )
}
