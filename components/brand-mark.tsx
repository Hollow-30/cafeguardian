import Link from "next/link"
import { Sprout } from "lucide-react"
import { brand } from "@/content/brand"

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" aria-label={brand.homeLabel} className={`brand-mark ${light ? "brand-mark-light" : ""}`}>
      <span className="brand-symbol"><Sprout size={25} strokeWidth={1.7} aria-hidden="true" /></span>
      <span>{brand.name}<small>{brand.tagline}</small></span>
    </Link>
  )
}
