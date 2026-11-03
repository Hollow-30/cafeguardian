# CI/CD — Café Guardián (CAFG-138)

Pipeline en `.github/workflows/deploy-production.yml`.

## Grafo de jobs

```text
push / PR
   ├─ Run unit tests          ─┐
   └─ OWASP dependency check  ─┴─► Build and deploy production
                                    (solo en main, si ambos pasan)
```

## Jobs

| Job | Qué hace |
|---|---|
| `test` | `pnpm install` + `pnpm test` |
| `security` | `pnpm audit` (informativo) + **OWASP Dependency-Check** (falla si CVSS ≥ 7) |
| `deploy` | `vercel pull` → `build --prod` → `deploy --prebuilt --prod` |

## Artefactos

El reporte HTML de OWASP se sube como artifact `owasp-dependency-check` en Actions.

## Secrets requeridos (deploy)

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Opcional más adelante: `NVD_API_KEY` para acelerar consultas a la NVD.
