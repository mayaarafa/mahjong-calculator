'use client'

import { useState } from 'react'
import { Trophy, AlertTriangle, XCircle } from 'lucide-react'
import { ScoringResult, PaymentStyle } from '@/lib/mahjong/scoringEngine'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const HIGH = 'bg-[#1a449a]/10 text-[#1a449a] border-[#1a449a]/30'
const MID  = 'bg-[#1a449a]/10 text-[#1a449a] border-[#1a449a]/30'
const LOW  = 'bg-[#D9CBA9]/40 text-[#8A7A63] border-[#D9CBA9]'

function pointBadgeColor(pts: number): string {
  if (pts >= 32) return HIGH
  if (pts >= 6)  return MID
  return LOW
}

interface ScoreResultProps {
  result: ScoringResult
  basePoints: number
  paymentStyle?: PaymentStyle
}

export function ScoreResult({ result, basePoints, paymentStyle = 'mcr' }: ScoreResultProps) {
  const [showExcluded, setShowExcluded] = useState(false)
  const payment = result.payment(basePoints, paymentStyle)

  if (!result.isValid) {
    return (
      <div className="rounded-xl border-2 border-[#e51e28]/40 bg-[#e51e28]/5 p-6 text-center space-y-2">
        <XCircle size={32} className="mx-auto text-[#e51e28]/60" />
        <h2 className="text-lg font-bold font-serif text-[#e51e28]">Invalid Hand</h2>
        <p className="text-sm text-[#8A7A63]">
          The tiles do not form a valid winning hand. Check that you have 14 tiles forming 4 sets + 1 pair,
          Seven Pairs, Thirteen Orphans, or a Knitted hand.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main score card */}
      <div
        className={cn(
          'rounded-xl border-2 p-5 text-center',
          result.meetsMinimum
            ? 'border-[#179e4b] bg-[#179e4b]/8'
            : 'border-[#e51e28] bg-[#e51e28]/8'
        )}
      >
        {result.meetsMinimum ? (
          <>
            <Trophy size={28} className="mx-auto mb-1 text-[#179e4b]" />
            <h2 className="text-2xl font-black font-serif text-[#21201C]">{result.fanPoints} Fan</h2>
            {result.flowerPoints > 0 && (
              <p className="text-sm text-[#8A7A63] mt-0.5">+ {result.flowerPoints} flower {result.flowerPoints === 1 ? 'point' : 'points'}</p>
            )}
            <p className="text-base font-semibold text-[#21201C] mt-1">
              Total: {result.totalPoints} points
            </p>
          </>
        ) : (
          <>
            <AlertTriangle size={28} className="mx-auto mb-1 text-[#e51e28]" />
            <h2 className="text-xl font-bold font-serif text-[#e51e28]">Below Minimum</h2>
            <p className="text-3xl font-black text-[#e51e28]">{result.fanPoints} / {result.minPoints} Fan</p>
            <p className="text-sm text-[#8A7A63] mt-1">
              Hand scores {result.fanPoints} fan — minimum {result.minPoints} required to declare a win
            </p>
          </>
        )}
      </div>

      {/* Payment breakdown */}
      {result.meetsMinimum && (
        <div className="rounded-xl border border-[#D9CBA9] overflow-hidden">
          <div className="bg-[#EFE7D8] border-b border-[#D9CBA9] px-4 py-2.5">
            <h3 className="font-semibold text-sm font-serif text-[#21201C]">Payment Breakdown</h3>
            <p className="text-[#8A7A63] text-xs">Base: {basePoints} pts · Hand: {result.totalPoints} pts</p>
          </div>
          <div className="p-4 space-y-3">
            {payment.selfDraw ? (
              <>
                <PayRow
                  label="Each opponent pays"
                  amount={payment.eachPlayerPays}
                  note={`${basePoints} base + ${result.totalPoints} hand`}
                  highlight
                />
                <Separator />
                <PayRow
                  label="Total received"
                  amount={payment.totalReceived}
                  note="from 3 opponents"
                  total
                />
              </>
            ) : (
              <>
                {payment.eachPlayerPays > 0 && (
                  <PayRow
                    label="Non-discarders each pay"
                    amount={payment.eachPlayerPays}
                    note={`${payment.basePoints} base only`}
                  />
                )}
                <PayRow
                  label="Discarder pays"
                  amount={payment.discarderPays!}
                  note={
                    paymentStyle === 'discarder-all'
                      ? `covers all 3 shares · 3 × (${payment.basePoints} + ${payment.totalHandPoints})`
                      : `${payment.basePoints} base + ${payment.totalHandPoints} hand`
                  }
                  highlight
                />
                <Separator />
                <PayRow
                  label="Total received"
                  amount={payment.totalReceived}
                  note={payment.eachPlayerPays > 0 ? 'from 3 players' : 'from discarder only'}
                  total
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Matched patterns */}
      <div className="rounded-xl border border-[#D9CBA9] overflow-hidden">
        <div className="bg-[#EFE7D8] border-b border-[#D9CBA9] px-4 py-2.5">
          <h3 className="font-semibold text-sm font-serif text-[#21201C]">
            Scoring Patterns ({result.matchedPatterns.length})
          </h3>
        </div>
        <div className="divide-y divide-[#D9CBA9]/40">
          {result.matchedPatterns.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#8A7A63]">No patterns matched</p>
          ) : (
            result.matchedPatterns.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#21201C] truncate">{p.name}</p>
                  <p className="text-xs text-[#8A7A63]">{p.chineseName}{p.count > 1 ? ` ×${p.count}` : ''}</p>
                </div>
                <span
                  className={cn(
                    'border rounded-full px-2 py-0.5 text-xs font-bold flex-shrink-0',
                    pointBadgeColor(p.points)
                  )}
                >
                  {p.points * p.count} pts
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Excluded patterns */}
      {result.excludedPatterns.length > 0 && (
        <div className="rounded-xl border border-[#D9CBA9]/50 overflow-hidden">
          <button
            className="w-full flex items-center justify-between bg-[#EFE7D8] border-b border-[#D9CBA9]/50 px-4 py-2.5 hover:bg-[#D9CBA9]/30 transition-colors"
            onClick={() => setShowExcluded(!showExcluded)}
          >
            <span className="text-sm font-medium text-[#8A7A63]">
              Excluded patterns ({result.excludedPatterns.length})
            </span>
            <span className="text-xs text-[#8A7A63]">{showExcluded ? '▲' : '▼'}</span>
          </button>
          {showExcluded && (
            <div className="divide-y divide-[#D9CBA9]/40">
              {result.excludedPatterns.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-2 opacity-50">
                  <div className="min-w-0">
                    <p className="text-sm text-[#8A7A63] line-through truncate">{p.name}</p>
                    <p className="text-xs text-[#8A7A63]">
                      Excluded by non-repeat rule
                      {p.excludedBy?.length ? ` (${p.excludedBy.join(', ')})` : ''}
                    </p>
                  </div>
                  <span className="border border-[#D9CBA9] rounded-full px-2 py-0.5 text-xs text-[#8A7A63] flex-shrink-0">
                    {p.points * p.count} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}

function PayRow({
  label,
  amount,
  note,
  highlight,
  total,
}: {
  label: string
  amount: number
  note: string
  highlight?: boolean
  total?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', total && 'pt-1')}>
      <div>
        <p className={cn('text-sm', total ? 'font-bold text-[#21201C]' : 'text-[#21201C]', highlight && 'font-semibold')}>{label}</p>
        <p className="text-xs text-[#8A7A63]">{note}</p>
      </div>
      <span className={cn('font-bold', total ? 'text-lg text-[#21201C]' : highlight ? 'text-[#21201C]' : 'text-[#8A7A63]')}>
        {amount} pts
      </span>
    </div>
  )
}
