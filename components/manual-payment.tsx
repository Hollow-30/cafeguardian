"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, FileUp, ShieldCheck } from "lucide-react"
import { paymentContent as copy } from "@/content/payments"
import { compressImage } from "@/lib/image/compress"
import { enqueuePayment, retryOutbox } from "@/lib/payments/outbox"
import { listPayments, savePayment } from "@/lib/payments/paymentsRepo"
import type { PaymentRequest } from "@/lib/payments/types"
import { validateReceipt } from "@/lib/payments/validate"

const steps = ["Instrucciones", "Comprobante", "Estado"]

export function ManualPayment() {
  const [step, setStep] = useState(0)
  const [method, setMethod] = useState<"yape" | "transfer">("yape")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState<PaymentRequest | null>(null)
  const [payments, setPayments] = useState<PaymentRequest[]>([])

  useEffect(() => {
    listPayments().then(setPayments).catch(() => setPayments([]))
  }, [step])

  useEffect(() => {
    const retry = () => { void retryOutbox(true, async () => undefined) }
    window.addEventListener("online", retry)
    return () => window.removeEventListener("online", retry)
  }, [])

  async function handleFile(selected: File | undefined) {
    if (!selected) return
    const validationError = validateReceipt(selected)
    if (validationError) {
      setError(validationError)
      return
    }
    setError("")
    setFile(selected.type.startsWith("image/") ? new File([await compressImage(selected)], selected.name, { type: selected.type }) : selected)
  }

  async function submit() {
    if (!file) return
    const payment = await savePayment({ amount: 12, method, receipt: file, receiptName: file.name })
    if (!navigator.onLine) enqueuePayment(payment)
    setSaved(payment)
    setStep(2)
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-coffee-950 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link href="/planes" className="w-fit rounded-lg py-2 text-sm font-bold text-coffee-800 underline underline-offset-4 hover:text-coffee-950">
            Volver a planes
          </Link>
          <h1 className="text-3xl font-bold">{copy.title}</h1>
          <p className="text-sm text-slate-600">{copy.privacy}</p>
        </header>
        <nav aria-label="Pasos" className="grid grid-cols-3 gap-2">
          {steps.map((label, index) => (
            <div
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={`rounded-xl border p-3 text-center text-sm font-bold ${
                index === step ? "border-coffee-700 bg-coffee-50 text-coffee-950" : "border-coffee-100 text-slate-500"
              }`}
            >
              {index + 1}. {label}
            </div>
          ))}
        </nav>
        {step === 0 && (
          <section className="flex flex-col gap-6 rounded-2xl border border-coffee-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{copy.amountLabel}</h2>
              <strong className="text-2xl">{copy.amount}</strong>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={method === "yape"}
                onClick={() => setMethod("yape")}
                className={`min-h-12 rounded-xl border p-4 text-left font-bold ${
                  method === "yape" ? "border-coffee-700 bg-coffee-50" : "border-coffee-100"
                }`}
              >
                {copy.yapeTitle}
                <span className="mt-1 block text-sm font-normal">{copy.yapeNumber}</span>
                <span className="mt-1 block text-sm font-normal">{copy.qrLabel}</span>
              </button>
              <button
                type="button"
                aria-pressed={method === "transfer"}
                onClick={() => setMethod("transfer")}
                className={`min-h-12 rounded-xl border p-4 text-left font-bold ${
                  method === "transfer" ? "border-coffee-700 bg-coffee-50" : "border-coffee-100"
                }`}
              >
                {copy.transferTitle}
                <span className="mt-1 block text-sm font-normal">{copy.bankData}</span>
              </button>
            </div>
            <button type="button" onClick={() => setStep(1)} className="min-h-12 rounded-xl bg-coffee-800 px-5 py-3 font-bold text-white hover:bg-coffee-900">
              {copy.next}
            </button>
          </section>
        )}
        {step === 1 && (
          <section className="flex flex-col gap-5 rounded-2xl border border-coffee-100 p-5 shadow-sm">
            <h2 className="text-xl font-bold">{copy.receiptTitle}</h2>
            <p className="text-slate-600">{copy.receiptHelp}</p>
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-coffee-700 bg-coffee-50/50 p-5 text-center font-bold">
              <FileUp aria-hidden="true" />
              {file?.name ?? copy.chooseFile}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </label>
            {error && <p role="alert" className="rounded-xl bg-coffee-50 p-3 text-coffee-800">{error}</p>}
            {file && (
              <button type="button" onClick={() => void submit()} className="min-h-12 rounded-xl bg-coffee-800 px-5 py-3 font-bold text-white hover:bg-coffee-900">
                {copy.send}
              </button>
            )}
            <p className="rounded-xl bg-coffee-50 p-3 text-sm text-coffee-950">{copy.offline}</p>
          </section>
        )}
        {step === 2 && saved && (
          <section className="flex flex-col gap-5 rounded-2xl border border-coffee-100 bg-coffee-50 p-5 shadow-sm">
            <CheckCircle2 className="text-coffee-700" aria-hidden="true" />
            <h2 className="text-2xl font-bold">Solicitud enviada</h2>
            <p>Código: <strong>{saved.reference}</strong></p>
            <p>Estado: <strong>Enviado</strong></p>
            <p className="rounded-xl bg-white p-3">{copy.offline}</p>
            <Link href="/mis-pagos" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-coffee-800 px-5 py-3 text-center font-bold text-white hover:bg-coffee-900">
              {copy.myPayments}
            </Link>
          </section>
        )}
        <section className="flex items-center gap-2 text-sm text-slate-600">
          <ShieldCheck aria-hidden="true" />
          {copy.privacy}
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{copy.myPayments}</h2>
          {payments.length === 0 ? (
            <p className="text-slate-600">{copy.empty}</p>
          ) : (
            payments.map((payment) => (
              <article key={payment.id} className="rounded-xl border border-coffee-100 p-4">
                <div className="flex justify-between gap-3">
                  <strong>{payment.reference}</strong>
                  <span>{payment.status}</span>
                </div>
                <p className="text-sm text-slate-600">{payment.receiptName}</p>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
