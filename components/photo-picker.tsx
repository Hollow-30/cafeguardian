"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, CheckCircle2, Image as ImageIcon, LoaderCircle, RotateCcw, Upload } from "lucide-react"
import { DiagnosisResult } from "@/components/diagnosis-result"
import { Button } from "@/components/ui/button"
import { photoCopy, quotaWarningLabel } from "@/content/photos"
import { classifyLeaf, type Classification } from "@/lib/diagnosis/classifyLeaf"
import { fetchSemaforoSnapshot } from "@/lib/fotos/semaforo-snapshot"
import { uploadFotoRegistro } from "@/lib/fotos/upload-client"
import { compressImage } from "@/lib/image/compress"
import { validatePhoto } from "@/lib/image/validate"
import type { PlanEstadoResponse } from "@/lib/plans/estado"
import { saveDiagnosis } from "@/lib/storage/diagnosesRepo"
import { savePhoto } from "@/lib/storage/photosRepo"

type Step = "choose" | "preview" | "processing" | "result" | "saved"
type PhotoPickerProps = { onBack?: () => void; onSaved?: (id: string) => void }

export function CaptureTips() {
  return (
    <section aria-labelledby="tips-title" className="rounded-2xl bg-coffee-50 p-5">
      <h2 id="tips-title" className="text-sm font-semibold text-coffee-950">{photoCopy.tipsTitle}</h2>
      <ul className="mt-3 grid gap-2 text-sm text-coffee-900/80 sm:grid-cols-3">
        {photoCopy.tips.map((tip) => (
          <li key={tip} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-coffee-700" aria-hidden="true" />
            {tip}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ProcessingState() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
      <LoaderCircle className="size-12 animate-spin text-coffee-700" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-coffee-950">{photoCopy.processing}</h2>
      <p className="text-sm text-slate-600">Enviamos la foto para analizarla. Necesitas conexión a internet.</p>
    </div>
  )
}

export function PhotoPreview({
  src,
  lote,
  onLoteChange,
  onUse,
  onRepeat,
}: {
  src: string
  lote: string
  onLoteChange: (value: string) => void
  onUse: () => void
  onRepeat: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-2xl border border-coffee-100 bg-coffee-50">
        <img src={src} alt="Previsualización de la hoja seleccionada" className="mx-auto max-h-[360px] w-full object-contain" />
      </div>
      <label className="flex flex-col gap-2 text-sm font-semibold text-coffee-950" htmlFor="lote">
        {photoCopy.loteLabel}
        <input
          id="lote"
          value={lote}
          onChange={(event) => onLoteChange(event.target.value)}
          placeholder={photoCopy.lotePlaceholder}
          className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-coffee-700 focus:ring-4 focus:ring-coffee-700/20"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" size="lg" onClick={onUse} className="h-12 bg-coffee-800 hover:bg-coffee-900">
          <Upload data-icon="inline-start" />
          {photoCopy.usePhoto}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onRepeat} className="h-12 border-coffee-700 text-coffee-900">
          <RotateCcw data-icon="inline-start" />
          {photoCopy.repeat}
        </Button>
      </div>
    </div>
  )
}

export function PhotoPicker({ onBack, onSaved }: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [step, setStep] = useState<Step>("choose")
  const [src, setSrc] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [photoId, setPhotoId] = useState("")
  const [lote, setLote] = useState("")
  const [error, setError] = useState("")
  const [classification, setClassification] = useState<Classification | null>(null)
  const [savedRemotely, setSavedRemotely] = useState(false)
  const [consentimientoAnonimo, setConsentimientoAnonimo] = useState(false)
  const [quotaHint, setQuotaHint] = useState("")

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/planes/estado", { credentials: "same-origin", cache: "no-store" })
        const body = (await response.json().catch(() => ({}))) as PlanEstadoResponse
        if (!active || !response.ok) return
        if (body.status.plan === "free") {
          const remaining = body.remaining ?? 0
          setQuotaHint(
            remaining <= 0
              ? photoCopy.quotaExhausted
              : quotaWarningLabel(remaining, body.quota),
          )
        } else {
          setQuotaHint("")
        }
      } catch {
        if (active) setQuotaHint("")
      }
    })()
    return () => {
      active = false
    }
  }, [])

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setSrc("")
  }

  function reset() {
    clearPreview()
    setStep("choose")
    setFile(null)
    setCompressedBlob(null)
    setPhotoId("")
    setClassification(null)
    setSavedRemotely(false)
    setConsentimientoAnonimo(false)
    setError("")
    if (cameraRef.current) cameraRef.current.value = ""
    if (galleryRef.current) galleryRef.current.value = ""
  }

  function selectFile(next: File | undefined) {
    if (!next) return
    const validation = validatePhoto(next)
    if (validation) {
      setError(validation === "invalid-type" ? photoCopy.errors.invalidType : photoCopy.errors.tooLarge)
      return
    }

    clearPreview()
    setError("")
    setFile(next)
    const previewUrl = URL.createObjectURL(next)
    previewUrlRef.current = previewUrl
    setSrc(previewUrl)
    setStep("preview")
  }

  async function usePhoto() {
    if (!file) return
    if (quotaHint === photoCopy.quotaExhausted) {
      setError(photoCopy.quotaExhausted)
      return
    }
    setStep("processing")
    try {
      const compressed = await compressImage(file)
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const saved = await savePhoto({ blob: compressed, lote })
        setCompressedBlob(compressed)
        setPhotoId(saved.id)
        setSavedRemotely(false)
        setStep("saved")
        setError(photoCopy.offlineQueued)
        onSaved?.(saved.id)
        return
      }
      const result = await classifyLeaf(compressed)
      const saved = await savePhoto({ blob: compressed, lote })
      setCompressedBlob(compressed)
      setPhotoId(saved.id)
      setClassification(result)
      setStep("result")
    } catch (cause) {
      console.error("No se pudo preparar o clasificar la foto.", cause)
      setStep("preview")
      setError(cause instanceof Error ? cause.message : photoCopy.errors.generic)
    }
  }

  async function saveCurrentDiagnosis() {
    if (!classification || !compressedBlob || !photoId) return
    setError("")
    try {
      const semaforo = await fetchSemaforoSnapshot()
      const remote = await uploadFotoRegistro({
        blob: compressedBlob,
        lote: lote.trim(),
        resultadoEtiqueta: classification.label,
        confianza: classification.confidence,
        consentimientoAnonimo,
        semaforoDia: semaforo.semaforoDia,
        semaforoFecha: semaforo.semaforoFecha,
      })
      await saveDiagnosis({
        photoId: remote.id,
        blob: compressedBlob,
        label: classification.label,
        confidence: classification.confidence,
        isDemo: classification.isDemo,
        lote: lote.trim(),
        status: "synced",
        consentimientoAnonimo,
      })
      setSavedRemotely(true)
      setStep("saved")
      onSaved?.(remote.id)
    } catch (cause) {
      console.error("No se pudo guardar el diagnóstico remoto.", cause)
      try {
        await saveDiagnosis({
          photoId,
          blob: compressedBlob,
          label: classification.label,
          confidence: classification.confidence,
          isDemo: classification.isDemo,
          lote: lote.trim(),
          status: "offline",
          consentimientoAnonimo,
        })
        setSavedRemotely(false)
        setStep("saved")
        onSaved?.(photoId)
        setError(
          cause instanceof Error
            ? `${cause.message} Se guardó solo en este dispositivo.`
            : photoCopy.errors.generic,
        )
      } catch (localError) {
        console.error("No se pudo guardar el diagnóstico local.", localError)
        setError(cause instanceof Error ? cause.message : photoCopy.errors.generic)
      }
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack} className="w-fit text-coffee-900">
            <ArrowLeft data-icon="inline-start" />
            Volver al panel
          </Button>
        )}
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coffee-700">{photoCopy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-coffee-950">{step === "result" ? "Resultado de la hoja" : photoCopy.title}</h1>
          <p className="mt-3 text-base leading-6 text-slate-600">
            {step === "result" ? "Revisa esta orientación antes de guardar el diagnóstico." : photoCopy.description}
          </p>
        </header>
        {quotaHint && step !== "saved" && (
          <p role="status" className="rounded-xl border border-coffee-200 bg-coffee-50 p-3 text-sm text-coffee-900">
            {quotaHint}
          </p>
        )}
        {error && <div role="alert" className="rounded-xl border border-coffee-200 bg-coffee-50 p-4 text-sm text-coffee-800">{error}</div>}
        {step === "choose" && (
          <>
            <div className="grid gap-4">
              <Button type="button" size="lg" onClick={() => cameraRef.current?.click()} className="h-16 justify-start gap-4 bg-coffee-800 px-5 text-lg hover:bg-coffee-900">
                <Camera data-icon="inline-start" />
                {photoCopy.camera}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => galleryRef.current?.click()} className="h-16 justify-start gap-4 border-2 border-coffee-700 px-5 text-lg text-coffee-950 hover:bg-coffee-50">
                <ImageIcon data-icon="inline-start" />
                {photoCopy.gallery}
              </Button>
            </div>
            <input
              ref={cameraRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) => {
                selectFile(event.target.files?.[0])
                event.currentTarget.value = ""
              }}
            />
            <input
              ref={galleryRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                selectFile(event.target.files?.[0])
                event.currentTarget.value = ""
              }}
            />
            <CaptureTips />
          </>
        )}
        {step === "preview" && <PhotoPreview src={src} lote={lote} onLoteChange={setLote} onUse={usePhoto} onRepeat={reset} />}
        {step === "processing" && <ProcessingState />}
        {step === "result" && classification && (
          <DiagnosisResult
            src={src}
            label={classification.label}
            confidence={classification.confidence}
            isDemo={classification.isDemo}
            consentimientoAnonimo={consentimientoAnonimo}
            onConsentimientoChange={setConsentimientoAnonimo}
            consentLabel={photoCopy.consentLabel}
            onSave={saveCurrentDiagnosis}
            onAnother={reset}
          />
        )}
        {step === "saved" && (
          <section className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-coffee-200 bg-coffee-50 p-6 text-center">
            <CheckCircle2 className="size-12 text-coffee-700" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-coffee-950">
              {savedRemotely
                ? "Diagnóstico y foto guardados en tu historial."
                : "Diagnóstico guardado en este dispositivo."}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/historial" className="inline-flex h-12 items-center justify-center rounded-xl bg-coffee-800 px-5 font-semibold text-white hover:bg-coffee-900">
                Ver historial
              </Link>
              <Button type="button" size="lg" variant="outline" onClick={reset} className="h-12 border-coffee-700 text-coffee-900">
                Subir otra foto
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
