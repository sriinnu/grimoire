import { useRef } from 'react'
import { Image, UploadSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { TYPE_ICON_IMAGE_OPTIONS } from '../utils/typeIconImages'
import { NoteTitleIcon } from './NoteTitleIcon'
import { cn } from '@/lib/utils'

interface TypeImagePickerProps {
  selectedIcon: string | null
  onSelectIcon: (icon: string) => void
}

function readIconFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Built-in image badge and upload picker for type icons. */
export function TypeImagePicker({ selectedIcon, onSelectIcon }: TypeImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const dataUrl = await readIconFile(file)
    if (dataUrl.startsWith('data:image/')) onSelectIcon(dataUrl)
  }

  return (
    <div className="space-y-2">
      <div
        aria-label="Built-in type image badges"
        className="grid max-h-28 grid-cols-7 gap-1.5 overflow-y-auto pr-1"
      >
        {TYPE_ICON_IMAGE_OPTIONS.map((option) => (
          <Button
            key={option.id}
            aria-label={option.label}
            aria-pressed={selectedIcon === option.value}
            className={cn('h-8 w-8 p-1', selectedIcon === option.value && 'ring-2 ring-primary')}
            onClick={() => onSelectIcon(option.value)}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <NoteTitleIcon icon={option.value} size={20} />
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Upload type image"
          className="h-8 px-2"
          onClick={() => fileInputRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          <UploadSimple size={14} />
          SVG
        </Button>
      </div>
      <input
        ref={fileInputRef}
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void handleFile(event.currentTarget.files?.[0])}
        tabIndex={-1}
        type="file"
      />
      {selectedIcon?.startsWith('data:image/') && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/35 px-2 py-1 text-xs text-muted-foreground">
          <Image size={14} />
          <span className="min-w-0 truncate">Image icon selected</span>
        </div>
      )}
    </div>
  )
}
