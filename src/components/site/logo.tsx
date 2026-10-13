import Link from 'next/link'

export function Logo({ white, className = 'h-7' }: { white?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="Yeral — на главную" className="inline-flex flex-none items-center">
      <img src={white ? '/img/yeral-lockup-white.png' : '/img/yeral-lockup-ink.png'} alt="yeral" width={740} height={230} className={`${className} w-auto`} />
    </Link>
  )
}
