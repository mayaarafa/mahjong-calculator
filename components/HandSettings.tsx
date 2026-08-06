'use client'

import { WindValue } from '@/lib/mahjong/tiles'
import { WaitType as WaitTypeFromRules } from '@/lib/mahjong/scoringRules'
import { PaymentStyle } from '@/lib/mahjong/scoringEngine'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

// Re-export for external use
export type { WaitType } from '@/lib/mahjong/scoringRules'
export type { PaymentStyle } from '@/lib/mahjong/scoringEngine'

export interface HandSettingsValues {
  basePoints: number
  minPoints: number
  selfDraw: boolean
  seatWind: WindValue
  prevalentWind: WindValue
  waitType: WaitTypeFromRules
  paymentStyle: PaymentStyle
  isLastTile: boolean
  isRobbingKong: boolean
  isOutOnKong: boolean
  isLastClaim: boolean
  isLastDraw: boolean
}

export const DEFAULT_SETTINGS: HandSettingsValues = {
  basePoints: 8,
  minPoints: 8,
  selfDraw: false,
  seatWind: 'east',
  prevalentWind: 'east',
  waitType: 'two-sided',
  paymentStyle: 'mcr',
  isLastTile: false,
  isRobbingKong: false,
  isOutOnKong: false,
  isLastClaim: false,
  isLastDraw: false,
}

