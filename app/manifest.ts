import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest { return { name: "Café Guardián", short_name: "Café Guardián", description: "Diagnóstico y alerta temprana para caficultores", start_url: "/", display: "standalone", background_color: "#f8fafc", theme_color: "#064e3b", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] } }
