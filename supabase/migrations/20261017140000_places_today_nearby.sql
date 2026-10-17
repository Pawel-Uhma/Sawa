-- What stands at each place today (Google Places, downloaded 15–16.10.2026, never queried live).
-- Google terms allow keeping this content for 30 days only: delete or refresh after the hackathon.
alter table public.places
  add column today_nearby jsonb not null default '[]';  -- { name, type, googleMapsUrl, placeId }[]
