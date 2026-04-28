import { useState } from 'react'
import { CloudSun } from '@phosphor-icons/react'
import {
  createWeatherSnapshotMarkdown,
  type WeatherTemperatureUnit,
} from '../utils/weatherSnapshot'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

interface WeatherSnapshotDialogProps {
  open: boolean
  onInsert: (markdown: string) => void
  onClose: () => void
}

/** Dialog for adding an opt-in current weather snapshot to the active note. */
export function WeatherSnapshotDialog({ open, onInsert, onClose }: WeatherSnapshotDialogProps) {
  const [location, setLocation] = useState('')
  const [unit, setUnit] = useState<WeatherTemperatureUnit>('fahrenheit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const insertWeather = async () => {
    setBusy(true)
    setError(null)
    try {
      const snapshot = await createWeatherSnapshotMarkdown(location, unit)
      onInsert(snapshot.markdown)
      setLocation('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add weather.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudSun size={18} />
            Add weather
          </DialogTitle>
          <DialogDescription className="sr-only">Insert current weather into the active note.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="space-y-2 text-sm font-medium">
            <span>Location</span>
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City, address, or postal code"
              data-testid="weather-location"
            />
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Units</span>
            <Select value={unit} onValueChange={(value) => setUnit(value as WeatherTemperatureUnit)}>
              <SelectTrigger data-testid="weather-unit" data-value={unit}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" data-anchor-strategy="popper">
                <SelectItem value="fahrenheit">Fahrenheit</SelectItem>
                <SelectItem value="celsius">Celsius</SelectItem>
              </SelectContent>
            </Select>
          </label>

          {error ? <div className="text-sm text-destructive" role="alert">{error}</div> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => { void insertWeather() }} disabled={busy || !location.trim()} data-testid="insert-weather">
            {busy ? 'Adding…' : 'Insert weather'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
