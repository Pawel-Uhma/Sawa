-- Read functions for the API (docs/13-plan-bazy.md §3). Called with supabase.rpc(...).

-- Map: GeoJSON FeatureCollection of PlaceSummary, ready for a MapLibre source.
create or replace function public.places_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  filter_interests text[] default null
)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'id', p.id,
        'geometry', jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(p.lng, p.lat)),
        'properties', jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'kind', p.kind,
          'interests', to_jsonb(p.interests),
          'richness', p.richness
        )
      ) order by p.richness desc
    ), '[]'::jsonb)
  )
  from places p
  where p.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and (filter_interests is null or p.interests && filter_interests);
$$;

-- Route planner: places within radius_m of a GeoJSON LineString, ordered along the line.
-- fraction is the position along the line (0 = start, 1 = end).
create or replace function public.places_near_line(
  line jsonb,
  radius_m double precision default 150,
  filter_interests text[] default null
)
returns table (
  id text,
  name text,
  kind text,
  interests text[],
  richness smallint,
  lat double precision,
  lng double precision,
  distance_m double precision,
  fraction double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with l as (
    select st_setsrid(st_geomfromgeojson(line::text), 4326) as g
  )
  select
    p.id, p.name, p.kind, p.interests, p.richness, p.lat, p.lng,
    st_distance(p.geom, l.g::geography) as distance_m,
    st_linelocatepoint(l.g, p.geom::geometry) as fraction
  from places p, l
  where st_dwithin(p.geom, l.g::geography, radius_m)
    and (filter_interests is null or p.interests && filter_interests)
  order by fraction;
$$;

-- Story and place page: one place with photos, without the raw source record.
create or replace function public.place_detail(place_id text)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select (to_jsonb(p) - 'raw' - 'geom') || jsonb_build_object(
    'photos', coalesce((
      select jsonb_agg(to_jsonb(ph) - 'place_id' order by ph.id)
      from place_photos ph
      where ph.place_id = p.id
    ), '[]'::jsonb)
  )
  from places p
  where p.id = place_detail.place_id;
$$;

-- Only the API (service_role) calls these.
revoke execute on function public.places_in_bbox(double precision, double precision, double precision, double precision, text[]) from public, anon, authenticated;
revoke execute on function public.places_near_line(jsonb, double precision, text[]) from public, anon, authenticated;
revoke execute on function public.place_detail(text) from public, anon, authenticated;