interface HandSettingsProps {
  values: HandSettingsValues
  onChange: (values: HandSettingsValues) => void
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <div className="flex rounded-lg border border-[#D9CBA9] overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 px-2 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-[#1a449a] text-[#F6F1E6]'
              : 'bg-[#F6F1E6] text-[#8A7A63] hover:bg-[#EFE7D8]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
        checked
          ? 'border-[#1a449a] bg-[#1a449a]/5'
          : 'border-[#D9CBA9] bg-[#F6F1E6] hover:border-[#1a449a]'
      }`}
    >
      <div
        className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          checked ? 'bg-[#1a449a] border-[#1a449a]' : 'border-[#D9CBA9]'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[#21201C]">{label}</p>
        {description && <p className="text-xs text-[#8A7A63] mt-0.5">{description}</p>}
      </div>
    </button>
  )
}

export function HandSettings({ values, onChange }: HandSettingsProps) {
  const set = <K extends keyof HandSettingsValues>(key: K, val: HandSettingsValues[K]) =>
    onChange({ ...values, [key]: val })

  return (
    <div className="space-y-5">
      {/* Base Points + Min Points */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-[#21201C]">Base Points</Label>
          <p className="text-xs text-[#8A7A63]">Paid by all players regardless of hand</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => set('basePoints', Math.max(1, values.basePoints - 1))}
              className="w-8 h-8 rounded-lg border border-[#D9CBA9] flex items-center justify-center text-[#8A7A63] hover:bg-[#EFE7D8] font-bold"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={values.basePoints}
              onChange={(e) => set('basePoints', Math.max(1, parseInt(e.target.value) || 8))}
              className="w-16 text-center border border-[#D9CBA9] rounded-lg py-1.5 text-sm font-semibold text-[#21201C] bg-[#F6F1E6]"
            />
            <button
              onClick={() => set('basePoints', values.basePoints + 1)}
              className="w-8 h-8 rounded-lg border border-[#D9CBA9] flex items-center justify-center text-[#8A7A63] hover:bg-[#EFE7D8] font-bold"
            >
              +
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-[#21201C]">Minimum to Win</Label>
          <p className="text-xs text-[#8A7A63]">Minimum fan points required to declare a win</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => set('minPoints', Math.max(0, values.minPoints - 1))}
              className="w-8 h-8 rounded-lg border border-[#D9CBA9] flex items-center justify-center text-[#8A7A63] hover:bg-[#EFE7D8] font-bold"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              value={values.minPoints}
              onChange={(e) => set('minPoints', Math.max(0, parseInt(e.target.value) || 8))}
              className="w-16 text-center border border-[#D9CBA9] rounded-lg py-1.5 text-sm font-semibold text-[#21201C] bg-[#F6F1E6]"
            />
            <button
              onClick={() => set('minPoints', values.minPoints + 1)}
              className="w-8 h-8 rounded-lg border border-[#D9CBA9] flex items-center justify-center text-[#8A7A63] hover:bg-[#EFE7D8] font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Win Type + Payment Style */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-[#21201C]">Win Type</Label>
        <SegmentedControl
          value={values.selfDraw ? 'self-draw' : 'discard'}
          onChange={(v) => set('selfDraw', v === 'self-draw')}
          options={[
            { label: 'Discard', value: 'discard' },
            { label: 'Self-Draw', value: 'self-draw' },
          ]}
        />
      </div>

      {!values.selfDraw && (
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-[#21201C]">Payment Style</Label>
          <SegmentedControl
            value={values.paymentStyle}
            onChange={(v) => set('paymentStyle', v as PaymentStyle)}
            options={[
              { label: 'MCR', value: 'mcr' },
              { label: 'Discarder Only', value: 'single-pay' },
              { label: 'Discarder Pays All', value: 'discarder-all' },
            ]}
          />
          <p className="text-xs text-[#8A7A63]">
            {values.paymentStyle === 'single-pay' && 'Discarder pays hand score · Non-discarders pay nothing'}
            {values.paymentStyle === 'mcr' && 'All pay base fee · Discarder also pays hand score'}
            {values.paymentStyle === 'discarder-all' && 'Discarder covers all 3 shares · Non-discarders pay nothing'}
          </p>
        </div>
      )}

      <Separator />

      {/* Winds */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-[#21201C]">Seat Wind</Label>
          <SegmentedControl
            value={values.seatWind}
            onChange={(v) => set('seatWind', v as WindValue)}
            options={[
              { label: 'E', value: 'east' },
              { label: 'S', value: 'south' },
              { label: 'W', value: 'west' },
              { label: 'N', value: 'north' },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-[#21201C]">Prevalent Wind</Label>
          <SegmentedControl
            value={values.prevalentWind}
            onChange={(v) => set('prevalentWind', v as WindValue)}
            options={[
              { label: 'E', value: 'east' },
              { label: 'S', value: 'south' },
              { label: 'W', value: 'west' },
              { label: 'N', value: 'north' },
            ]}
          />
        </div>
      </div>

      <Separator />

      {/* Wait type */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-[#21201C]">Wait Type</Label>
        <SegmentedControl
          value={values.waitType}
          onChange={(v) => set('waitType', v as WaitTypeFromRules)}
          options={[
            { label: 'None', value: 'two-sided' },
            { label: 'Edge', value: 'edge' },
            { label: 'Closed', value: 'closed' },
            { label: 'Single', value: 'pair' },
          ]}
        />
        <p className="text-xs text-[#8A7A63]">
          {values.waitType === 'two-sided' &&
            'No wait bonus — two-sided waits and dual pung waits (two pairs, either completing a pung) score nothing'}
          {values.waitType === 'edge' &&
            'Waiting on 3 to finish 1-2, or on 7 to finish 8-9'}
          {values.waitType === 'closed' &&
            'Waiting on the middle tile of a gap, such as 4 to finish 3-5'}
          {values.waitType === 'pair' &&
            'Waiting on the single tile that completes your pair (单钓将)'}
        </p>
      </div>

      <Separator />

      {/* Special conditions */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-[#21201C]">Special Conditions</Label>
        <Toggle
          checked={values.isLastTile}
          onChange={(v) => set('isLastTile', v)}
          label="Last Tile (絕張)"
          description="Winning on the last remaining copy of a tile"
        />
        <Toggle
          checked={values.isOutOnKong}
          onChange={(v) => {
            set('isOutOnKong', v)
            if (v) {
              onChange({ ...values, isOutOnKong: true, selfDraw: true, isRobbingKong: false })
            }
          }}
          label="Out on Kong (杠上開花)"
          description="Self-draw after declaring a kong"
        />
        <Toggle
          checked={values.isRobbingKong}
          onChange={(v) => {
            set('isRobbingKong', v)
            if (v) onChange({ ...values, isRobbingKong: true, selfDraw: false, isOutOnKong: false })
          }}
          label="Robbing a Kong (搶杠胡)"
          description="Win on a tile added to an opponent's pung"
        />
        <Toggle
          checked={values.isLastClaim}
          onChange={(v) => set('isLastClaim', v)}
          label="Last Tile Claim (河底撈魚)"
          description="Win on the very last discard of the game"
        />
        <Toggle
          checked={values.isLastDraw}
          onChange={(v) => set('isLastDraw', v)}
          label="Last Tile Draw (海底撈月)"
          description="Win on the very last self-draw of the game"
        />
      </div>
    </div>
  )
}
