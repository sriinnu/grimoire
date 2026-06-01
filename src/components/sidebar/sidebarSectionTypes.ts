import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

export interface SectionGroup {
  label: string
  type: string
  Icon: ComponentType<IconProps>
  customColor?: string | null
  iconValue?: string | null
}
