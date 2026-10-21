import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AccountLayout } from '@/widgets/account-layout'

// The account area: rendered in the browser only (systemPatterns "Rendering"), for someone signed in; anyone else goes
// to the login, which brings them back here (book C-40: "Login modal first").
export const Route = createFileRoute('/$lang/_site/account')({
  ssr: false,
  beforeLoad: async ({ context, params, location }) => {
    const me = await context.queryClient.ensureQueryData(context.sdk.me.get())
    if (!me) redirect({ to: '/$lang/login', params, search: { redirect: location.href }, replace: true, throw: true })
  },
  component: () => (
    <AccountLayout>
      <Outlet />
    </AccountLayout>
  ),
})
