-- Clear previous seed if needed
delete from route_duplicate_flags;
delete from routes;
delete from cities;

-- Insert test cities
insert into cities (id, name, country) values
  ('a0000000-0000-0000-0000-000000000001', 'Bandung', 'Indonesia'),
  ('a0000000-0000-0000-0000-000000000002', 'Jakarta', 'Indonesia'),
  ('a0000000-0000-0000-0000-000000000003', 'Tokyo', 'Japan');

-- Insert sample routes with realistic coordinates, elevation (<ele>) and GPX XML
insert into routes (
  id,
  name,
  city_id,
  geom,
  gpx_raw,
  thumbnail_svg,
  distance_m,
  elevation_gain_m,
  status
) values
(
  'b0000000-0000-0000-0000-000000000001',
  'KUCING DAGO',
  'a0000000-0000-0000-0000-000000000001',
  ST_GeomFromText('LINESTRING(107.6100 -6.8900, 107.6120 -6.8850, 107.6150 -6.8900, 107.6200 -6.8900, 107.6220 -6.8850, 107.6250 -6.8900, 107.6270 -6.8970, 107.6200 -6.9030, 107.6150 -6.9030, 107.6100 -6.8970, 107.6100 -6.8900)', 4326),
  '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="RuteUnik"><metadata><name>Kucing Dago</name></metadata><trk><name>Kucing Dago</name><trkseg><trkpt lat="-6.8900" lon="107.6100"><ele>720.0</ele></trkpt><trkpt lat="-6.8850" lon="107.6120"><ele>742.5</ele></trkpt><trkpt lat="-6.8900" lon="107.6150"><ele>758.0</ele></trkpt><trkpt lat="-6.8900" lon="107.6200"><ele>775.2</ele></trkpt><trkpt lat="-6.8850" lon="107.6220"><ele>805.0</ele></trkpt><trkpt lat="-6.8900" lon="107.6250"><ele>792.4</ele></trkpt><trkpt lat="-6.8970" lon="107.6270"><ele>765.1</ele></trkpt><trkpt lat="-6.9030" lon="107.6200"><ele>748.8</ele></trkpt><trkpt lat="-6.9030" lon="107.6150"><ele>735.0</ele></trkpt><trkpt lat="-6.8970" lon="107.6100"><ele>724.3</ele></trkpt><trkpt lat="-6.8900" lon="107.6100"><ele>720.0</ele></trkpt></trkseg></trk></gpx>',
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polyline points="20,50 30,20 45,50 55,50 70,20 80,50 85,75 60,90 40,90 15,75 20,50" fill="none" stroke="#1F2A1E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  5200,
  85,
  'official'
),
(
  'b0000000-0000-0000-0000-000000000002',
  'MONAS STAR',
  'a0000000-0000-0000-0000-000000000002',
  ST_GeomFromText('LINESTRING(106.8271 -6.1754, 106.8300 -6.1700, 106.8350 -6.1754, 106.8400 -6.1800, 106.8300 -6.1850, 106.8200 -6.1800, 106.8271 -6.1754)', 4326),
  '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="RuteUnik"><metadata><name>Monas Star</name></metadata><trk><name>Monas Star</name><trkseg><trkpt lat="-6.1754" lon="106.8271"><ele>12.0</ele></trkpt><trkpt lat="-6.1700" lon="106.8300"><ele>15.2</ele></trkpt><trkpt lat="-6.1754" lon="106.8350"><ele>18.0</ele></trkpt><trkpt lat="-6.1800" lon="106.8400"><ele>24.5</ele></trkpt><trkpt lat="-6.1850" lon="106.8300"><ele>19.1</ele></trkpt><trkpt lat="-6.1800" lon="106.8200"><ele>14.3</ele></trkpt><trkpt lat="-6.1754" lon="106.8271"><ele>12.0</ele></trkpt></trkseg></trk></gpx>',
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polyline points="50,15 62,38 88,40 68,58 74,85 50,71 26,85 32,58 12,40 38,38 50,15" fill="none" stroke="#1F2A1E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  8100,
  32,
  'community'
),
(
  'b0000000-0000-0000-0000-000000000003',
  'SHIBUYA HEART',
  'a0000000-0000-0000-0000-000000000003',
  ST_GeomFromText('LINESTRING(139.7016 35.6580, 139.7050 35.6620, 139.7100 35.6600, 139.7050 35.6530, 139.7016 35.6580)', 4326),
  '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="RuteUnik"><metadata><name>Shibuya Heart</name></metadata><trk><name>Shibuya Heart</name><trkseg><trkpt lat="35.6580" lon="139.7016"><ele>32.0</ele></trkpt><trkpt lat="35.6620" lon="139.7050"><ele>41.5</ele></trkpt><trkpt lat="35.6600" lon="139.7100"><ele>52.8</ele></trkpt><trkpt lat="35.6530" lon="139.7050"><ele>44.2</ele></trkpt><trkpt lat="35.6580" lon="139.7016"><ele>32.0</ele></trkpt></trkseg></trk></gpx>',
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 50 30 C 50 15, 20 15, 20 40 C 20 65, 50 85, 50 85 C 50 85, 80 65, 80 40 C 80 15, 50 15, 50 30 Z" fill="none" stroke="#1F2A1E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  4200,
  45,
  'official'
);
