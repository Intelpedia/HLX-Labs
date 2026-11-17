// Retired payment integration. Cleffo handles new checkout sessions.
Deno.serve(() => Response.json({ error: "This payment integration has been retired. HLX Labs now uses Cleffo." }, {
  status: 410, headers: { "Cache-Control": "no-store" },
}));
