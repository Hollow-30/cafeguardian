"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, CheckCircle2, Image as ImageIcon, LoaderCircle, RotateCcw, Upload } from "lucide-react"
import { photoCopy } from "@/content/photos"
import { compressImage } from "@/lib/image/compress"
import { validatePhoto } from "@/lib/image/validate"
import { savePhoto } from "@/lib/storage/photosRepo"
import { Button } from "@/components/ui/button"

type Step = "choose" | "preview" | "processing" | "saved"
type PhotoPickerProps = { onBack?: () => void; onSaved?: (id: string) => void }

export function CaptureTips() {
  return (
    <section aria-labelledby="tips-title" className="rounded-2xl bg-[#fff8f2] p-5">
      <h2 id="tips-title" className="text-sm font-semibold text-[#4A2E1E]">{photoCopy.tipsTitle}</h2>
      <ul className="mt-3 grid gap-2 text-sm text-[#6b5142] sm:grid-cols-3">
        {photoCopy.tips.map((tip) => (
          <li key={tip} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[#B4693A]" aria-hidden="true" />
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
      <LoaderCircle className="size-12 animate-spin text-[#B4693A]" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-[#4A2E1E]">{photoCopy.processing}</h2>
      <p className="text-sm text-slate-600">La foto permanece en tu teléfono.</p>
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
      <div className="overflow-hidden rounded-2xl border border-[#eadfd7] bg-[#f8f5f2]">
        <img src={src} alt="Previsualización de la hoja seleccionada" className="mx-auto max-h-[360px] w-full object-contain" />
      </div>
      <label className="flex flex-col gap-2 text-sm font-semibold text-[#4A2E1E]" htmlFor="lote">
        {photoCopy.loteLabel}
        <input
          id="lote"
          value={lote}
          onChange={(event) => onLoteChange(event.target.value)}
          placeholder={photoCopy.lotePlaceholder}
          className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#B4693A] focus:ring-4 focus:ring-[#B4693A]/20"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" size="lg" onClick={onUse} className="h-12 bg-[#4A2E1E] hover:bg-[#362116]">
          <Upload data-icon="inline-start" />
          {photoCopy.usePhoto}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onRepeat} className="h-12 border-[#B4693A] text-[#4A2E1E]">
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
  const [lote, setLote] = useState("")
  const [error, setError] = useState("")

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
      const saved = await savePhoto({ blob: compressed, lote })
      setStep("saved")
      onSaved?.(saved.id)
    } catch (cause) {
      console.error("No se pudo preparar o guardar la foto.", cause)
      setStep("choose")
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
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#B4693A]">{photoCopy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-[#4A2E1E]">{photoCopy.title}</h1>
          <p className="mt-3 text-base leading-6 text-slate-600">{photoCopy.description}</p>
        </header>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {step === "choose" && (
          <>
            <div className="grid gap-4">
              <Button type="button" size="lg" onClick={() => cameraRef.current?.click()} className="h-16 justify-start gap-4 bg-[#4A2E1E] px-5 text-lg hover:bg-[#362116]">
                <Camera data-icon="inline-start" />
                {photoCopy.camera}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => galleryRef.current?.click()} className="h-16 justify-start gap-4 border-2 border-[#B4693A] px-5 text-lg text-[#4A2E1E] hover:bg-[#fff8f2]">
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
        {step === "saved" && (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle2 className="size-12 text-green-700" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-[#4A2E1E]">{photoCopy.saved}</h2>
            <Button type="button" size="lg" onClick={reset} className="h-12 bg-[#4A2E1E] hover:bg-[#362116]">
              Subir otra foto
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
