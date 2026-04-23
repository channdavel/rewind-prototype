/* ── tape scenes ── */
export const SCENES = [
  { time: 0,  duration: 8,  type: "visual",   text: "Interior of Dalton's Hardware. Fluorescent lights buzz. A few customers browse the aisles. The camera is mounted high in the corner, wide angle, slightly fish-eyed.", clue: null },
  { time: 8,  duration: 10, type: "visual",   text: "Two men stand behind the counter. The older one \u2014 heavyset, flannel shirt \u2014 is RAY DALTON. The younger one in a polo is NEIL FARNER. They're talking low, but their body language is tense.", clue: null },
  { time: 18, duration: 12, type: "dialogue", text: "Ray and Neil's voices are partially drowned out by store noise. You catch fragments:\n\nRAY: \"...doesn't add up, Neil. The numbers don't...\"\nNEIL: \"...I'm handling it, just let me...\"\nRAY: \"...you're handling it? Like you handled the...\"", clue: { id: "argument", label: "Neil/Ray argument", category: "Dialogue", desc: "Neil and Ray arguing about finances behind the counter" } },
  { time: 30, duration: 10, type: "dialogue", text: "The argument continues. A customer approaches and they go quiet for a moment. As the customer walks away:\n\nNEIL: \"...look, the policy takes care of everything. Just trust me on this.\"\nRAY: \"What policy? I didn't agree to any\u2014\"\nNEIL: \"Just drop it, Ray.\"", clue: { id: "policy", label: "'The policy' dialogue", category: "Dialogue", desc: "Neil mentions 'the policy' \u2014 Ray seems unaware of it" } },
  { time: 40, duration: 8,  type: "visual",   text: "Neil steps away from the counter. As he moves, the camera catches a piece of paper on the countertop. For a few seconds it's partially readable \u2014 a printed form with a header that looks like \"LIFE INS\u2014\" before Neil's arm blocks it. Then it's gone.", clue: { id: "document", label: "Insurance document", category: "Object", desc: "Paper on counter with partial header reading 'LIFE INS\u2014'" } },
  { time: 48, duration: 6,  type: "visual",   text: "A quiet stretch. Ray restocks a shelf. Neil is in the back room. The store radio plays softly.", clue: null },
  { time: 54, duration: 12, type: "visual",   text: "The front door opens. A young man in a hoodie enters \u2014 early 20s, jittery, hands in pockets. This is Thomas WILDS. He walks straight to Ray at the shelf.", clue: null },
  { time: 66, duration: 12, type: "dialogue", text: "Thomas: \"Uncle Ray, I just need a little \u2014 just enough to get through the week.\"\nRAY: \"Thomas, I told you. I'm not doing this anymore.\"\nTOMMY: \"Come on, it's not like\u2014\"\nRAY: \"No. Get yourself together, kid.\"\n\nTommy stares at him, then turns and walks out without another word.", clue: { id: "Thomas", label: "Thomas asks for money", category: "Person", desc: "Thomas Wilds asks Ray for money, gets turned down, leaves angry" } },
  { time: 78, duration: 8,  type: "visual",   text: "The store is quiet again. Ray watches the door for a long moment after Thomas leaves. Neil comes back from the back room.\n\nNEIL: \"What was that about?\"\nRAY: \"Nothing. Family stuff.\"\n\nThe tape cuts to static.", clue: null },
  { time: 86, duration: 6,  type: "visual",   text: "\u2592\u2592\u2592 STATIC \u2592\u2592\u2592\n\nThe tape ends. Tracking lines scroll across the screen.", clue: null }
];

export const TOTAL_DURATION = SCENES[SCENES.length - 1].time + SCENES[SCENES.length - 1].duration;

/* ── evidence connections (master solution graph) ── */
export const EVIDENCE_CONNECTIONS = [
  { id: "c1", label: "Neil \u2192 financial conflict with Ray", needs: ["argument", "policy"], desc: "Neil and Ray had a financial dispute" },
  { id: "c2", label: "Neil \u2192 insurance policy", needs: ["policy", "document"], desc: "Neil had an insurance policy Ray didn't know about" },
  { id: "c3", label: "Thomas \u2192 needed money", needs: ["Thomas"], desc: "Thomas was desperate for cash (red herring)" },
  { id: "c4", label: "Thomas \u2192 at store before murder", needs: ["Thomas"], desc: "Thomas was seen at the store (red herring)" }
];

export const REQUIRED_FOR_INTERROGATION = ["c1", "c2"];

