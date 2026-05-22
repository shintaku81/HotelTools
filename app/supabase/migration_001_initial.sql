-- ======================================================
-- Hotel Cleaning Tool - Initial Schema
-- ======================================================

-- Room master table (static building data)
create table if not exists rooms (
  id           text primary key,          -- room number as string e.g. "301"
  floor        smallint not null,
  room_number  text not null unique,
  room_type    text not null check (room_type in ('S', 'W', 'T', 'TR'))
);

-- Cleaning status table (daily operational state)
-- Reset each morning by the front desk or automated job
create table if not exists room_status (
  id               text primary key references rooms(id),
  status           text not null default 'available'
                     check (status in ('available', 'checkout', 'cleaning', 'cleaned')),
  cleaning_type    text check (cleaning_type in ('co', 'eco')),
  assigned_staff   text,
  checkout_at      timestamptz,
  cleaning_start_at timestamptz,
  cleaned_at       timestamptz,
  amenities        jsonb,
  updated_at       timestamptz not null default now(),
  updated_by       text
);

-- Enable Row Level Security
alter table rooms enable row level security;
alter table room_status enable row level security;

-- Allow all authenticated and anonymous reads (hotel internal tool)
create policy "allow_read_rooms" on rooms
  for select using (true);

create policy "allow_read_status" on room_status
  for select using (true);

create policy "allow_update_status" on room_status
  for update using (true);

create policy "allow_insert_status" on room_status
  for insert with check (true);

-- Enable realtime for room_status
alter publication supabase_realtime add table room_status;

-- ======================================================
-- Room master seed data (99 rooms from Excel spec)
-- ======================================================

-- 2F (9 rooms)
insert into rooms (id, floor, room_number, room_type) values
  ('201', 2, '201', 'TR'),
  ('202', 2, '202', 'T'),
  ('203', 2, '203', 'W'),
  ('205', 2, '205', 'S'),
  ('206', 2, '206', 'S'),
  ('207', 2, '207', 'S'),
  ('208', 2, '208', 'S'),
  ('210', 2, '210', 'S'),
  ('211', 2, '211', 'S')
on conflict (id) do nothing;

-- 3F (18 rooms): W=301,302,316,319 / T=317,318 / S=rest
insert into rooms (id, floor, room_number, room_type) values
  ('301', 3, '301', 'W'), ('302', 3, '302', 'W'), ('303', 3, '303', 'S'),
  ('305', 3, '305', 'S'), ('306', 3, '306', 'S'), ('307', 3, '307', 'S'),
  ('308', 3, '308', 'S'), ('310', 3, '310', 'S'), ('311', 3, '311', 'S'),
  ('312', 3, '312', 'S'), ('314', 3, '314', 'S'), ('315', 3, '315', 'S'),
  ('316', 3, '316', 'W'), ('317', 3, '317', 'T'), ('318', 3, '318', 'T'),
  ('319', 3, '319', 'W'), ('320', 3, '320', 'S'), ('321', 3, '321', 'S')
on conflict (id) do nothing;

-- 4F (18 rooms)
insert into rooms (id, floor, room_number, room_type) values
  ('401', 4, '401', 'W'), ('402', 4, '402', 'W'), ('403', 4, '403', 'S'),
  ('405', 4, '405', 'S'), ('406', 4, '406', 'S'), ('407', 4, '407', 'S'),
  ('408', 4, '408', 'S'), ('410', 4, '410', 'S'), ('411', 4, '411', 'S'),
  ('412', 4, '412', 'S'), ('414', 4, '414', 'S'), ('415', 4, '415', 'S'),
  ('416', 4, '416', 'W'), ('417', 4, '417', 'T'), ('418', 4, '418', 'T'),
  ('419', 4, '419', 'W'), ('420', 4, '420', 'S'), ('421', 4, '421', 'S')
on conflict (id) do nothing;

-- 5F (18 rooms)
insert into rooms (id, floor, room_number, room_type) values
  ('501', 5, '501', 'W'), ('502', 5, '502', 'W'), ('503', 5, '503', 'S'),
  ('505', 5, '505', 'S'), ('506', 5, '506', 'S'), ('507', 5, '507', 'S'),
  ('508', 5, '508', 'S'), ('510', 5, '510', 'S'), ('511', 5, '511', 'S'),
  ('512', 5, '512', 'S'), ('514', 5, '514', 'S'), ('515', 5, '515', 'S'),
  ('516', 5, '516', 'W'), ('517', 5, '517', 'T'), ('518', 5, '518', 'T'),
  ('519', 5, '519', 'W'), ('520', 5, '520', 'S'), ('521', 5, '521', 'S')
on conflict (id) do nothing;

-- 6F (18 rooms)
insert into rooms (id, floor, room_number, room_type) values
  ('601', 6, '601', 'W'), ('602', 6, '602', 'W'), ('603', 6, '603', 'S'),
  ('605', 6, '605', 'S'), ('606', 6, '606', 'S'), ('607', 6, '607', 'S'),
  ('608', 6, '608', 'S'), ('610', 6, '610', 'S'), ('611', 6, '611', 'S'),
  ('612', 6, '612', 'S'), ('614', 6, '614', 'S'), ('615', 6, '615', 'S'),
  ('616', 6, '616', 'W'), ('617', 6, '617', 'T'), ('618', 6, '618', 'T'),
  ('619', 6, '619', 'W'), ('620', 6, '620', 'S'), ('621', 6, '621', 'S')
on conflict (id) do nothing;

-- 7F (18 rooms)
insert into rooms (id, floor, room_number, room_type) values
  ('701', 7, '701', 'W'), ('702', 7, '702', 'W'), ('703', 7, '703', 'S'),
  ('705', 7, '705', 'S'), ('706', 7, '706', 'S'), ('707', 7, '707', 'S'),
  ('708', 7, '708', 'S'), ('710', 7, '710', 'S'), ('711', 7, '711', 'S'),
  ('712', 7, '712', 'S'), ('714', 7, '714', 'S'), ('715', 7, '715', 'S'),
  ('716', 7, '716', 'W'), ('717', 7, '717', 'T'), ('718', 7, '718', 'T'),
  ('719', 7, '719', 'W'), ('720', 7, '720', 'S'), ('721', 7, '721', 'S')
on conflict (id) do nothing;

-- Initialize room_status for all rooms (all available by default)
insert into room_status (id, status)
  select id, 'available' from rooms
on conflict (id) do nothing;
