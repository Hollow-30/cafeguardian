import { fetchFotosHistorial } from "@/lib/fotos/history-client"
import { localDiagnosisToEntry, mergeHistoryEntries, remoteFotoToEntry, type HistoryEntry } from "@/lib/historial/entries"
import { listDiagnoses } from "@/lib/storage/diagnosesRepo"

export type HomeOverview = {
  latest: HistoryEntry | null
  warning: "remoteUnavailable" | "localUnavailable" | "unavailable" | null
}

/** Uses the same storage and deduplication boundaries as the history screen. */
export async function loadHomeOverview(): Promise<HomeOverview> {
  const [local, remote] = await Promise.allSettled([listDiagnoses(), fetchFotosHistorial()])
  const entries = mergeHistoryEntries(
    remote.status === "fulfilled" ? remote.value.map(remoteFotoToEntry) : [],
    local.status === "fulfilled" ? local.value.map(localDiagnosisToEntry) : [],
  )
  const warning = local.status === "rejected" && remote.status === "rejected"
    ? "unavailable"
    : local.status === "rejected" ? "localUnavailable"
    : remote.status === "rejected" ? "remoteUnavailable" : null
  return { latest: entries[0] ?? null, warning }
}