/* ── interrogation: sequential dialogue steps ── */
/*
  Each step shows a prompt, then 2-3 choices.
  Each choice has a trust effect and leads to the next step (or ends).
  "requiresEvidence" means the option is greyed out if the player didn't tag that clue.
*/
export const INTERROGATION_STEPS = [
  {
    id: "step1",
    prompt: "The supervisor sits across from Neil. The tape recorder clicks on. Neil looks uncomfortable but composed.\n\nSUPERVISOR: \"Thanks for coming in, Neil. We just want to ask a few questions about Ray Dalton.\"\n\nNEIL: \"Sure. It was a long time ago, but... sure.\"",
    choices: [
      { id: "1a", text: "Start easy \u2014 ask about his relationship with Ray", trustChange: 0, next: "step2_friendly",
        response: "NEIL: \"Ray was my partner. We built that store together from nothing. I miss him every day.\"\n\nHe sounds sincere. Or practiced." },
      { id: "1b", text: "Go straight for the argument on the tape", trustChange: 5, next: "step2_aggressive", requiresEvidence: "argument",
        response: "NEIL: \"I... where did you get that? That was just a business disagreement. Inventory costs, that's all.\"\n\nHe wasn't expecting you to have footage. Good." },
      { id: "1c", text: "Ask vague questions about 'that night'", trustChange: -8, next: "step2_weak",
        response: "NEIL: \"What about it? I was home. I told the police that twenty years ago.\"\n\nThe supervisor glances at the mirror. That question gave Neil nothing to react to." }
    ]
  },
  {
    id: "step2_friendly",
    prompt: "Neil has relaxed slightly. He thinks this is routine.",
    choices: [
      { id: "2a", text: "Ask what 'the policy' means", trustChange: 10, next: "step3_policy", requiresEvidence: "policy",
        response: "NEIL: \"Policy? I don't... what policy?\"\n\nHis hand twitches. He's lying." },
      { id: "2b", text: "Ask about Thomas's visit to the store", trustChange: 0, next: "step3_tommy", requiresEvidence: "Thomas",
        response: "NEIL: \"Thomas was always coming around asking Ray for money. Kid had problems. That's got nothing to do with me.\"\n\nDeflecting to Thomas. Interesting." },
      { id: "2c", text: "Ask where he was the night Ray died", trustChange: 0, next: "step3_alibi",
        response: "NEIL: \"Home. All evening. Same thing I told the cops back then.\"\n\nThe same rehearsed answer from the original case file." }
    ]
  },
  {
    id: "step2_aggressive",
    prompt: "Neil is rattled. He's gripping the edge of the table.",
    choices: [
      { id: "2d", text: "Press him on the insurance document", trustChange: 10, next: "step3_insurance", requiresEvidence: "document",
        response: "NEIL: \"That's a standard business... it's just a...\"\n\nSUPERVISOR: \"A life insurance policy on your partner, Neil. Taken out eight months before he died.\"\n\nNeil goes pale." },
      { id: "2e", text: "Ask what 'the policy' means", trustChange: 8, next: "step3_policy", requiresEvidence: "policy",
        response: "NEIL: \"I don't know what you're talking about.\"\n\nBut his voice cracked." },
      { id: "2f", text: "Back off and ask about his alibi", trustChange: -5, next: "step3_alibi",
        response: "NEIL visibly relaxes. \"I was home. Like I said.\"\n\nYou had momentum and lost it. The supervisor notices." }
    ]
  },
  {
    id: "step2_weak",
    prompt: "Neil looks bored. The supervisor looks annoyed.",
    choices: [
      { id: "2g", text: "Try to recover \u2014 bring up the argument", trustChange: 3, next: "step3_policy", requiresEvidence: "argument",
        response: "NEIL: \"We argued sometimes. So what? Business partners argue.\"\n\nBetter, but you already lost the element of surprise." },
      { id: "2h", text: "Ask another vague question about 'suspicious activity'", trustChange: -12, next: "step3_dead",
        response: "NEIL: \"Suspicious? What does that even mean?\"\n\nSUPERVISOR shoots you a look through the mirror. Two bad questions in a row." }
    ]
  },
  {
    id: "step3_policy",
    prompt: "Neil is getting defensive. He keeps glancing at the door.",
    choices: [
      { id: "3a", text: "Show him the insurance document evidence", trustChange: 10, next: "step_final", requiresEvidence: "document",
        response: "SUPERVISOR slides a note across the table describing the document.\n\nNEIL: \"That's... that was Ray's idea. He wanted to protect the business.\"\n\nSUPERVISOR: \"The policy was in your name, Neil. Not the business.\"\n\nSilence." },
      { id: "3b", text: "Accuse him now", trustChange: 0, next: "step_accuse_early",
        response: "" }
    ]
  },
  {
    id: "step3_insurance",
    prompt: "Neil is sweating. The supervisor leans forward.",
    choices: [
      { id: "3c", text: "Ask him directly: did you kill Ray for the money?", trustChange: 0, next: "step_final",
        response: "NEIL: \"No! I didn't... I would never...\"\n\nBut he can't look anyone in the eye. The evidence is piling up." },
      { id: "3d", text: "Let the silence hang. Then accuse.", trustChange: 0, next: "step_accuse_strong",
        response: "" }
    ]
  },
  {
    id: "step3_tommy",
    prompt: "Neil seems relieved you're asking about Thomas instead of him.",
    choices: [
      { id: "3e", text: "Redirect \u2014 ask about the insurance document", trustChange: 8, next: "step_final", requiresEvidence: "document",
        response: "NEIL's relief vanishes. \"Where did you... that's private business paperwork.\"\n\nSUPERVISOR: \"Life insurance on your partner isn't 'business paperwork,' Neil.\"" },
      { id: "3f", text: "Keep asking about Thomas", trustChange: -5, next: "step3_dead",
        response: "NEIL: \"Thomas had nothing to do with anything. He's just a kid with problems.\"\n\nYou're going down a dead end. The supervisor is losing patience." }
    ]
  },
  {
    id: "step3_alibi",
    prompt: "Neil repeats his alibi. No new information.",
    choices: [
      { id: "3g", text: "Push with the insurance document", trustChange: 8, next: "step_final", requiresEvidence: "document",
        response: "You change tack. SUPERVISOR slides the document description across.\n\nNEIL: \"I... that was... standard.\"\n\nIt clearly wasn't." },
      { id: "3h", text: "End the interrogation without accusing", trustChange: -10, next: "step_end_nothing",
        response: "" }
    ]
  },
  {
    id: "step3_dead",
    prompt: "The interrogation has stalled. The supervisor stands up.",
    choices: [
      { id: "3i", text: "Make a last attempt \u2014 mention the insurance", trustChange: 5, next: "step_final", requiresEvidence: "document",
        response: "NEIL flinches at the mention of insurance. There's still something here.\n\nSUPERVISOR sits back down." },
      { id: "3j", text: "Give up on this interrogation", trustChange: -15, next: "step_end_nothing",
        response: "" }
    ]
  },
  /* ── terminal steps ── */
  {
    id: "step_final",
    prompt: "The evidence is laid out. Neil has contradicted himself. The supervisor looks at you through the mirror, waiting.",
    choices: [
      { id: "fa", text: "Accuse Neil Farner of murdering Ray Dalton for the insurance money", trustChange: 0, next: "step_accuse_strong",
        response: "" },
      { id: "fb", text: "End the interrogation \u2014 you need more evidence", trustChange: -5, next: "step_end_cautious",
        response: "" }
    ]
  }
];

