# matekit diagnostics: warnings and errors

Every warning matekit writes to the console and every error it throws, by code. Each message links
to its entry here. Decision record (in Spanish):
[ADR-0028](adr/0028-diagnosticos-con-formato-unico-codigos-estables-y-catalogo.md). Implementation:
[`src/internal/diagnostics.ts`](../src/internal/diagnostics.ts).

All of them share one shape:

```text
[matekit] <Component>: <what happened>. Fix: <how to fix it>. (<CODE>)
```

plus a structured object `{ component, code, docs, ...details }`: the second argument of
`console.warn` for a warning, `error.details` for an error. `docs` is the link to the entry in this
catalog.

- **Error** (`MatekitError`, always thrown, in production too): a usage that cannot work. Detect it
  with `error instanceof MatekitError` or, if the app may bundle two copies of the package, with
  `error.name === 'MatekitError'` and `error.code`. `MatekitError`, `MatekitErrorCode` and
  `MatekitWarningCode` are exported from `@matekit/react`.
- **Warning** (`console.warn`, development only, once): a usage that works but is wrong
  (accessibility, an ignored request). Development is detected through `process.env.NODE_ENV`, like
  React does: bundlers replace it, and production builds drop the warnings.

Codes name the cause, not the component, unless the cause exists in a single component. The
component that triggered it is in the message and in `component`. A published code is never renamed.
`tests/diagnostics.test.ts` checks that every code used in `src/` has an entry here, and the other
way around.

