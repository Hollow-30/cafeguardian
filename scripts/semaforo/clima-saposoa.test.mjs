// Pruebas con datos inventados. Correr: node --test scripts/semaforo/

import test from 'node:test'
import assert from 'node:assert/strict'
import { clasificarHora, resumirDias } from './clima-saposoa.mjs'

const hora = (h, temp, humedad, lluvia = 0) => ({
  tiempo: `2026-11-01T${String(h).padStart(2, '0')}:00`,
  temp,
  humedad,
  lluvia,
})

test('hora favorable: 23 °C, 95 % de humedad, sin lluvia', () => {
  const c = clasificarHora(hora(3, 23, 95))
  assert.equal(c.temp, true)
  assert.equal(c.humedad, true)
  assert.equal(c.mojada, true)
  assert.equal(c.favorable, true)
})

test('hora fría: 18 °C con humedad alta no es favorable', () => {
  const c = clasificarHora(hora(3, 18, 95))
  assert.equal(c.temp, false)
  assert.equal(c.favorable, false)
})

test('racha cortada: 3 horas favorables, una fría y otras 3 dan racha de 3', () => {
  const horas = [
    hora(0, 23, 95), hora(1, 23, 95), hora(2, 23, 95),
    hora(3, 18, 95),
    hora(4, 23, 95), hora(5, 23, 95), hora(6, 23, 95),
  ]
  const [dia] = resumirDias(horas)
  assert.equal(dia.horasFavorables, 6)
  assert.equal(dia.rachaMaxima, 3)
  assert.equal(dia.diaFavorable, false)
})
