import Link from "next/link"
import { ChevronLeft, Sprout } from "lucide-react"
import { ImageUpload } from "@/components/image-upload/image-upload"

export default function UploadImagesPage() {
  return <main className="min-h-screen bg-[#f7faf8] text-slate-900"><header className="border-b border-emerald-950/10 bg-white"><div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4 sm:px-8"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-800 text-white"><Sprout className="size-5" /></div><div><p className="font-bold tracking-tight text-emerald-950">Café Guardián</p><p className="text-xs text-slate-500">Panel del Caficultor</p></div></div></header><div className="mx-auto max-w-3xl px-5 py-8 sm:px-8"><Link href="/" className="mb-6 flex w-fit items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-800"><ChevronLeft className="size-4" />Volver al panel</Link><ImageUpload /></div></main>
}
