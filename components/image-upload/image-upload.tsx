"use client"

import { ChangeEvent, useState } from "react"
import { CheckCircle2, ImagePlus, Loader2, UploadCloud, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const MAX_SIZE = 8 * 1024 * 1024
const BUCKET = "coffee-images"

export function ImageUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) return
    setMessage(""); setError(""); setUploadedUrl("")
    if (!selected.type.startsWith("image/")) { setFile(null); setPreview(""); setError("Selecciona una imagen JPG, PNG o WEBP."); return }
    if (selected.size > MAX_SIZE) { setFile(null); setPreview(""); setError("La imagen debe pesar menos de 8 MB."); return }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  function clearFile() {
    setFile(null); setPreview(""); setUploadedUrl(""); setMessage(""); setError("")
  }

  async function uploadImage() {
    if (!file) return
    setUploading(true); setError(""); setMessage("")
    const supabase = createClient()
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `observations/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type })
    if (uploadError) {
      setError(uploadError.message.includes("Bucket not found") ? "No se encontró el depósito de imágenes. Crea el bucket privado «coffee-images» en Supabase." : uploadError.message)
      setUploading(false); return
    }
    const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (urlError) { setError(urlError.message); setUploading(false); return }
    setUploadedUrl(data.signedUrl); setMessage("Imagen guardada correctamente. Estará disponible durante una hora para revisarla."); setUploading(false)
  }

  return <section className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-[0_18px_45px_-32px_rgba(6,78,59,0.6)] sm:p-8">
    <div className="flex items-start gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><ImagePlus className="size-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Nueva observación</p><h1 className="mt-1 text-2xl font-semibold text-emerald-950">Sube una foto de tu cafetal</h1><p className="mt-2 text-sm leading-6 text-slate-500">La imagen se guardará de forma segura para ayudarte a revisar el estado de tus plantas.</p></div></div>
    <label className="mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} className="sr-only" />{preview ? <div className="relative"><img src={preview} alt="Vista previa de la foto seleccionada" className="max-h-56 rounded-xl object-cover" /><span className="mt-3 block text-xs font-medium text-emerald-800">Haz clic para cambiar la imagen</span></div> : <><UploadCloud className="size-9 text-emerald-700" /><span className="mt-3 text-sm font-semibold text-emerald-950">Selecciona una imagen</span><span className="mt-1 text-xs text-slate-500">JPG, PNG o WEBP · máximo 8 MB</span></>}</label>
    {file && !uploadedUrl && <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"><p className="truncate text-sm text-slate-700">{file.name}</p><button type="button" onClick={clearFile} aria-label="Quitar imagen" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-700"><X className="size-4" /></button></div>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="size-4 shrink-0" />{message}</p>}
    <button type="button" disabled={!file || uploading || Boolean(uploadedUrl)} onClick={uploadImage} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">{uploading ? <><Loader2 className="size-4 animate-spin" />Guardando imagen...</> : uploadedUrl ? "Imagen guardada" : "Guardar imagen"}</button>
  </section>
}
