'use client'

import { useState } from 'react'
import { ScoringResult, PaymentBreakdown } from '@/lib/mahjong/scoringEngine'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const POINT_COLORS: Record<number, string> = {
  88: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  64: 'bg-orange-100 text-orange-800 border-orange-300',
  48: 'bg-red-100 text-red-800 border-red-300',
  32: 'bg-rose-100 text-rose-800 border-rose-300',
  24: 'bg-purple-100 text-purple-800 border-purple-300',
  16: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  12: 'bg-blue-100 text-blue-800 border-blue-300',
  8: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  6: 'bg-teal-100 text-teal-800 border-teal-300',
  4: 'bg-green-100 text-green-800 border-green-300',
  2: 'bg-lime-100 text-lime-800 border-lime-300',
  1: 'bg-slate-100 text-slate-700 border-slate-300',
}

function pointBadgeColor(pts: number): string {
  return POINT_COLORS[pts] ?? 'bg-slate-100 text-slate-700 border-slate-300'
}

interface ScoreResultProps {
  result: ScoringResult
  basePoints: number
}

export function ScoreResult({ result, basePoints }: ScoreResultProps) {
  const [showExcluded, setShowExcluded] = useState(false)
  const payment = result.payment(basePoints)

  if (!result.isValid) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center space-y-2">
        <div className="text-3xl">❌</div>
        <h2 className="text-lg font-bold text-red-700">Invalid Hand</h2>
        <p className="text-sm text-red-600">
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
          'rounded-2xl border-2 p-5 text-center',
          result.meetsMinimum
            ? 'border-green-300 bg-gradient-to-b from-green-50 to-white'
            : 'border-amber-300 bg-gradient-to-b from-amber-50 to-white'
        )}
      >
        {result.meetsMinimum ? (
          <>
            <div className="text-2xl mb-1">🏆</div>
            <h2 className="text-2xl font-black text-slate-900">{result.fanPoints} Fan</h2>
            {result.flowerPoints > 0 && (
              <p className="text-sm text-slate-500 mt-0.5">+ {result.flowerPoints} 🌸 flower {result.flowerPoints === 1 ? 'point' : 'points'}</p>
            )}
            <p className="text-base font-semibold text-slate-700 mt-1">
              Total: {result.totalPoints} points
            </p>
          </>
        ) : (
          <>
            <div className="text-2xl mb-1">⚠️</div>
            <h2 className="text-xl font-bold text-amber-700">Below Minimum</h2>
            <p className="text-3xl font-black text-amber-900">{result.fanPoints} / 8 Fan</p>
            <p className="text-sm text-amber-600 mt-1">
              Hand scores {result.fanPoints} fan — minimum 8 required to declare a win
            </p>
          </>
        )}
      </div>

      {/* Payment breakdown */}
      {result.meetsMinimum && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-2.5">
            <h3 className="font-semibold text-sm">Payment Breakdown</h3>
            <p className="text-slate-400 text-xs">Base: {basePoints} pts · Hand: {result.totalPoints} pts</p>
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
                <PayRow
                  label="Non-discarders each pay"
                  amount={payment.eachPlayerPays}
                  note={`${basePoints} base only`}
                />
                <PayRow
                  label="Discarder pays"
                  amount={payment.discarderPays!}
                  note={`${basePoints} base + ${result.totalPoints} hand`}
                  highlight
                />
                <Separator />
                <PayRow
                  label="Total received"
                  amount={payment.totalReceived}
                  note="from 3 players"
                  total
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Matched patterns */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <h3 className="font-semibold text-sm text-slate-800">
            Scoring Patterns ({result.matchedPatterns.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {result.matchedPatterns.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">No patterns matched</p>
          ) : (
            result.matchedPatterns.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.chineseName}{p.count > 1 ? ` ×${p.count}` : ''}</p>
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
        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <button
            className="w-full flex items-center justify-between bg-slate-50 border-b border-slate-100 px-4 py-2.5 hover:bg-slate-100 transition-colors"
            onClick={() => setShowExcluded(!showExcluded)}
          >
            <span className="text-sm font-medium text-slate-500">
              Excluded patterns ({result.excludedPatterns.length})
            </span>
            <span className="text-xs text-slate-400">{showExcluded ? '▲' : '▼'}</span>
          </button>
          {showExcluded && (
            <div className="divide-y divide-slate-100">
              {result.excludedPatterns.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-2 opacity-50">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-600 line-through truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      Excluded by non-repeat rule
                      {p.excludedBy?.length ? ` (${p.excludedBy.join(', ')})` : ''}
                    </p>
                  </div>
                  <span className="border border-slate-200 rounded-full px-2 py-0.5 text-xs text-slate-400 flex-shrink-0">
                    {p.points * p.count} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Special hand badge */}
      {result.isSpecialHand && result.specialHandType && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-full px-4 py-1.5 text-sm font-semibold">
            ✨ {
              {
                'seven-pairs': 'Seven Pairs',
                'thirteen-orphans': 'Thirteen Orphans',
                'greater-honors-knitted': 'Greater Honors & Knitted',
                'lesser-honors-knitted': 'Lesser Honors & Knitted',
              }[result.specialHandType]
            }
          </span>
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
        <p className={cn('text-sm', total ? 'font-bold text-slate-900' : 'text-slate-700', highlight && 'font-semibold')}>{label}</p>
        <p className="text-xs text-slate-400">{note}</p>
      </div>
      <span className={cn('font-bold', total ? 'text-lg text-slate-900' : highlight ? 'text-slate-800' : 'text-slate-600')}>
        {amount} pts
      </span>
    </div>
  )
}
