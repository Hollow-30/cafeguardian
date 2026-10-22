# Despliegue de producción en Vercel

El workflow `.github/workflows/deploy-production.yml` publica en producción cada vez que se suben cambios a `main`. También se puede iniciar manualmente desde la pestaña **Actions** de GitHub.

## Configuración inicial

1. Crea o importa el proyecto en Vercel y confirma que su comando de instalación y versión de Node coincidan con el proyecto.
2. En Vercel, crea un token en **Account Settings → Tokens**.
3. Obtén el ID del equipo (o cuenta) y el ID del proyecto desde `.vercel/project.json`, después de enlazar el proyecto con `vercel link`.
4. En GitHub, abre **Settings → Secrets and variables → Actions → New repository secret** y añade:

   - `VERCEL_TOKEN`: token de acceso de Vercel.
   - `VERCEL_ORG_ID`: ID de equipo o cuenta de Vercel.
   - `VERCEL_PROJECT_ID`: ID del proyecto de Vercel.

5. Sube los cambios a la rama `main`. El estado del despliegue aparecerá en **Actions**; si falla, abre el run para ver el paso y el error.

El workflow usa `vercel pull`, `vercel build --prod` y `vercel deploy --prebuilt --prod`. No requiere guardar `.vercel` ni credenciales en el repositorio.
