import type { ComponentProps } from 'react'
import {
  GrimoireFormattingToolbar,
  GrimoireFormattingToolbarController,
} from './grimoireEditorFormatting'

type FormattingToolbarControllerProps = ComponentProps<typeof GrimoireFormattingToolbarController>

/** Lazy rich-editor formatting toolbar surface loaded after the editor body paints. */
export function GrimoireFormattingToolbarSurface(props: FormattingToolbarControllerProps) {
  return (
    <GrimoireFormattingToolbarController
      {...props}
      formattingToolbar={GrimoireFormattingToolbar}
    />
  )
}
