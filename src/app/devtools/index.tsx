import { TanstackDevtools } from '@tanstack/react-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

// Dev-only floating panel for TanStack Router introspection. This module is
// only imported via `React.lazy` from src/routes/__root.tsx when
// `import.meta.env.DEV` is true, so the devtools chunk never lands in the
// production bundle. Keep this file's imports devtools-only — anything
// imported here is also dev-only.

export default function DevtoolsPanel() {
  return (
    <TanstackDevtools
      config={{ position: 'bottom-left' }}
      plugins={[
        {
          name: 'Tanstack Router',
          render: <TanStackRouterDevtoolsPanel />,
        },
      ]}
    />
  )
}
