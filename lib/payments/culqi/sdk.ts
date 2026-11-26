"use client"

/** S/12.00 en céntimos. */
const CULQI_AMOUNT_CENTS = 1200
/** SDK oficial Culqi Checkout (mismo que Web-JK). */
const CULQI_SCRIPT_URL = "https://js.culqi.com/checkout-js"

type CulqiToken = { id: string; email?: string }
type CulqiError = { user_message?: string; merchant_message?: string }

type CulqiInstance = {
  token?: CulqiToken | null
  error?: CulqiError | null
  open: () => void
  close: () => void
  culqi: (() => void) | null
}

type CulqiCheckoutConfig = {
  settings: { title: string; currency: string; amount: number }
  client?: { email?: string }
  options?: {
    lang?: string
    installments?: boolean
    modal?: boolean
    paymentMethods?: Record<string, boolean>
    paymentMethodsSort?: string[]
  }
  appearance?: {
    theme?: string
    hiddenCulqiLogo?: boolean
    menuType?: string
    buttonCardPayText?: string
  }
}

declare global {
  interface Window {
    CulqiCheckout?: new (publicKey: string, config: CulqiCheckoutConfig) => CulqiInstance
  }
}

let loadingPromise: Promise<void> | null = null

export function hasCulqiPublicKey() {
  return Boolean(process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY?.trim())
}

export function loadCulqiSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Culqi solo corre en el navegador."))
  }
  if (window.CulqiCheckout) return Promise.resolve()
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    const done = () => {
      const start = Date.now()
      const wait = () => {
        if (window.CulqiCheckout) {
          resolve()
          return
        }
        if (Date.now() - start > 8000) {
          loadingPromise = null
          reject(new Error("Culqi Checkout no quedó disponible."))
          return
        }
        window.setTimeout(wait, 50)
      }
      wait()
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CULQI_SCRIPT_URL}"]`)
    if (existing) {
      if (window.CulqiCheckout) {
        resolve()
        return
      }
      existing.addEventListener("load", done)
      existing.addEventListener("error", () => {
        loadingPromise = null
        reject(new Error("No se pudo cargar Culqi Checkout."))
      })
      return
    }

    const script = document.createElement("script")
    script.src = CULQI_SCRIPT_URL
    script.async = true
    script.onload = done
    script.onerror = () => {
      loadingPromise = null
      reject(new Error("No se pudo cargar Culqi Checkout."))
    }
    document.body.appendChild(script)
  })

  return loadingPromise
}

/**
 * Abre el SDK oficial CulqiCheckout (js.culqi.com/checkout-js).
 * Resuelve con token + email cuando el usuario completa el pago.
 */
export async function openCulqiCheckout(input?: {
  title?: string
  amountCents?: number
  email?: string
}): Promise<{ id: string; email?: string }> {
  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY?.trim()
  if (!publicKey) throw new Error("Falta NEXT_PUBLIC_CULQI_PUBLIC_KEY.")

  await loadCulqiSdk()
  if (!window.CulqiCheckout) throw new Error("Culqi SDK no disponible.")

  const amount = input?.amountCents ?? CULQI_AMOUNT_CENTS
  const paymentMethods = {
    tarjeta: true,
    yape: true,
    billetera: false,
    bancaMovil: false,
    agente: false,
    cuotealo: false,
  }

  const config: CulqiCheckoutConfig = {
    settings: {
      title: (input?.title ?? "Cafe Guardian Premium").slice(0, 50),
      currency: "PEN",
      amount,
    },
    client: input?.email ? { email: input.email.trim().toLowerCase() } : undefined,
    options: {
      lang: "es",
      installments: false,
      modal: true,
      paymentMethods,
      paymentMethodsSort: Object.keys(paymentMethods),
    },
    appearance: {
      theme: "default",
      hiddenCulqiLogo: false,
      menuType: "sidebarLite",
      buttonCardPayText: "Pagar S/12",
    },
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    try {
      const Culqi = new window.CulqiCheckout!(publicKey, config)
      Culqi.culqi = () => {
        if (Culqi.token?.id) {
          const token = { id: Culqi.token.id, email: Culqi.token.email }
          try {
            Culqi.close()
          } catch {
            // ignore
          }
          settle(() => resolve(token))
          return
        }
        if (Culqi.error) {
          settle(() =>
            reject(
              new Error(
                Culqi.error?.user_message ||
                  Culqi.error?.merchant_message ||
                  "No se pudo completar el pago con Culqi.",
              ),
            ),
          )
        }
      }
      Culqi.open()
    } catch (cause) {
      settle(() =>
        reject(cause instanceof Error ? cause : new Error("No se pudo abrir Culqi Checkout.")),
      )
    }
  })
}
