// Logging in with a phone and a code, the same in every app (book C-18, C-19, B-07; Q-157): the steps' state, the
// requests behind them and the market's phone rules. Each app draws the steps in its own frame and words.
export { PHONE_RULES, phoneProblem } from './lib/phone'
export { initialSignIn, signInReducer, signInView, type SignInEvent, type SignInState, type SignInStep } from './model/sign-in'
export { useCodeSteps, useRequestLanguage, useSignIn, type CodeSteps, type CodeStepsOptions, type Verified } from './model/use-sign-in'
