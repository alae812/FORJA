-- FORJA — Migración 003: bonus narrativos en el libro mayor de XP
alter table xp_events drop constraint if exists xp_events_kind_check;
alter table xp_events add constraint xp_events_kind_check
  check (kind in ('set','set_bonus','cardio','mobility','session_complete','daily_goal','story_bonus','reversal'));
