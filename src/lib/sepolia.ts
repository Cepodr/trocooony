const RPC = process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com"

async function rpc(method: string, params: any[]): Promise<any> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message || "RPC error")
  return d.result
}

export type VerifyResult =
  | { ok: true; valueWei: bigint; from: string }
  | { ok: false; reason: string }

export async function verifyPayment(txHash: string, treasury: string): Promise<VerifyResult> {
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: "Tx hash tidak valid." }
  if (!treasury) return { ok: false, reason: "Treasury belum dikonfigurasi." }

  let tx: any, receipt: any
  try {
    tx = await rpc("eth_getTransactionByHash", [txHash])
    receipt = await rpc("eth_getTransactionReceipt", [txHash])
  } catch (e: any) {
    return { ok: false, reason: e?.message || "Gagal query RPC." }
  }

  if (!tx) return { ok: false, reason: "Transaksi tidak ditemukan (mungkin belum tersebar)." }
  if (!receipt) return { ok: false, reason: "Transaksi belum dikonfirmasi. Coba lagi sebentar." }
  if (receipt.status !== "0x1") return { ok: false, reason: "Transaksi gagal on-chain." }
  if (!tx.to || tx.to.toLowerCase() !== treasury.toLowerCase()) return { ok: false, reason: "Penerima bukan treasury." }

  let valueWei: bigint
  try { valueWei = BigInt(tx.value) } catch { return { ok: false, reason: "Nilai transaksi tidak valid." } }
  if (valueWei <= 0n) return { ok: false, reason: "Nilai transaksi nol." }

  return { ok: true, valueWei, from: (tx.from || "").toLowerCase() }
}
