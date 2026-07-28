// Ready-made pipelines. A workflow sample has to carry the whole chain, not one
// prompt, so the objective and every step criteria arrive together.
export type WorkflowSampleStep = { id: string; role: string; agentId: string; instruction: string; criteria: string }
export type WorkflowSample = { objective: string; steps: WorkflowSampleStep[] }

export const WORKFLOW_SAMPLES: WorkflowSample[] = [
  {
    objective: "Create a launch announcement for Trocooony aimed at the Rialo community.",
    steps: [
      { id: "research", role: "Research", agentId: "sage", instruction: "Research the objective. List key facts, the target audience, and three distinct angles worth leading with.", criteria: "Lists at least five concrete facts, names the target audience, and gives three distinct angles. Invented events or announcements are a failure." },
      { id: "draft", role: "Draft", agentId: "scribe", instruction: "Using the research, write the announcement. Lead with the strongest angle.", criteria: "Fulfils the objective in continuous prose, visibly uses the research from the previous step, and contains no placeholder text." },
      { id: "review", role: "Review and finalize", agentId: "sage", instruction: "Review the draft for accuracy and impact without explaining your changes. Return only the improved final text, beginning with the first word of the deliverable.", criteria: "Outputs only the final improved version. Any commentary, critique list, or meta explanation is a failure." },
    ],
  },
  {
    objective: "Explain to a skeptical developer why verified agent labor needs escrow.",
    steps: [
      { id: "research", role: "Frame the argument", agentId: "sage", instruction: "List the strongest objections a skeptical developer would raise, and the best counter to each.", criteria: "Raises at least four distinct objections and answers each one specifically. A generic list of benefits is a failure." },
      { id: "draft", role: "Draft", agentId: "scribe", instruction: "Write the explainer, answering the objections in order of strength.", criteria: "Addresses every objection from the previous step, uses plain language, and avoids marketing superlatives." },
      { id: "review", role: "Tighten", agentId: "scribe", instruction: "Cut every sentence that does not carry an argument. Return only the resulting text, with no note about what you removed.", criteria: "Outputs only the final version and is shorter than the draft it received." },
    ],
  },
  {
    objective: "Produce a short technical brief on how native timers enforce deadlines without keepers.",
    steps: [
      { id: "research", role: "Gather mechanics", agentId: "sage", instruction: "Explain the mechanism step by step, and name what it replaces in a conventional chain.", criteria: "Describes the mechanism in ordered steps and names at least one thing it replaces. Fabricated technical claims are a failure." },
      { id: "draft", role: "Draft the brief", agentId: "coda", instruction: "Write the brief for an engineer who has never used this chain.", criteria: "Introduces every term before using it and states one concrete consequence for an application developer." },
      { id: "review", role: "Fact-check", agentId: "sage", instruction: "Remove any claim not supported by the research. Return only the resulting brief, with no note about what you removed.", criteria: "Outputs only the final brief and contains no claim absent from the earlier steps." },
    ],
  },
  {
    objective: "Write an onboarding guide for someone publishing their first agent on the marketplace.",
    steps: [
      { id: "research", role: "Map the journey", agentId: "sage", instruction: "List every decision a first-time publisher faces, in the order they face it.", criteria: "Lists at least six decisions in chronological order, with no step depending on knowledge introduced later." },
      { id: "draft", role: "Write the guide", agentId: "scribe", instruction: "Turn the map into a guide a beginner can follow without prior context.", criteria: "Covers every decision from the previous step and defines each term at first use." },
      { id: "review", role: "Final pass", agentId: "scribe", instruction: "Remove repetition. Return only the resulting guide, with no note about what you changed.", criteria: "Outputs only the final guide with no commentary and no duplicated instruction." },
    ],
  },
]
