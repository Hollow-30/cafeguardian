"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, CheckCircle2, Image as ImageIcon, LoaderCircle, RotateCcw, Upload } from "lucide-react"
import { DiagnosisResult } from "@/components/diagnosis-result"
import { Button } from "@/components/ui/button"
import { photoCopy } from "@/content/photos"
import { classifyLeaf, type Classification } from "@/lib/diagnosis/classifyLeaf"
import { compressImage } from "@/lib/image/compress"
import { validatePhoto } from "@/lib/image/validate"
import { saveDiagnosis } from "@/lib/storage/diagnosesRepo"
import { savePhoto } from "@/lib/storage/photosRepo"

type Step = "choose" | "preview" | "processing" | "result" | "saved"
type PhotoPickerProps = { onBack?: () => void; onSaved?: (id: string) => void }

export function CaptureTips() {
  return (
    <section aria-labelledby="tips-title" className="rounded-2xl bg-emerald-50 p-5">
      <h2 id="tips-title" className="text-sm font-semibold text-emerald-950">{photoCopy.tipsTitle}</h2>
      <ul className="mt-3 grid gap-2 text-sm text-emerald-900/80 sm:grid-cols-3">
        {photoCopy.tips.map((tip) => (
          <li key={tip} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-700" aria-hidden="true" />
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
      <LoaderCircle className="size-12 animate-spin text-emerald-700" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-emerald-950">{photoCopy.processing}</h2>
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
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50">
        <img src={src} alt="Previsualización de la hoja seleccionada" className="mx-auto max-h-[360px] w-full object-contain" />
      </div>
      <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-950" htmlFor="lote">
        {photoCopy.loteLabel}
        <input
          id="lote"
          value={lote}
          onChange={(event) => onLoteChange(event.target.value)}
          placeholder={photoCopy.lotePlaceholder}
          className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/20"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" size="lg" onClick={onUse} className="h-12 bg-emerald-800 hover:bg-emerald-900">
          <Upload data-icon="inline-start" />
          {photoCopy.usePhoto}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onRepeat} className="h-12 border-emerald-700 text-emerald-900">
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

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
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
    setStep("processing")
    try {
      const compressed = await compressImage(file)
      const result = await classifyLeaf(compressed)
      const saved = await savePhoto({ blob: compressed, lote })
      setCompressedBlob(compressed)
      setPhotoId(saved.id)
      setClassification(result)
      setStep("result")
    } catch (cause) {
      console.error("No se pudo preparar o clasificar la foto.", cause)
      setStep("preview")
      setError(photoCopy.errors.generic)
    }
  }

  async function saveCurrentDiagnosis() {
    if (!classification || !compressedBlob || !photoId) return
    setError("")
    try {
      await saveDiagnosis({
        photoId,
        blob: compressedBlob,
        label: classification.label,
        confidence: classification.confidence,
        isDemo: classification.isDemo,
        lote: lote.trim(),
      })
      setStep("saved")
      onSaved?.(photoId)
    } catch (cause) {
      console.error("No se pudo guardar el diagnóstico.", cause)
      setError(photoCopy.errors.generic)
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack} className="w-fit text-emerald-900">
            <ArrowLeft data-icon="inline-start" />
            Volver al panel
          </Button>
        )}
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">{photoCopy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-emerald-950">{step === "result" ? "Resultado de la hoja" : photoCopy.title}</h1>
          <p className="mt-3 text-base leading-6 text-slate-600">
            {step === "result" ? "Revisa esta orientación antes de guardar el diagnóstico." : photoCopy.description}
          </p>
        </header>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {step === "choose" && (
          <>
            <div className="grid gap-4">
              <Button type="button" size="lg" onClick={() => cameraRef.current?.click()} className="h-16 justify-start gap-4 bg-emerald-800 px-5 text-lg hover:bg-emerald-900">
                <Camera data-icon="inline-start" />
                {photoCopy.camera}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => galleryRef.current?.click()} className="h-16 justify-start gap-4 border-2 border-emerald-700 px-5 text-lg text-emerald-950 hover:bg-emerald-50">
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
            onSave={saveCurrentDiagnosis}
            onAnother={reset}
          />
        )}
        {step === "saved" && (
          <section className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle2 className="size-12 text-green-700" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-emerald-950">Diagnóstico guardado en este dispositivo.</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/historial" className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 font-semibold text-white hover:bg-emerald-900">
                Ver historial
              </Link>
              <Button type="button" size="lg" variant="outline" onClick={reset} className="h-12 border-emerald-700 text-emerald-900">
                Subir otra foto
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
