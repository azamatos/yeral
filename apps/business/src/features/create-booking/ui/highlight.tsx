/** The matched part of a row in 700, the rest as the row has it (B7: «<b>Ja</b>han Muradowa», «+993 <b>65 12</b> 34 56»). */
export function Highlight({ text, range }: { text: string; range: [number, number] | null }) {
  if (!range) return text
  const [from, to] = range
  return (
    <>
      {text.slice(0, from)}
      <b className="font-bold">{text.slice(from, to)}</b>
      {text.slice(to)}
    </>
  )
}
