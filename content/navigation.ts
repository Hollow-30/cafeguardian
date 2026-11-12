export const navigationContent = {
  label: "Navegación principal",
  links: [{ href: "/", label: "Inicio", icon: "home" }, { href: "/historial", label: "Historial", icon: "history" }, { href: "/panel", label: "Panel del equipo", icon: "team" }],
  openMenu: "Abrir menú de usuario",
  account: "Mi cuenta",
  subscription: "Suscripción",
  help: "Ayuda",
  menuLinks: [
    { href: "/account", label: "Mi cuenta", icon: "account" },
    { href: "/planes", label: "Planes", icon: "plans" },
    { href: "/mis-pagos", label: "Mis pagos", icon: "payments" },
    { href: "/contacto", label: "Contacto", icon: "contact" },
    { href: "/soporte", label: "Soporte", icon: "support" },
    { href: "/ayuda", label: "Centro de ayuda", icon: "help" },
  ],
  signOut: "Cerrar sesión",
  signingOut: "Cerrando sesión...",
  signOutError: "No se pudo cerrar la sesión. Inténtalo nuevamente.",
} as const
