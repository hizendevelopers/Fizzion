with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
area_seed(slug, country, city, name) as (
  values
    ('baghdad-karkh', 'Iraq', 'Baghdad', 'Baghdad - Karkh'),
    ('baghdad-rusafa', 'Iraq', 'Baghdad', 'Baghdad - Rusafa'),
    ('babil', 'Iraq', 'Babil', 'Babil'),
    ('basra', 'Iraq', 'Basra', 'Basra'),
    ('mosul', 'Iraq', 'Mosul', 'Mosul'),
    ('al-anbar', 'Iraq', 'Al Anbar', 'Al Anbar'),
    ('kirkuk', 'Iraq', 'Kirkuk', 'Kirkuk'),
    ('baghdad-digital', 'Iraq', 'Baghdad', 'Baghdad Digital Screens'),
    ('basra-digital', 'Iraq', 'Basra', 'Basra Digital Screens'),
    ('mosul-digital', 'Iraq', 'Mosul', 'Mosul Digital Screens'),
    ('fallujah-digital', 'Iraq', 'Fallujah', 'Fallujah Digital Screens')
)
insert into public.ooh_areas (organization_id, country, city, name, slug)
select org.id, area_seed.country, area_seed.city, area_seed.name, area_seed.slug
from org
cross join area_seed
on conflict (organization_id, slug) do update set
  country = excluded.country,
  city = excluded.city,
  name = excluded.name;

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
areas as (
  select id, slug, organization_id
  from public.ooh_areas
  where organization_id in (select id from org)
),
asset_seed(
  asset_code, media_type, status, country, city, area_slug, location_name, address, landmark,
  width, height, dimension_unit, number_of_faces, total_sqm, notes
) as (
  values
    ('BA-MA 1', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Baghdad - Alma3moon near Mr. Milk', 'Baghdad – alma3moon near Mr.milk', null, 10.00, 8.00, 'METER', 1, 80.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BA-KDH 2', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Kadhmiyya, Orouba Sq.', 'Kadhmiyya, Orouba Sq.', null, 9.00, 14.00, 'METER', 1, 126.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG SS-18', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Al Mansour Main St.', 'Al Mansour Main St.', null, 27.00, 6.00, 'METER', 1, 162.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG 31', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Saydiya near mobile market / Qatir Al Nada Street', 'Saydiya near mobile market / Qatir Al Nada Street', null, 19.00, 7.00, 'METER', 1, 133.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG SS35', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Baghdad – Ameriya Alamal Alsha3by', 'Baghdad – Ameriya Alamal Alsha3by', null, 10.00, 13.00, 'METER', 1, 130.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('SAD01', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Baghdad – Al Doura Sq.', 'Baghdad – Al Doura Sq.', null, 22.00, 20.50, 'METER', 1, 451.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('PBa0016', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Al Rabee3 Street', 'Al Rabee3 Street', null, 12.00, 5.00, 'METER', 1, 60.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('RB113', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Kadhimiya Akad Crossroad', 'Kadhimiya Akad Crossroad', null, 14.64, 4.27, 'METER', 1, 62.51, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('SAR 08', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Hay Al Jameeia Main St.', 'Hay Al Jameeia Main St.', null, 15.00, 5.00, 'METER', 1, 75.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG SS-01', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Al Mansour 14 Ramadan Sq.', 'Al Mansour 14 Ramadan Sq.', null, 17.00, 6.00, 'METER', 1, 102.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG SS 004', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Al Maamoun Near Gas Station', 'Al Maamoun Near Gas Station', null, 10.00, 10.00, 'METER', 1, 100.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BA-IS 2', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Going down Alliqaa Bridge Square towards Al-Iskan', 'Going down Alliqaa Bridge Square towards Al-Iskan', null, 18.00, 6.00, 'METER', 1, 108.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG SS-136', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Yarmouk – 4 Streets', 'Yarmouk – 4 Streets', null, 35.00, 12.70, 'METER', 1, 444.50, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('SD001', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-karkh', 'Mansour, 14 Ramadan', 'Mansour, 14 Ramadan', null, 32.50, 8.00, 'METER', 1, 260.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),

    ('BAG-25', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Zayouna – Al Rubaee Street', 'Zayouna – Al Rubaee Street', null, 17.00, 13.00, 'METER', 1, 221.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG-17', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Alsader City 83 Sq.', 'Alsader City 83 Sq.', null, 23.00, 8.00, 'METER', 1, 184.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG 26', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Palestine Street', 'Palestine Street', null, 10.50, 14.00, 'METER', 1, 147.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BA-KR5', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Karrada in towards Babylon Hotel near Abdul Majeed Hospital', 'Karrada in towards Babylon Hotel near Abdul Majeed Hospital', null, 15.00, 6.00, 'METER', 1, 90.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('SASU-BAG-RU-026', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Senak St. near Al-Khalany Sq.', 'Senak St. near Al-Khalany Sq.', null, 20.00, 5.00, 'METER', 1, 100.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('SASU-BAG-RU-032', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Karadah – Hay Alwihdah – Sina’a Sq.', 'Karadah – Hay Alwihdah – Sina’a Sq.', null, 25.00, 6.00, 'METER', 1, 150.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG 86', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Sadir City, Qanat Entrance', 'Sadir City, Qanat Entrance', null, 17.00, 6.00, 'METER', 1, 102.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAG SS-122', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Al Rubaee Bridge – in front of Dream City Mall', 'Al Rubaee Bridge – in front of Dream City Mall', null, 36.50, 6.10, 'METER', 1, 222.65, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BA-GHD 1', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Baghdad – Al Ghadeer', 'Baghdad – Al Ghadeer', null, 11.00, 8.00, 'METER', 1, 88.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('SD 30 A & B', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Al-Jadriya Bayarat Alsham', 'Al-Jadriya Bayarat Alsham', null, 14.00, 4.00, 'METER', 2, 56.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('SD 60', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Al Wazirya', 'Al Wazirya', null, 20.00, 5.00, 'METER', 1, 100.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('P-BDW088', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-rusafa', 'Karada Kharij', 'Karada Kharij', null, 26.50, 12.80, 'METER', 1, 339.20, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),

    ('OBB1', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Babil', 'babil', '60 Street', '60 Street', null, 20.00, 5.00, 'METER', 1, 100.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('PZ-16', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Babil', 'babil', 'Nader Al Thaniyah', 'Nader Al Thaniyah', null, 14.00, 6.00, 'METER', 1, 84.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),

    ('BAS-01', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Basra', 'basra', 'Al Jazair Street', 'Al Jazair Street', null, 25.00, 6.00, 'METER', 1, 150.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAS SS-04 A', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Basra', 'basra', 'Dinar Street', 'Dinar Street', null, 10.00, 16.00, 'METER', 1, 160.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('BAS-13', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Basra', 'basra', 'Basra – Al Muwafaqiya', 'Basra – Al Muwafaqiya', null, 26.00, 6.00, 'METER', 1, 156.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),

    ('MU3', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Mosul', 'mosul', 'Industry - Exhibitions', 'Industry - Exhibitions', null, 14.00, 5.00, 'METER', 1, 70.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('MOSL 07', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Mosul', 'mosul', 'Dorat Al Mahrok', 'Dorat Al Mahrok', null, 22.00, 5.00, 'METER', 1, 110.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('MOSL SS-03', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Mosul', 'mosul', 'Al Masarif – Main Intersection', 'Al Masarif – Main Intersection', null, 24.00, 8.00, 'METER', 1, 192.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),

    ('ANB 001', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Al Anbar', 'al-anbar', 'Dalphine Street', 'Dalphine Street', null, 20.00, 5.00, 'METER', 1, 100.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('ANB 002', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Al Anbar', 'al-anbar', 'Omar Street', 'Omar Street', null, 16.00, 5.00, 'METER', 1, 80.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('AN1', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Al Anbar', 'al-anbar', 'Falluja St. Tharthar', 'Falluja St. Tharthar', null, 8.00, 12.00, 'METER', 1, 96.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('P-RDW008', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Al Anbar', 'al-anbar', 'Ramadi – Stadium St.', 'Ramadi – Stadium St.', null, 10.00, 9.00, 'METER', 1, 90.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('P-FL002', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Al Anbar', 'al-anbar', 'Hay Al Andlos', 'Hay Al Andlos', null, 12.00, 4.00, 'METER', 1, 48.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),

    ('KRK 001', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Kirkuk', 'kirkuk', 'Kirkuk, Al Ihtfalat Sq.', 'Kirkuk, Al Ihtfalat Sq.', null, 16.00, 10.00, 'METER', 1, 160.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('KIR SS-03', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Kirkuk', 'kirkuk', 'Kirkuk – Garage Al Shimal', 'Kirkuk – Garage Al Shimal', null, 30.00, 6.00, 'METER', 1, 180.00, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),
    ('KRK 006', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Kirkuk', 'kirkuk', 'Rass Al Jisser', 'Rass Al Jisser', null, 17.00, 7.30, 'METER', 1, 124.10, 'Integrated from provided Arabic region OOH inventory on July 24, 2026.'),

    ('575 RU', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-digital', 'Karrada, National Theatre', 'Karrada, National Theatre', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('POB-BG', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-digital', 'Baghdad Mall Tower', 'Baghdad Mall Tower', null, 320.00, 1921.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('POB-R2', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-digital', 'Al Rowad Intersection', 'Al Rowad Intersection', null, 320.00, 1216.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('POBL2', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-digital', 'Iraq Mall - Near the Two Stories Bridge', 'Iraq Mall - Near the Two Stories Bridge', null, null, null, 'THREE_D', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('POBL4', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-digital', 'Iraq Mall - Near the Two Stories Bridge', 'Iraq Mall - Near the Two Stories Bridge', null, null, null, 'THREE_D', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('POBL3', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-digital', 'Al-Mansour; Al Rowad Intersection', 'Al-Mansour; Al Rowad Intersection', null, null, null, 'THREE_D', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('BLED 01', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Baghdad', 'baghdad-digital', 'Al Mamoun - Jordan Intersection', 'Al Mamoun - Jordan Intersection', null, 3840.00, 2160.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),

    ('BAS 11', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Basra', 'basra-digital', 'Al Jaza3er Bridge – towards the Khora', 'Al Jaza3er Bridge – towards the Khora', null, 480.00, 720.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('BAS 2', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Basra', 'basra-digital', 'Al Twesa', 'Al Twesa', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('BAS 16', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Basra', 'basra-digital', 'Al Kuwait Street', 'Al Kuwait Street', null, 960.00, 1920.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('BAS 6', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Basra', 'basra-digital', 'Al Sa3di Street Screen', 'Al Sa3di Street Screen', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('BAS 17', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Basra', 'basra-digital', 'Al Jaza3er Intersection', 'Al Jaza3er Intersection', null, 1440.00, 1200.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('BAS 8', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Basra', 'basra-digital', 'Al Mushraq', 'Al Mushraq', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('BAS 67', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Basra', 'basra-digital', 'Al Dinar Station Screen', 'Al Dinar Station Screen', null, 1440.00, 1234.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),

    ('Mus 1', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Mosul', 'mosul-digital', 'Mosul Main St.', 'Mosul Main St.', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),

    ('FAL 1', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Fallujah', 'fallujah-digital', 'Al-Hadhra Al Muhammadiyah Mosque Int., Althirthar Street', 'Al-Hadhra Al Muhammadiyah Mosque Int., Althirthar Street', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('FAL 2', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Fallujah', 'fallujah-digital', 'Al Ayadah Alsha’biyah Int.', 'Al Ayadah Alsha’biyah Int.', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('FAL 5', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Fallujah', 'fallujah-digital', 'Fallujah Entrance, Ramadi Side', 'Fallujah Entrance, Ramadi Side', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.'),
    ('FAL 7', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Fallujah', 'fallujah-digital', 'Fallujah Entrance, Baghdad Side', 'Fallujah Entrance, Baghdad Side', null, 1920.00, 1080.00, 'PIXEL', 1, null, 'Integrated from provided digital screen inventory on July 24, 2026.')
)
insert into public.ooh_assets (
  organization_id, asset_code, media_type, status, country, city, area_id, location_name, address, landmark,
  width, height, dimension_unit, number_of_faces, total_sqm, notes
)
select
  org.id,
  asset_seed.asset_code,
  asset_seed.media_type,
  asset_seed.status,
  asset_seed.country,
  asset_seed.city,
  areas.id,
  asset_seed.location_name,
  asset_seed.address,
  asset_seed.landmark,
  asset_seed.width,
  asset_seed.height,
  asset_seed.dimension_unit,
  asset_seed.number_of_faces,
  asset_seed.total_sqm,
  asset_seed.notes
from org
join asset_seed on true
left join areas on areas.slug = asset_seed.area_slug and areas.organization_id = org.id
on conflict (organization_id, asset_code) do update set
  media_type = excluded.media_type,
  status = excluded.status,
  country = excluded.country,
  city = excluded.city,
  area_id = excluded.area_id,
  location_name = excluded.location_name,
  address = excluded.address,
  landmark = excluded.landmark,
  width = excluded.width,
  height = excluded.height,
  dimension_unit = excluded.dimension_unit,
  number_of_faces = excluded.number_of_faces,
  total_sqm = excluded.total_sqm,
  notes = excluded.notes;

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
spec_seed(asset_code, resolution_width, resolution_height) as (
  values
    ('575 RU', 1920, 1080),
    ('POB-BG', 320, 1921),
    ('POB-R2', 320, 1216),
    ('BLED 01', 3840, 2160),
    ('BAS 11', 480, 720),
    ('BAS 2', 1920, 1080),
    ('BAS 16', 960, 1920),
    ('BAS 6', 1920, 1080),
    ('BAS 17', 1440, 1200),
    ('BAS 8', 1920, 1080),
    ('BAS 67', 1440, 1234),
    ('Mus 1', 1920, 1080),
    ('FAL 1', 1920, 1080),
    ('FAL 2', 1920, 1080),
    ('FAL 5', 1920, 1080),
    ('FAL 7', 1920, 1080)
)
insert into public.ooh_digital_screen_specifications (
  asset_id, resolution_width, resolution_height, operating_start_time, operating_end_time, loop_length_seconds, spot_length_seconds
)
select
  assets.id,
  spec_seed.resolution_width,
  spec_seed.resolution_height,
  '06:00'::time,
  '23:59'::time,
  120,
  15
from org
join public.ooh_assets assets on assets.organization_id = org.id
join spec_seed on spec_seed.asset_code = assets.asset_code
on conflict (asset_id) do update set
  resolution_width = excluded.resolution_width,
  resolution_height = excluded.resolution_height,
  operating_start_time = excluded.operating_start_time,
  operating_end_time = excluded.operating_end_time,
  loop_length_seconds = excluded.loop_length_seconds,
  spot_length_seconds = excluded.spot_length_seconds;
