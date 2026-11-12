import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest { return { name: "Café Guardián", short_name: "Café Guardián", description: "Diagnóstico y alerta temprana para caficultores", start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#4A2E1E", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] } }