| Code | Kind | Components |
|---|---|---|
| [`MK_PART_OUTSIDE_PARENT`](#mk_part_outside_parent) | error | parts of Dialog, Menu, Tabs, TextField, Search, SideSheet, BottomSheet, RichTooltip and RangeSlider |
| [`MK_RENDER_NOT_ELEMENT`](#mk_render_not_element) | error | every component with `render` |
| [`MK_TRIGGER_NOT_ELEMENT`](#mk_trigger_not_element) | error | Tooltip, RichTooltipTrigger, MenuTrigger |
| [`MK_TOOLTIP_NO_TEXT`](#mk_tooltip_no_text) | error | Tooltip |
| [`MK_SNACKBAR_HOST_MISSING`](#mk_snackbar_host_missing) | error | useSnackbar |
| [`MK_SNACKBAR_DURATION_INVALID`](#mk_snackbar_duration_invalid) | error | Snackbar (`createSnackbarQueue().show`) |
| [`MK_INTERNAL_INVARIANT`](#mk_internal_invariant) | error (matekit bug) | BottomSheet |
| [`MK_TAB_UNNAMED`](#mk_tab_unnamed) | warning | Tab, TabLink |
| [`MK_TOOLBAR_EXPAND_IGNORED`](#mk_toolbar_expand_ignored) | warning | ToolbarLayout |

## MK_PART_OUTSIDE_PARENT

- **Kind:** error.
- **Components:** the parts that read their component state from context: `DialogHeadline` and
  `DialogContent` (Dialog); `MenuTrigger`, `MenuContent` and `MenuItem` (Menu); `TabList`, `Tab` and
  `TabPanel` (Tabs); `TextFieldInput`, `TextFieldLabel` and `TextFieldSupporting` (TextField);
  `SearchBar`, `SearchView` and `SearchSuggestion` (Search); `SideSheetTitle` and `SideSheetClose`;
  `BottomSheetTitle` and `BottomSheetHandle`; `RichTooltipTrigger`, `RichTooltipContent`,
  `RichTooltipSubhead`, `RichTooltipSupporting` and `RichTooltipActions`; `RangeSliderStart` and
  `RangeSliderEnd`.
- **Details:** `parent`, the missing component.
- **Cause:** the part was rendered outside its component, often because it lives in another
  component that is not rendered inside it.
- **Fix:** render it inside the component.

```tsx
// Throws: [matekit] DialogHeadline: was rendered outside a <Dialog>; … (MK_PART_OUTSIDE_PARENT)
<DialogHeadline>Delete</DialogHeadline>

// Fixed
<Dialog open={open} onClose={close}>
  <DialogHeadline>Delete</DialogHeadline>
</Dialog>
```

- **Related:** [ADR-0002](adr/0002-api-por-composicion-con-capas-atomicas.md) (flat-named parts that
  share state through context).

## MK_RENDER_NOT_ELEMENT

- **Kind:** error.
- **Components:** the ones that accept `render`: `Interactive`, `Button`, `IconButton`, `Fab`,
  `ExtendedFab`, `CardPrimaryAction`, `ListItemAction`, the chips, `NavigationBarItem`,
  `NavigationRailItem`, `TabLink`, and the layout components `Stack`, `Group` and `TopAppBar`.
- **Details:** `received`, the `typeof` of what was passed.
- **Cause:** `render` got the component itself (`render={Link}`), a string (`render="ul"`) or a
  function instead of an element.
- **Fix:** pass an element: `render={<Link href="/" />}` for interactive components, `render={<ul />}`
  for layout ones. matekit merges its props, classes and `ref` into it.

```tsx
// Throws: [matekit] Button: `render` received something that is not a React element. … (MK_RENDER_NOT_ELEMENT)
<Button render={Link}>Home</Button>

// Fixed
<Button render={<Link href="/" />}>Home</Button>
```

- **Related:** [ADR-0010](adr/0010-enlaces-y-enrutadores-con-render.md),
  [ADR-0020](adr/0020-interactive-primitiva-publica.md) (the `render` contract),
  [ADR-0017](adr/0017-stack-y-group.md) (Stack and Group).

## MK_TRIGGER_NOT_ELEMENT

- **Kind:** error.
- **Components:** `Tooltip`, `RichTooltipTrigger`, `MenuTrigger`.
- **Details:** `received`, the `typeof` of the children (`'array'` for several children).
- **Cause:** the component wraps its child without adding elements (it passes props, `ref` and ids
  to it), so it needs exactly one React element. Several children, text, a number or nothing cannot
  work.
- **Fix:** pass one element that accepts a `ref`, such as an `IconButton` or a `Button`.

```tsx
// Throws: [matekit] MenuTrigger: expects a single element child to act as the trigger. … (MK_TRIGGER_NOT_ELEMENT)
<MenuTrigger><IconButton label="More"><MoreVertIcon /></IconButton><span /></MenuTrigger>

// Fixed
<MenuTrigger>
  <IconButton label="More"><MoreVertIcon /></IconButton>
</MenuTrigger>
```

- **Related:** [ADR-0021](adr/0021-tooltip-nombre-descripcion-y-rich-con-acciones.md) (a Tooltip
  wraps its trigger), [ADR-0007](adr/0007-menu-popover-y-anchor-positioning.md) (Menu).

## MK_TOOLTIP_NO_TEXT

- **Kind:** error.
- **Components:** `Tooltip`.
- **Cause:** without `text`, the Tooltip shows the trigger name, but the trigger has no `label`,
  `aria-label` or text of its own: there is nothing to show, and the button has no accessible name
  either.
- **Fix:** pass `text` or give the trigger a name.

```tsx
// Throws: [matekit] Tooltip: without `text` it shows the trigger name, … (MK_TOOLTIP_NO_TEXT)
<Tooltip><button><EditIcon /></button></Tooltip>

// Fixed (the button name is the tooltip text)
<Tooltip><IconButton label="Edit"><EditIcon /></IconButton></Tooltip>
```

- **Related:** [ADR-0021](adr/0021-tooltip-nombre-descripcion-y-rich-con-acciones.md) (name or
  description depending on `text`).

## MK_SNACKBAR_HOST_MISSING

- **Kind:** error.
- **Components:** `useSnackbar`.
- **Cause:** `useSnackbar()` reads the queue of the nearest `SnackbarHost` from context, and there is
  none above the component.
- **Fix:** wrap the app (or the section) in `<SnackbarHost>`. If the host lives in another branch of
  the tree, create the queue with `createSnackbarQueue()`, pass it to the host with `queue` and use
  it directly.

```tsx
// Throws: [matekit] useSnackbar: found no <SnackbarHost> wrapping the component. … (MK_SNACKBAR_HOST_MISSING)
function Save() {
  const snackbar = useSnackbar()
  …
}
<Save />

// Fixed
<SnackbarHost>
  <Save />
</SnackbarHost>
```

- **Related:** [ADR-0022](adr/0022-snackbar-cola-creada-por-la-app-host-y-region-viva.md).

## MK_SNACKBAR_DURATION_INVALID

- **Kind:** error (thrown by `show`, when it is called).
- **Components:** the queue from `createSnackbarQueue()` (`show`).
- **Details:** `duration`, the value received.
- **Cause:** a numeric `duration` that is zero, negative or `NaN`.
- **Fix:** positive milliseconds, or `'short'` (4 s), `'long'` (10 s) or `'indefinite'`.

```ts
// Throws: [matekit] Snackbar: `duration` in milliseconds must be a positive number. … (MK_SNACKBAR_DURATION_INVALID)
queue.show({ message: 'Saved', duration: 0 })

// Fixed
queue.show({ message: 'Saved', duration: 'short' })
```

- **Related:** [ADR-0022](adr/0022-snackbar-cola-creada-por-la-app-host-y-region-viva.md) and the
  JSDoc of `SnackbarDuration` (`src/organisms/Snackbar/snackbar-queue.ts`).

## MK_INTERNAL_INVARIANT

- **Kind:** error, a matekit bug rather than a usage problem.
- **Components:** `BottomSheet` (`computeTarget`, the decision taken when a drag ends).
- **Details:** `where`, the internal function that detected it.
- **Cause:** a condition matekit's own code guarantees did not hold (the BottomSheet always builds at
  least the `hidden` anchor). No usage triggers it on purpose.
- **Fix:** nothing to change in the app: report it with steps to reproduce, the browser and the
  version.
- **Related:** [ADR-0025](adr/0025-sheets-sobre-dialog-base-modal-comun-arrastre-con-puntero-y-desplazamiento-anidado.md)
  and [ADR-0028](adr/0028-diagnosticos-con-formato-unico-codigos-estables-y-catalogo.md) (why an
  internal failure is a `MatekitError` too).

## MK_TAB_UNNAMED

- **Kind:** warning (development only, once per component: `Tab` and `TabLink` separately).
- **Components:** `Tab`, `TabLink`.
- **Cause:** a tab without a visible label (icon only) has no accessible name: a screen reader
  announces just "tab". The types cannot require it, because the children do not say whether they
  are an icon or text.
- **Fix:** `aria-label` or `aria-labelledby`. If the label is a component of your own, wrap it in
  `<TabLabel>` so matekit recognizes it as text.

```tsx
// Warns: [matekit] Tab: a tab without a visible label (icon only) has no accessible name. … (MK_TAB_UNNAMED)
<Tab value="home"><HomeIcon /></Tab>

// Fixed
<Tab value="home" aria-label="Home"><HomeIcon /></Tab>
```

- **Related:** [ADR-0023](adr/0023-tabs-pestanas-apg-enlaces-indicador-flip-y-foco-itinerante-compartido.md).

## MK_TOOLBAR_EXPAND_IGNORED

- **Kind:** warning (development only, once per mounted `ToolbarLayout`).
- **Components:** a controlled `ToolbarLayout` (`expanded`).
- **Details:** `expanded` (`false`) and `reason` (`'focus'`).
- **Cause:** with the toolbar collapsed, keyboard focus reached the FAB and requested expanding it
  (`onExpandedChange(true, 'focus')`), but the app did not update `expanded`. The collapsed toolbar
  is inert: its buttons cannot be reached with the keyboard.
- **Fix:** accept the request in `onExpandedChange`, at least for `reason` `'focus'`.

```tsx
// Warns: [matekit] ToolbarLayout: keyboard focus reached the FAB and requested expanding the toolbar … (MK_TOOLBAR_EXPAND_IGNORED)
<ToolbarLayout expanded={false} onExpandedChange={() => {}}>…</ToolbarLayout>

// Fixed
<ToolbarLayout expanded={expanded} onExpandedChange={(next) => setExpanded(next)}>…</ToolbarLayout>
```

- **Related:** [ADR-0027](adr/0027-toolbar-apg-con-foco-itinerante-colores-por-variables-fab-en-toolbarlayout-y-ocultar-con-el-inset-del-sticky.md)
  and the JSDoc of `ToolbarLayout` (`src/organisms/Toolbar/ToolbarLayout.tsx`).
