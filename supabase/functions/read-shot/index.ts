// Riftcheese: reads a Riftatlas end-of-game screenshot with Claude and returns what it shows as JSON,
// so the match log can fill itself in. Signed-in accounts only, with a daily cap per account.
// Setup is in the README under "Screenshot reading". It needs the ANTHROPIC_API_KEY secret.
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const MODEL = "claude-opus-5-5";
const DAILY_LIMIT = 30; // screenshots per account per day
const MAX_IMAGE_B64 = 6_500_000; // ~4.8 MB of image; the API takes up to 5 MB

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `You read end-of-game screenshots from Riftatlas (play.riftatlas.com), a browser client for the Riftbound trading card game, and report what they show so the player can log the game.

How a Riftatlas game screen is laid out:
- The player who took the screenshot ("me") sits at the bottom of the board. The opponent sits at the top, and their cards are upside down. Nameplates: mine at the bottom left, the opponent's at the top right.
- Each player's Legend is face up next to their Chosen Champion zone: the opponent's at the top left, mine at the bottom right. An exhausted Legend is turned sideways. The champion zone shows "No card" once the champion has left it.
- Scores: each player has a track of numbered circles from 0 up to the points needed to win. Mine runs up the bottom left of the board; the opponent's runs down the right side of the board, beside the game log. The current score is the circle with the glowing highlight ring.
- Battlefields are the two landscape cards in the middle of the board, with the name printed on the bottom bar. Units standing there can cover part of the card. The left battlefield is normally mine and the right one the opponent's. When my deck's battlefields are listed, mine is the one from that list.
- The game log on the right lists events newest first. Headers like "TURN 11 · NAME" say whose turn it was. Entries include "Scored 1 at turn start. Score: 7 → 8" and "Conceded. NAME wins.", and a banner can say "NAME disconnected." The top of the panel shows the current turn ("Turn 12"). The END TURN button is lit only during my turn.
- The player who went first takes the odd-numbered turns.

A game is won by reaching the points needed, or when the other player concedes. Report only what the screenshot supports. Use an empty string, null or "unknown" for anything you can't see or work out: a blank is better than a wrong guess. Name Legends and battlefields exactly as written in the lists you are given. Give the opponent's Chosen Champion only when it is clearly shown.`;

const nullableInt = { anyOf: [{ type: "integer" }, { type: "null" }] };
const side = { type: "string", enum: ["me", "opp", "unknown"] };
const SCHEMA = {
  type: "object",
  properties: {
    is_riftatlas_game: { type: "boolean", description: "Whether this is a screenshot of a Riftatlas game board" },
    my_name: { type: "string" },
    opp_name: { type: "string" },
    my_score: nullableInt,
    opp_score: nullableInt,
    winner: side,
    ended_by: { type: "string", enum: ["points", "concede", "disconnect", "unknown"] },
    turn: nullableInt,
    went_first: side,
    my_legend: { type: "string" },
    my_champion: { type: "string" },
    opp_legend: { type: "string" },
    opp_champion: { type: "string" },
    my_battlefield: { type: "string" },
    opp_battlefield: { type: "string" },
    notes: { type: "string", description: "One short sentence about anything uncertain, or an empty string" },
  },
  required: ["is_riftatlas_game", "my_name", "opp_name", "my_score", "opp_score", "winner", "ended_by", "turn", "went_first",
    "my_legend", "my_champion", "opp_legend", "opp_champion", "my_battlefield", "opp_battlefield", "notes"],
  additionalProperties: false,
};

// Card names come from the page; keep them to short strings so a request can't grow the prompt.
const names = (v: unknown, max = 200) =>
  (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 80)).filter(Boolean).slice(0, max);
const one = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 80) : "");

function contextText(c: Record<string, unknown>) {
  const myBfs = names(c.myBattlefields, 3);
  const win = Number.isInteger(c.winPoints) && (c.winPoints as number) > 0 && (c.winPoints as number) < 100 ? c.winPoints : 8;
  return [
    "Read this Riftatlas screenshot.",
    `Points needed to win: ${win}.`,
    one(c.myLegend) && `My Legend: ${one(c.myLegend)}.`,
    one(c.myChampion) && `My Chosen Champion: ${one(c.myChampion)}.`,
    myBfs.length && `My deck's battlefields: ${myBfs.join("; ")}.`,
    `Legends: ${names(c.legends).join("; ")}.`,
    `Battlefields: ${names(c.battlefields).join("; ")}.`,
  ].filter(Boolean).join("\n");
}

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method", message: "Use POST." });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return reply(401, { error: "signin", message: "Sign in to have screenshots read." });

  let body: { image?: unknown; mediaType?: unknown; context?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: "bad_request", message: "The request wasn't JSON." }); }
  const image = body.image, mediaType = body.mediaType;
  if (typeof image !== "string" || !image || image.length > MAX_IMAGE_B64) return reply(413, { error: "too_large", message: "That image is too large to read." });
  if (mediaType !== "image/jpeg" && mediaType !== "image/png" && mediaType !== "image/webp") return reply(400, { error: "bad_request", message: "Send a JPEG, PNG or WebP image." });

  const { data: used, error: countErr } = await sb.rpc("count_shot_read");
  if (countErr) return reply(500, { error: "setup", message: "Screenshot reading isn't set up on the database yet." });
  if (used > DAILY_LIMIT) return reply(429, { error: "limit", message: `You've had ${DAILY_LIMIT} screenshots read today. Try again tomorrow, or fill the match in by hand.` });

  try {
    const msg = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: contextText((body.context && typeof body.context === "object" ? body.context : {}) as Record<string, unknown>) },
        ],
      }],
    });
    if (msg.stop_reason === "refusal") return reply(422, { error: "refused", message: "The screenshot couldn't be read. Fill the match in by hand." });
    if (msg.stop_reason === "max_tokens") return reply(502, { error: "upstream", message: "Reading took too long. Try again." });
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return reply(502, { error: "upstream", message: "No answer came back. Try again." });
    return reply(200, { result: JSON.parse(text.text), model: msg.model, left: Math.max(0, DAILY_LIMIT - used) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) return reply(503, { error: "busy", message: "The reader is busy. Try again in a minute." });
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return reply(500, { error: "setup", message: "Screenshot reading isn't set up correctly (API key)." });
    if (e instanceof Anthropic.APIError) return reply(502, { error: "upstream", message: `Reading failed (${e.status ?? "error"}). Try again.` });
    if (e instanceof SyntaxError) return reply(502, { error: "upstream", message: "The answer couldn't be understood. Try again." });
    return reply(500, { error: "unknown", message: "Reading failed. Try again." });
  }
});
