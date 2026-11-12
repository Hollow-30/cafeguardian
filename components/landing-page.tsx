import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowRight, Camera, Check, ChevronDown, HeartHandshake, History, MapPin, ScanLine, ShieldCheck, Wifi, WifiOff } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { brand } from "@/content/brand"
import { landingContent as copy } from "@/content/landing"

const icons = { camera: Camera, history: History, heart: HeartHandshake, scan: ScanLine }

export function LandingPage() {
  return (
    <div className="landing">
      <a href="#contenido" className="skip-link">{brand.skip}</a>
      <header className="landing-header">
        <div className="cg-container landing-nav">
          <BrandMark />
          <nav aria-label={copy.navigation} className="landing-nav-links">
            {copy.links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
          </nav>
          <div className="landing-nav-actions">
            <Link href="/login" className="landing-login">{copy.login}</Link>
            <Link href="/registro" className="cg-button cg-button-small">{copy.signup}<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </header>

      <main id="contenido">
        <section className="cg-container landing-hero" aria-labelledby="hero-title">
          <div className="hero-copy cg-enter">
            <p className="cg-kicker"><span className="kicker-line" />{copy.hero.eyebrow}</p>
            <h1 id="hero-title" className="cg-display">{copy.hero.title}{" "}<br /><em>{copy.hero.accent}</em></h1>
            <p className="hero-description">{copy.hero.description}</p>
            <div className="hero-actions">
              <Link href="/registro" className="cg-button">{copy.signup}<ArrowRight size={19} aria-hidden="true" /></Link>
              <a href="#como-funciona" className="cg-text-link">{copy.discover}<ArrowDown size={17} aria-hidden="true" /></a>
            </div>
            <p className="hero-note"><ShieldCheck size={17} aria-hidden="true" />{copy.hero.note}</p>
          </div>
          <div className="hero-visual cg-enter cg-enter-delay">
            <div className="hero-photo">
              <Image src="/images/caficultor.jpg" alt={copy.hero.imageAlt} width={480} height={270} loading="eager" fetchPriority="high" sizes="(max-width: 760px) 100vw, 50vw" />
              <div className="hero-photo-shade" />
              <p className="hero-image-caption">{copy.hero.imageCaption}</p>
            </div>
            <div className="hero-floating-card"><span className="feature-icon"><ScanLine aria-hidden="true" /></span><div><strong>{copy.hero.cardTitle}</strong><p>{copy.hero.cardText}</p></div></div>
            <div className="hero-location"><MapPin size={15} aria-hidden="true" />{copy.hero.location}</div>
          </div>
        </section>

        <div className="landing-values">
          <div className="cg-container values-grid">
            {copy.values.map((item) => { const Icon = icons[item.icon]; return <div className="value-item" key={item.title}><Icon size={26} strokeWidth={1.5} aria-hidden="true" /><div><h2>{item.title}</h2><p>{item.description}</p></div></div> })}
          </div>
        </div>

        <section id="como-funciona" className="cg-container landing-section" aria-labelledby="steps-title">
          <div className="section-heading"><p className="cg-kicker">{copy.steps.eyebrow}</p><h2 id="steps-title" className="cg-display">{copy.steps.title}</h2><p>{copy.steps.description}</p></div>
          <div className="steps-grid">
            {copy.steps.items.map((step) => { const Icon = icons[step.icon]; return <article className="step-card" key={step.number}><div className="step-top"><span className="feature-icon"><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></span><span className="step-number" aria-hidden="true">{step.number}</span></div><h3>{step.title}</h3><p>{step.description}</p></article> })}
          </div>
        </section>

        <section id="tu-companero" className="product-section" aria-labelledby="product-title">
          <div className="cg-container product-grid">
            <div className="product-stage">
              <div className="phone-preview" aria-labelledby="preview-title">
                <div className="phone-notch" aria-hidden="true" />
                <div className="preview-top"><span>{brand.name}</span><span className="demo-badge">{copy.product.demo}</span></div>
                <p id="preview-title" className="preview-heading">{copy.product.previewTitle}</p>
                <Image src="/images/hojas-referencia.jpg" alt={copy.product.previewPhotoAlt} width={675} height={900} sizes="280px" className="preview-image" />
                <div className="preview-result"><ScanLine size={20} aria-hidden="true" /><strong>{copy.product.previewLabel}</strong></div>
                <p className="preview-description">{copy.product.previewDescription}</p>
                <div className="preview-save"><History size={17} aria-hidden="true" />{copy.product.previewSave}</div>
                <p className="preview-disclaimer">{copy.product.previewNote}</p>
              </div>
              <p className="product-stage-caption">{copy.product.previewFooter}</p>
            </div>
            <div className="product-copy"><p className="cg-kicker">{copy.product.eyebrow}</p><h2 id="product-title" className="cg-display">{copy.product.title}</h2><p className="section-description">{copy.product.description}</p><ul className="product-points">{copy.product.points.map((point) => <li key={point}><span><Check size={16} aria-hidden="true" /></span>{point}</li>)}</ul><p className="product-disclaimer"><ShieldCheck size={20} aria-hidden="true" />{copy.product.disclaimer}</p><Link href="/registro" className="cg-text-link">{copy.signup}<ArrowRight size={18} aria-hidden="true" /></Link></div>
          </div>
        </section>

        <section className="cg-container landing-section connection-grid" aria-labelledby="connection-title">
          <div><p className="cg-kicker">{copy.connection.eyebrow}</p><h2 id="connection-title" className="cg-display">{copy.connection.title}</h2><p className="section-description">{copy.connection.description}</p><p className="connection-note">{copy.connection.note}</p></div>
          <div className="connection-cards"><article><WifiOff size={26} strokeWidth={1.5} aria-hidden="true" /><div><h3>{copy.connection.localTitle}</h3><p>{copy.connection.localDescription}</p></div></article><article><Wifi size={26} strokeWidth={1.5} aria-hidden="true" /><div><h3>{copy.connection.onlineTitle}</h3><p>{copy.connection.onlineDescription}</p></div></article></div>
        </section>

        <section id="preguntas" className="faq-section" aria-labelledby="faq-title"><div className="cg-container faq-grid"><div><p className="cg-kicker">{copy.questions.eyebrow}</p><h2 id="faq-title" className="cg-display">{copy.questions.title}</h2></div><div className="faq-list">{copy.questions.items.map((item) => <details key={item.question}><summary>{item.question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div></div></section>

        <section className="cg-container closing-wrap" aria-labelledby="closing-title"><div className="closing-banner"><Image src="/images/granos-cafe.jpg" alt={copy.closing.imageAlt} fill sizes="(max-width: 1200px) 100vw, 1120px" className="closing-image" /><div className="closing-shade" /><div className="closing-copy"><p className="cg-kicker">{copy.closing.eyebrow}</p><h2 id="closing-title" className="cg-display">{copy.closing.title}</h2><p>{copy.closing.description}</p><Link href="/registro" className="cg-button cg-button-light">{copy.signup}<ArrowRight size={18} aria-hidden="true" /></Link></div></div></section>
      </main>

      <footer className="landing-footer"><div className="cg-container"><div className="footer-top"><div><BrandMark /><p>{copy.footer.description}</p></div><nav aria-label={copy.navigation}>{copy.footer.links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></div><div className="footer-bottom"><span>{copy.footer.region}</span><p>{copy.footer.note}</p></div></div></footer>
    </div>
  )
}
