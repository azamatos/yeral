import { CheckIcon, CircleHelpIcon, MessageCircleIcon, PhoneIcon, SendIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react'
import { cn } from '../../lib/cn'
import { useMediaQuery } from '../../lib/use-media-query'
import { Button } from '../button'
import { CodeInput } from '../code-input'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTrigger } from '../drawer'
import { FieldMessage } from '../field'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { Spinner } from '../spinner'
import { formatCountdown } from './countdown'

/** The words of the Telegram code step (DS-Lists → 06 · B10), all from the screen. */
export type TelegramStepCopy = {
  /** «Sign-in code» — the boxes' group label. */
  codeLabel: string
  /** «Checking…» */
  checking: string
  /** «Send a new code» */
  resend: string
  /** «Send a new code in 0:42» — `time` is m:ss. */
  resendIn: (time: string) => string
  /** «This code has expired. Get a new one.» */
  codeExpired: string
  /** «Open Telegram» */
  openTelegram: string
  /** «No Telegram on this number?» */
  noTelegram: string
  /** «Codes come from Telegram for now. Install Telegram, sign up with +993 •• •• •• 10, then tap Send a new code.» */
  noTelegramHelp: ReactNode
  /** «Still stuck? Contact Ýeral.» */
  stillStuck: string
  /** «Call» */
  call: string
  /** «Telegram» — write to Ýeral. */
  writeTelegram: string
  /** «Call Ýeral» — the help sheet's button on a phone. */
  callBrand: string
  /** «Write on Telegram» — the help sheet's button on a phone. */
  writeOnTelegram: string
  /** «Back to the code» — closes the help sheet. */
  backToCode: string
  /** «Close» — the help sheet's close button. */
  close: string
  /** «Linked to another Telegram? Link again» — asks for a new link. */
  linkAgain?: string
  /** `telegram_link`: the three steps in Telegram — «Press Start», «Tap Share my number», «The code arrives in the chat». */
  linkSteps?: string[]
  /** «Telegram didn't answer. Try again.» */
  sendFailed: string
  /** «Signed in» */
  signedIn: string
}

export type TelegramStepProps = {
  copy: TelegramStepCopy
  /** `telegram_link`: the number isn't linked yet — the three steps show above the boxes and Open Telegram opens `link`. */
  linking: boolean
  /** Where Open Telegram goes: the bot's link (`https://t.me/<bot>?start=…`), or the app itself. */
  link?: string
  /** Ýeral's support lines for the help. */
  support?: { phone?: string; telegram?: string }
  codeRef: RefObject<HTMLInputElement | null>
  code: string
  onCodeChange: (code: string) => void
  onComplete: (code: string) => void
  checking: boolean
  success: boolean
  /** «Wrong code. 2 tries left.» */
  codeError?: ReactNode
  /** «Too many tries. Try again in 60 seconds.» — the boxes lock. */
  locked?: ReactNode
  /** «Too many codes. Try again in 42 minutes.» — everything but Change number and the help is off. */
  tooManyCodes?: ReactNode
  codeExpired: boolean
  sendFailed: boolean
  resendIn: number
  onResend?: () => void
  onRelink?: () => void
  /** Boxes 52 (56 under 768) on the login's page; 48 inline. */
  size?: 48 | 52
  /**
   * Inside a form of its own (My profile's «Change number», B-Shell): S buttons on one row — Open Telegram (or Send a
   * new code once the code expired), the help, and this Cancel at the row's end.
   */
  inline?: ReactNode
}

/**
 * The code step when the code goes to Telegram (DS-Lists → 06 · B10): boxes 52 (56 under 768) without a label or
 * Confirm (the 4th digit checks), the 32 px resend slot under them («Send a new code in 0:42» → «Send a new code»;
 * «Checking…» while the code is checked), then Secondary «Open Telegram» (Primary «Send a new code» once the code
 * expired) and the «No Telegram on this number?» help in a popover. The first time (`linking`) the three steps the
 * person takes in Telegram sit above the boxes.
 */
