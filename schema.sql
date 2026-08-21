-- ============================================
-- TABEL NOTES
-- ============================================
-- Jalankan ini di Supabase Dashboard > SQL Editor

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text default 'Umum',
  content text not null,
  is_important boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index supaya query "catatan milik user X, urut dari yang terbaru" cepat
create index if not exists notes_user_id_created_at_idx
  on notes (user_id, created_at desc);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Ini kunci keamanannya: tanpa RLS, siapa saja yang tahu
-- URL Supabase-mu bisa membaca SEMUA catatan SEMUA user.

alter table notes enable row level security;

-- User hanya boleh MELIHAT catatan miliknya sendiri
create policy "Users can view own notes"
on notes for select
using (auth.uid() = user_id);

-- User hanya boleh MENAMBAH catatan atas namanya sendiri
create policy "Users can insert own notes"
on notes for insert
with check (auth.uid() = user_id);

-- User hanya boleh MENGUBAH catatan miliknya sendiri
create policy "Users can update own notes"
on notes for update
using (auth.uid() = user_id);

-- User hanya boleh MENGHAPUS catatan miliknya sendiri
create policy "Users can delete own notes"
on notes for delete
using (auth.uid() = user_id);
