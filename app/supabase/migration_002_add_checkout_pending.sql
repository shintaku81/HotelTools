-- ======================================================
-- Migration 002: Add checkout_pending and stay statuses
-- ======================================================
-- チェックアウト待ち（CO予定・まだ退室していない）と
-- 在室中（連泊・チェックアウト予定なし）を追加

-- Drop existing check constraint and recreate with new statuses
alter table room_status
  drop constraint room_status_status_check;

alter table room_status
  add constraint room_status_status_check
    check (status in ('stay', 'checkout_pending', 'checkout', 'cleaning', 'cleaned', 'available'));
