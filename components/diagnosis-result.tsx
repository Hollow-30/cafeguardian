"use client"

import { CheckCircle2, CircleAlert, Leaf, RotateCcw, Save } from "lucide-react"
import { diagnosisCopy, getDiagnosisExplanation, mapDiagnosisLabel, type DiagnosisKey } from "@/content/diagnosis"
import { getResultPresentation } from "@/lib/diagnosis/presentation"
import { Button } from "@/components/ui/button"

type ResultBadgeProps = { label: DiagnosisKey; confidence: number }

export function ResultBadge({ label, confidence }: ResultBadgeProps) {
  const { result, tone } = getResultPresentation(label, confidence)
  const colors = { green: "border-green-200 bg-green-50 text-green-800", red: "border-red-200 bg-red-50 text-red-800", yellow: "border-yellow-200 bg-yellow-50 text-yellow-900" }
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${colors[tone]}`}>
      <span className="flex size-11 items-center justify-center rounded-full bg-white" aria-hidden="true">
        {result === "healthy" ? <Leaf aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-600">Resultado</p>
        <p className="text-2xl font-bold text-coffee-950">{mapDiagnosisLabel(result).text}</p>
      </div>
    </div>
  )
}

type ConfidenceBarProps = { confidence: number }

export function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  return (
    <div aria-label={`Confianza ${confidence}%`} className="flex flex-col gap-2">
      <div className="flex justify-between text-sm font-semibold text-coffee-950">
        <span>Confianza</span>
        <span>{confidence}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-coffee-700 transition-all" style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }} />
      </div>
    </div>
  )
}

type NextStepCardProps = { inconclusive: boolean }

export function NextStepCard({ inconclusive }: NextStepCardProps) {
  return (
    <section className="rounded-2xl border border-coffee-100 bg-coffee-50 p-5">
      <h2 className="font-semibold text-coffee-950">{inconclusive ? diagnosisCopy.noConclusive : diagnosisCopy.nextStep}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {inconclusive ? "Prueba con una foto de una sola hoja, de cerca y con luz natural." : diagnosisCopy.interval}
      </p>
    </section>
  )
}

type DiagnosisResultProps = {
  src: string
  label: DiagnosisKey
  confidence: number
  isDemo: boolean
  onSave: () => void
  onAnother: () => void
}

export function DiagnosisResult({ src, label, confidence, isDemo, onSave, onAnother }: DiagnosisResultProps) {
  const inconclusive = getResultPresentation(label, confidence).result === "inconclusive"
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-2xl border border-coffee-100 bg-coffee-50">
        <img src={src} alt="Hoja analizada" className="mx-auto max-h-64 w-full object-contain" />
      </div>
      {isDemo && <p className="rounded-lg bg-coffee-50 px-3 py-2 text-center text-sm font-semibold text-coffee-900">{diagnosisCopy.demo}</p>}
      <ResultBadge label={label} confidence={confidence} />
      <ConfidenceBar confidence={confidence} />
      <p className="text-base leading-7 text-slate-700">{getDiagnosisExplanation(inconclusive ? "inconclusive" : label)}</p>
      <NextStepCard inconclusive={inconclusive} />
      <p className="text-center text-sm font-semibold text-coffee-950">{diagnosisCopy.disclaimer}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" size="lg" onClick={onSave} className="h-12 bg-coffee-800 hover:bg-coffee-900">
          <Save data-icon="inline-start" />
          {diagnosisCopy.save}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onAnother} className="h-12 border-coffee-700 text-coffee-900">
          <RotateCcw data-icon="inline-start" />
          {diagnosisCopy.another}
        </Button>
      </div>
    </div>
  )
}
