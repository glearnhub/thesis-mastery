// Thesis Mastery configuration.
//
// Fill in your Supabase project URL and anon (public) key from
// Supabase Dashboard -> Project Settings -> API. The anon key is safe to put
// in frontend code: Row Level Security decides what it can read and write.
// NEVER put the service-role key or the Anthropic API key here.
//
// While these are left as placeholders, the app runs in DEMO MODE: data is
// kept in this browser only. You can also force demo mode with ?demo=1.
//
// MARKING chooses who marks answers:
//   "rules" - the built-in rule-based marker (free, no API key, works offline)
//   "ai"    - Claude, through the evaluate-answer Edge Function (needs the
//             function deployed and ANTHROPIC_API_KEY set in Supabase)
window.THESIS_MASTERY_CONFIG = {
  SUPABASE_URL: "https://euegopazzskxfyrsoxit.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_s6rhtocjXAozNmidQPuw2w_-2PhqLZ7",
  MARKING: "rules",
};
