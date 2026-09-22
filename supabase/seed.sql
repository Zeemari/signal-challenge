-- SIGNAL demo seed data.
-- Timestamps are relative to `now()` at insert time so freshness always
-- looks correct whenever this is run before a demo. Run AFTER schema.sql.
-- Safe to re-run: it clears existing demo rows first.

delete from reports;
delete from signals;

-- ============================================================
-- Signal 1: Northern Road — corroborating, emerging situation
-- ============================================================
insert into signals (id, title, location, status, summary, why_explanation, last_updated, created_at)
values (
  'a1111111-1111-1111-1111-111111111111',
  'Northern Road',
  'Northern Road',
  'corroborating',
  '4 reports have been received around Northern Road in the last 12 minutes. 2 are direct observations and 2 are second-hand. The reports appear to describe the same developing situation, but the nature of the activity has not been independently confirmed.',
  '[
    {"type": "positive", "text": "4 reports detected"},
    {"type": "positive", "text": "2 direct observations"},
    {"type": "positive", "text": "2 second-hand reports"},
    {"type": "positive", "text": "Reports occurred within a 12-minute window"},
    {"type": "positive", "text": "Reports are geographically close"},
    {"type": "warning", "text": "No official confirmation"},
    {"type": "warning", "text": "Nature of activity unknown"}
  ]'::jsonb,
  now() - interval '2 minutes',
  now() - interval '12 minutes'
);

insert into reports (content, location, source_type, category, reported_at, ai_summary, ai_event_type, ai_entities, ai_urgency, ai_confidence, signal_id)
values
(
  'I saw people running near Northern Road.',
  'Northern Road', 'direct_observation', 'road_activity',
  now() - interval '12 minutes',
  'Possible unusual activity near Northern Road', 'road_activity',
  '["people running"]'::jsonb, 'medium', 'unverified',
  'a1111111-1111-1111-1111-111111111111'
),
(
  'My brother said there was movement around Northern Road.',
  'Northern Road', 'secondhand', 'road_activity',
  now() - interval '10 minutes',
  'Second-hand report of movement near Northern Road', 'road_activity',
  '["movement"]'::jsonb, 'low', 'unverified',
  'a1111111-1111-1111-1111-111111111111'
),
(
  'Just passed Northern Road. Traffic has stopped.',
  'Northern Road', 'direct_observation', 'road_activity',
  now() - interval '8 minutes',
  'Traffic stoppage observed on Northern Road', 'road_activity',
  '["stopped traffic"]'::jsonb, 'medium', 'unverified',
  'a1111111-1111-1111-1111-111111111111'
),
(
  'I just saw 3 motorcycles speeding down Northern Road and people started turning back.',
  'Northern Road', 'direct_observation', 'road_activity',
  now() - interval '6 minutes',
  'Possible unusual road activity', 'road_activity',
  '["3 motorcycles", "people turning back"]'::jsonb, 'high', 'unverified',
  'a1111111-1111-1111-1111-111111111111'
);

-- ============================================================
-- Signal 2: Market Road — conflicting reports
-- ============================================================
insert into signals (id, title, location, status, summary, why_explanation, last_updated, created_at)
values (
  'a2222222-2222-2222-2222-222222222222',
  'Market Road',
  'Market Road',
  'conflicting',
  'Two recent direct observations of Market Road give different accounts of the current situation. One describes the road as clear, another describes people turning back. Further verification is needed.',
  '[
    {"type": "positive", "text": "3 reports detected"},
    {"type": "positive", "text": "2 direct observations"},
    {"type": "warning", "text": "Direct observations conflict with each other"},
    {"type": "warning", "text": "No official confirmation"},
    {"type": "warning", "text": "Nature of activity unknown"}
  ]'::jsonb,
  now() - interval '4 minutes',
  now() - interval '20 minutes'
);

insert into reports (content, location, source_type, category, reported_at, ai_summary, ai_event_type, ai_entities, ai_urgency, ai_confidence, signal_id)
values
(
  'Heard from a friend Market Road is fine now.',
  'Market Road', 'secondhand', 'road_activity',
  now() - interval '20 minutes',
  'Second-hand report that Market Road is passable', 'road_activity',
  '[]'::jsonb, 'low', 'unverified',
  'a2222222-2222-2222-2222-222222222222'
),
(
  'Road is clear, just walked through Market Road.',
  'Market Road', 'direct_observation', 'road_activity',
  now() - interval '5 minutes',
  'Direct observation that Market Road is clear', 'road_activity',
  '[]'::jsonb, 'low', 'unverified',
  'a2222222-2222-2222-2222-222222222222'
),
(
  'People are turning back from Market Road, something is happening.',
  'Market Road', 'direct_observation', 'road_activity',
  now() - interval '4 minutes',
  'Direct observation of people turning back from Market Road', 'road_activity',
  '["people turning back"]'::jsonb, 'medium', 'unverified',
  'a2222222-2222-2222-2222-222222222222'
);

-- ============================================================
-- Signal 3: Riverside Junction — stale, unconfirmed
-- ============================================================
insert into signals (id, title, location, status, summary, why_explanation, last_updated, created_at)
values (
  'a3333333-3333-3333-3333-333333333333',
  'Riverside Junction',
  'Riverside Junction',
  'unconfirmed',
  '3 reports were received around Riverside Junction 35-45 minutes ago describing a gathering and unusual activity. No new reports have come in since, and the activity was never independently confirmed.',
  '[
    {"type": "positive", "text": "3 reports detected"},
    {"type": "positive", "text": "1 authority/vigilante report"},
    {"type": "positive", "text": "1 direct observation"},
    {"type": "warning", "text": "No reports in the last 30+ minutes"},
    {"type": "warning", "text": "No official confirmation"},
    {"type": "warning", "text": "Nature of activity unknown"}
  ]'::jsonb,
  now() - interval '35 minutes',
  now() - interval '45 minutes'
);

insert into reports (content, location, source_type, category, reported_at, ai_summary, ai_event_type, ai_entities, ai_urgency, ai_confidence, signal_id)
values
(
  'Vigilante group mentioned unusual activity near Riverside Junction on the radio.',
  'Riverside Junction', 'authority', 'gathering',
  now() - interval '45 minutes',
  'Authority report of unusual activity near Riverside Junction', 'gathering',
  '[]'::jsonb, 'medium', 'unverified',
  'a3333333-3333-3333-3333-333333333333'
),
(
  'Saw a group gathered near Riverside Junction earlier.',
  'Riverside Junction', 'direct_observation', 'gathering',
  now() - interval '40 minutes',
  'Direct observation of a group gathering near Riverside Junction', 'gathering',
  '["group gathering"]'::jsonb, 'medium', 'unverified',
  'a3333333-3333-3333-3333-333333333333'
),
(
  'WhatsApp message said Riverside Junction is quiet now.',
  'Riverside Junction', 'whatsapp', 'gathering',
  now() - interval '35 minutes',
  'Forwarded message that Riverside Junction has calmed down', 'gathering',
  '[]'::jsonb, 'low', 'unverified',
  'a3333333-3333-3333-3333-333333333333'
);
