export const SCENES = [
    {
      time: 0, duration: 8, type: "visual",
      text: "Interior of Dalton's Hardware. Fluorescent lights buzz. A few customers browse the aisles. The camera is mounted high in the corner, wide angle, slightly fish-eyed.",
      clue: null
    },
    {
      time: 8, duration: 10, type: "visual",
      text: "Two men stand behind the counter. The older one \u2014 heavyset, flannel shirt \u2014 is RAY DALTON. The younger one in a polo is NEIL FARNER. They're talking low, but their body language is tense.",
      clue: null
    },
    {
      time: 18, duration: 12, type: "dialogue",
      text: "Ray and Neil's voices are partially drowned out by store noise. You catch fragments:\n\nRAY: \"...doesn't add up, Neil. The numbers don't...\"\nNEIL: \"...I'm handling it, just let me...\"\nRAY: \"...you're handling it? Like you handled the...\"",
      clue: { id: "argument", label: "Neil/Ray argument", category: "Dialogue", desc: "Neil and Ray arguing about finances behind the counter" }
    },
    {
      time: 30, duration: 10, type: "dialogue",
      text: "The argument continues. A customer approaches and they go quiet for a moment. As the customer walks away:\n\nNEIL: \"...look, the policy takes care of everything. Just trust me on this.\"\nRAY: \"What policy? I didn't agree to any\u2014\"\nNEIL: \"Just drop it, Ray.\"",
      clue: { id: "policy", label: "'The policy' dialogue", category: "Dialogue", desc: "Neil mentions 'the policy' \u2014 Ray seems unaware of it" }
    },
    {
      time: 40, duration: 8, type: "visual",
      text: "Neil steps away from the counter. As he moves, the camera catches a piece of paper on the countertop. For a few seconds it's partially readable \u2014 a printed form with a header that looks like \"LIFE INS\u2014\" before Neil's arm blocks it. Then it's gone.",
      clue: { id: "document", label: "Insurance document", category: "Object", desc: "Paper on counter with partial header reading 'LIFE INS\u2014'" }
    },
    {
      time: 48, duration: 6, type: "visual",
      text: "A quiet stretch. Ray restocks a shelf. Neil is in the back room. The store radio plays softly.",
      clue: null
    },
    {
      time: 54, duration: 12, type: "visual",
      text: "The front door opens. A young man in a hoodie enters \u2014 early 20s, jittery, hands in pockets. This is TOMMY WILDS. He walks straight to Ray at the shelf.",
      clue: null
    },
    {
      time: 66, duration: 12, type: "dialogue",
      text: "TOMMY: \"Uncle Ray, I just need a little \u2014 just enough to get through the week.\"\nRAY: \"Tommy, I told you. I'm not doing this anymore.\"\nTOMMY: \"Come on, it's not like\u2014\"\nRAY: \"No. Get yourself together, kid.\"\n\nTommy stares at him, then turns and walks out without another word.",
      clue: { id: "tommy", label: "Tommy asks for money", category: "Person", desc: "Tommy Wilds asks Ray for money, gets turned down, leaves angry" }
    },
    {
      time: 78, duration: 8, type: "visual",
      text: "The store is quiet again. Ray watches the door for a long moment after Tommy leaves. Neil comes back from the back room.\n\nNEIL: \"What was that about?\"\nRAY: \"Nothing. Family stuff.\"\n\nThe tape cuts to static.",
      clue: null
    },
    {
      time: 86, duration: 6, type: "visual",
      text: "\u2592\u2592\u2592 STATIC \u2592\u2592\u2592\n\nThe tape ends. Tracking lines scroll across the screen.",
      clue: null
    }
  ];
  
  export const EVIDENCE_CONNECTIONS = [
    { id: "c1", label: "Neil \u2192 financial conflict with Ray", needs: ["argument", "policy"], desc: "Clues A + B: Neil and Ray had a financial dispute" },
    { id: "c2", label: "Neil \u2192 insurance policy", needs: ["policy", "document"], desc: "Clues B + C: Neil had an insurance policy Ray didn't know about" },
    { id: "c3", label: "Tommy \u2192 needed money", needs: ["tommy"], desc: "Clue D: Tommy was desperate for cash (red herring)" },
    { id: "c4", label: "Tommy \u2192 at store before murder", needs: ["tommy"], desc: "Clue D: Tommy was seen at the store (red herring)" }
  ];
  
  /* the two connections that actually matter for "solving" tape 1 */
  export const REQUIRED_CONNECTIONS = ["c1", "c2"];
  
  export const TOTAL_DURATION = SCENES[SCENES.length - 1].time + SCENES[SCENES.length - 1].duration;
  
  export function getSceneAt(time) {
    for (let i = SCENES.length - 1; i >= 0; i--) {
      if (time >= SCENES[i].time) return SCENES[i];
    }
    return SCENES[0];
  }
  
  export function formatTime(t) {
    const clamped = Math.max(0, t);
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }