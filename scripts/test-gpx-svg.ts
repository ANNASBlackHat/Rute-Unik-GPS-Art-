import { parseGpx } from '../src/lib/gpx';

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RuteUnik">
  <trk>
    <name>Cat Route Test</name>
    <trkseg>
      <trkpt lat="-6.8900" lon="107.6100"><ele>720.0</ele></trkpt>
      <trkpt lat="-6.8850" lon="107.6120"><ele>745.0</ele></trkpt>
      <trkpt lat="-6.8900" lon="107.6150"><ele>760.0</ele></trkpt>
      <trkpt lat="-6.8900" lon="107.6200"><ele>805.0</ele></trkpt>
      <trkpt lat="-6.8850" lon="107.6220"><ele>780.0</ele></trkpt>
      <trkpt lat="-6.8900" lon="107.6250"><ele>750.0</ele></trkpt>
      <trkpt lat="-6.8970" lon="107.6270"><ele>740.0</ele></trkpt>
      <trkpt lat="-6.9030" lon="107.6200"><ele>730.0</ele></trkpt>
      <trkpt lat="-6.9030" lon="107.6150"><ele>725.0</ele></trkpt>
      <trkpt lat="-6.8970" lon="107.6100"><ele>720.0</ele></trkpt>
      <trkpt lat="-6.8900" lon="107.6100"><ele>720.0</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const parsed = parseGpx(sampleGpx);

console.log('Coordinates Count:', parsed.coordinates.length);
console.log('Distance (m):', parsed.distanceMeters);
console.log('Elevation Gain (m):', parsed.elevationGainMeters);
console.log('WKT Sample:', parsed.wktLineString.slice(0, 50) + '...');
console.log('Thumbnail SVG:');
console.log(parsed.thumbnailSvg);

if (!parsed.thumbnailSvg.includes('viewBox="0 0 200 200"')) {
  throw new Error('SVG does not have square 0 0 200 200 viewBox');
}
if (!parsed.thumbnailSvg.includes('<polyline points="')) {
  throw new Error('SVG does not have polyline');
}

console.log('\nAll GPX & SVG tests PASSED cleanly!');