export function TelegramStep({
  copy,
  linking,
  link,
  support,
  codeRef,
  code,
  onCodeChange,
  onComplete,
  checking,
  success,
  codeError,
  locked,
  tooManyCodes,
  codeExpired,
  sendFailed,
  resendIn,
  onResend,
  onRelink,
  size = 52,
  inline,
}: TelegramStepProps) {
  const limited = Boolean(tooManyCodes)
  const blocked = limited || Boolean(locked) || codeExpired
  const wrong = Boolean(codeError) && !blocked
  const newCodeRef = useRef<HTMLButtonElement>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  // the help is a sheet on a phone, a popover from 768 (B10)
  const onPhone = useMediaQuery('(max-width: 767px)')
  const isInline = inline !== undefined
  const buttonSize = isInline ? 's' : 'l'
  const buttonWidth = isInline ? undefined : 'w-full'

  // the lock is over or the code ran out: the only way on is a new code
  useEffect(() => {
    if (codeExpired && !limited) newCodeRef.current?.focus()
  }, [codeExpired, limited])

  const openTelegram = () => {
    if (link) window.open(link, '_blank', 'noopener')
    else window.location.assign('tg://')
  }
  const message = tooManyCodes ?? locked ?? (codeExpired ? copy.codeExpired : sendFailed ? copy.sendFailed : wrong ? codeError : undefined)
  // the number's Telegram is lost: a new link, proved by the contact as the first time; it asks the api for a code, so
  // it waits with the resend
  const relink = onRelink && copy.linkAgain && !linking && (
    <button
      type="button"
      disabled={resendIn > 0 || checking}
      className={cn(
        'hit cursor-pointer self-start text-start text-small font-semibold text-a-600 hover:underline focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-default disabled:text-n-500 disabled:no-underline',
      )}
      onClick={() => {
        setHelpOpen(false)
        onRelink()
      }}
    >
      {copy.linkAgain}
    </button>
  )
  const helpButton = <HelpButton open={helpOpen}>{copy.noTelegram}</HelpButton>
  // what's under the boxes: Open Telegram (Primary «Send a new code» once the code expired) and the help; inline, the
  // same on one row with Cancel at its end
  const action = !limited ? (
    codeExpired ? (
      <Button ref={newCodeRef} type="button" variant="primary" size={buttonSize} className={buttonWidth} onClick={onResend}>
        {copy.resend}
      </Button>
    ) : (
      <Button type="button" variant="secondary" size={buttonSize} className={buttonWidth} onClick={openTelegram}>
        <SendIcon size={isInline ? 16 : 20} aria-hidden />
        {copy.openTelegram}
      </Button>
    )
  ) : null

  return (
    <>
      {linking && copy.linkSteps && !success && (
        <ol className="m-0 flex list-decimal flex-col gap-1 ps-5 text-dense text-n-600">
          {copy.linkSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      <div className="flex flex-col gap-2.5">
        <CodeInput
          ref={codeRef}
          value={code}
          onValueChange={onCodeChange}
          onComplete={onComplete}
          length={4}
          size={size}
          responsive={isInline ? undefined : 'up'}
          aria-label={copy.codeLabel}
          invalid={wrong}
          disabled={blocked || success}
          success={success}
          readOnly={checking}
          aria-busy={checking || undefined}
        />
        {success ? (
          <span role="status" className="inline-flex items-center gap-2 text-small font-semibold text-st-completed-ink">
            <CheckIcon size={16} aria-hidden />
            {copy.signedIn}
          </span>
        ) : (
          <>
            {message && <FieldMessage live={!blocked}>{message}</FieldMessage>}
            {/* the countdown ticks without a live role (a second-by-second reading); the form's status says «Checking…» */}
            {!blocked && (
              <div className="flex min-h-8 items-center text-small text-n-600">
                {checking ? (
                  <span className="text-n-700 inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    {copy.checking}
                  </span>
                ) : resendIn > 0 ? (
                  <span>{copy.resendIn(formatCountdown(resendIn))}</span>
                ) : (
                  <Button type="button" variant="ghost" size="s" className="-ms-2" onClick={onResend}>
                    {copy.resend}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {!success && !isInline && action}
      {!success && (
        <div className={cn('flex', isInline ? 'flex-wrap items-center gap-2' : 'justify-center')}>
          {isInline && action}
          {onPhone ? (
            <Drawer open={helpOpen} onOpenChange={setHelpOpen}>
              <DrawerTrigger asChild>{helpButton}</DrawerTrigger>
              <DrawerContent aria-describedby={undefined}>
                <DrawerHeader title={copy.noTelegram} closeLabel={copy.close} />
                <div className="flex flex-col gap-4 px-4 pt-4 pb-[34px] text-body">
                  <p className="m-0 text-n-900">{copy.noTelegramHelp}</p>
                  <p className="m-0 text-n-600">{copy.stillStuck}</p>
                  <div className="flex flex-col gap-3">
                    {support?.phone && (
                      <Button asChild variant="secondary" size="l" className="w-full">
                        <a href={`tel:${support.phone}`}>
                          <PhoneIcon size={20} aria-hidden />
                          {copy.callBrand}
                        </a>
                      </Button>
                    )}
                    {support?.telegram && (
                      <Button asChild variant="secondary" size="l" className="w-full">
                        <a href={`https://t.me/${support.telegram}`} target="_blank" rel="noreferrer">
                          <MessageCircleIcon size={20} aria-hidden />
                          {copy.writeOnTelegram}
                        </a>
                      </Button>
                    )}
                    <DrawerClose asChild>
                      <Button type="button" variant="ghost" size="l" className="w-full">
                        {copy.backToCode}
                      </Button>
                    </DrawerClose>
                  </div>
                  {relink}
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={helpOpen} onOpenChange={setHelpOpen}>
              <PopoverTrigger asChild>{helpButton}</PopoverTrigger>
              <PopoverContent
                side="top"
                align="center"
                aria-label={copy.noTelegram}
                className="flex w-[280px] flex-col gap-2.5 p-3 text-[13px] leading-[18px]"
              >
                <span>{copy.noTelegramHelp}</span>
                <span>{copy.stillStuck}</span>
                {(support?.phone || support?.telegram) && (
                  <span className="flex gap-2">
                    {support.phone && (
                      <Button asChild variant="secondary" size="s">
                        <a href={`tel:${support.phone}`}>
                          <PhoneIcon size={16} aria-hidden />
                          {copy.call}
                        </a>
                      </Button>
                    )}
                    {support.telegram && (
                      <Button asChild variant="secondary" size="s">
                        <a href={`https://t.me/${support.telegram}`} target="_blank" rel="noreferrer">
                          <MessageCircleIcon size={16} aria-hidden />
                          {copy.writeTelegram}
                        </a>
                      </Button>
                    )}
                  </span>
                )}
                {relink}
              </PopoverContent>
            </Popover>
          )}
          {isInline && <span className="ml-auto">{inline}</span>}
        </div>
      )}
    </>
  )
}

/** «No Telegram on this number?» — opens the help. */
function HelpButton({ open, ...props }: ComponentProps<'button'> & { open: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'text-n-700 hit inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xs text-small font-medium whitespace-nowrap',
        'hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none',
        open && 'text-n-900',
      )}
    >
      <CircleHelpIcon size={16} className="text-n-600" aria-hidden />
      {props.children}
    </button>
  )
}
