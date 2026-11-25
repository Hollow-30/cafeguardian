# Pagos, resync offline y consentimiento anónimo

## Decisiones
- Pagos híbridos: comprobante → `en_revision`; superadmin aprueba/rechaza; Premium solo al aprobar.
- Resync: diagnósticos `offline` se suben al volver online.
- Consentimiento: checkbox en PhotoPicker; se envía en upload y en resync.

## Pagos
- Tabla `pagos` + R2 para comprobantes.
- `POST/GET /api/pagos` (caficultor), `GET/POST /api/panel/pagos` (admin aprobar/rechazar → `activarPremiumPerfil`).
- UI: ManualPayment habla con API; outbox local si offline.

## Resync
- Cliente escucha `online`, sube pendientes con `uploadFotoRegistro`, marca `synced`.
- Montar sync en layout.

## Consentimiento
- Estado booleano en PhotoPicker → `consentimientoAnonimo` en upload.
