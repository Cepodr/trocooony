export const MIN_TASKS = 5
export const PRIOR_FAIL = 0.25
export const PRIOR_WEIGHT = 5
export const LOAD_FACTOR = 0.3
export const MAX_RATE = 0.24
export const COVERAGE = 0.3
export const EFFORT_FEE = 0.3
export const MAX_POOL_SHARE = 0.1

export type Leg = { price: number; tasks: number; passRate: number | null }

export function credibilityOf(tasks: number): number {
  return tasks / (tasks + PRIOR_WEIGHT)
}

export function expectedFailure(tasks: number, passRate: number | null): number {
  const observed = tasks > 0 && passRate != null ? 1 - passRate / 100 : PRIOR_FAIL
  const c = credibilityOf(tasks)
  return c * observed + (1 - c) * PRIOR_FAIL
}

export function singleTaskPolicy(reward: number, tasks: number, passRate: number | null, poolLoading: number) {
  const expectedLoss = expectedFailure(tasks, passRate)
  const rawRate = expectedLoss * LOAD_FACTOR * poolLoading
  const rate = Math.min(MAX_RATE, Math.max(0.01, rawRate))
  return {
    rawRate,
    rate,
    premium: Math.max(1, Math.round(reward * rate)),
    payout: Math.max(1, Math.round(reward * COVERAGE)),
    insurable: tasks >= MIN_TASKS && rawRate <= MAX_RATE,
  }
}

export function chainRisk(legs: Leg[]) {
  let survive = 1
  let spent = 0
  let expectedLoss = 0
  let maxLoss = 0
  for (const leg of legs) {
    const p = expectedFailure(leg.tasks, leg.passRate)
    const loss = spent + Math.round(leg.price * EFFORT_FEE)
    expectedLoss += survive * p * loss
    if (loss > maxLoss) maxLoss = loss
    survive *= 1 - p
    spent += leg.price
  }
  return { expectedLoss, maxLoss, failChance: 1 - survive }
}

export function exposureCap(poolBalance: number): number {
  return Math.max(0, Math.floor(poolBalance * MAX_POOL_SHARE))
}

export function chainPolicy(legs: Leg[], poolLoading: number, poolBalance: number) {
  const risk = chainRisk(legs)
  const total = legs.reduce((sum, l) => sum + l.price, 0)
  const ceiling = Math.max(1, Math.round(total * MAX_RATE))
  const premium = Math.max(1, Math.round(risk.expectedLoss * poolLoading))
  const cap = exposureCap(poolBalance)
  const payout = Math.max(0, Math.min(risk.maxLoss, cap, poolBalance))
  const enoughHistory = legs.every((l) => l.tasks >= MIN_TASKS)
  const withinPool = risk.maxLoss <= cap
  const affordable = premium <= ceiling
  const reason = !enoughHistory
    ? "Every agent in this chain needs " + MIN_TASKS + " settled tasks before the pipeline can be insured."
    : !withinPool
    ? "The worst case loss of " + risk.maxLoss + " TRLO is larger than the " + cap + " TRLO a single policy may draw from the pool."
    : !affordable
    ? "This chain fails too often to insure. The premium would cost more than the protection is worth."
    : ""
  return { ...risk, total, premium, payout, cap, ceiling, enoughHistory, withinPool, affordable, insurable: enoughHistory && withinPool && affordable && payout > 0, reason }
}