/* ── trust config ── */
export const TRUST = {
  startValue: 60,
  maxValue: 100,
  badConnection: -15,
  connectionBatch: 5,
};

/* ── supervisor lines ── */
export const SUPERVISOR_LINES = {
  welcome: "Your supervisor leans back in his chair. \"Alright, show me what you've got. But don't waste my time.\"",
  connectionProgress: "Supervisor nods slowly. \"Okay... I see where you're going with this. Keep at it.\"",
  badConnection: "Supervisor frowns. \"That connection doesn't track. Be careful \u2014 I need you to be sharp on this.\"",
  interrogationUnlocked: "Supervisor stands up. \"You might have enough here to bring someone in. I can pull Neil Farner for a conversation \u2014 off the record. Your call.\"",
  trustLow: "Supervisor frowns. \"I stuck my neck out for you on this. Don't make me regret it.\"",
  trustCritical: "Supervisor slams a folder shut. \"One more screw-up and I'm pulling the plug.\"",
  gameOver: "Supervisor shakes his head. \"That's it. I can't justify this anymore. Pack it up \u2014 the case stays cold.\"",
  correctAccusation: "Supervisor stares at the evidence chain on your whiteboard. Then he picks up the phone.\n\n\"Get me the DA's office. We're reopening the Dalton case.\"\n\nTwenty years. No one looked. You did.",
  wrongAccusation: "Supervisor pulls you aside. \"That's not enough. You just accused a man with holes in your case. Do you know what that costs us?\"",
  endCautious: "Supervisor nods. \"Smart. Better to wait than to blow it. But we can't sit on this forever.\"",
  endNothing: "Supervisor shakes his head. \"That was a waste of everyone's time. You better have something better next time.\""
};

/* ── helpers ── */
export function getSceneAt(t) {
  for (let i = SCENES.length - 1; i >= 0; i--) {
    if (t >= SCENES[i].time) return SCENES[i];
  }
  return SCENES[0];
}

export function formatTime(t) {
  const c = Math.max(0, t);
  return `${Math.floor(c / 60)}:${Math.floor(c % 60).toString().padStart(2, "0")}`;
}