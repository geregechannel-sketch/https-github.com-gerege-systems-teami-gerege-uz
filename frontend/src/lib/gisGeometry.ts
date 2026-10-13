type Point = { POINT_NAME?: unknown; POINT_LATITUDE?: unknown; POINT_LONGITUDE?: unknown };
export type RecordedCoordinate = { name: string; latitude: number | null; longitude: number | null };

export function resolveGisGeometry(point: Point, points: Point[], reference: RecordedCoordinate[]) {
  const valid = (lat: unknown, lng: unknown) => typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) < 85 && typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180;
  if (valid(point.POINT_LATITUDE, point.POINT_LONGITUDE)) return {lat:point.POINT_LATITUDE as number,lng:point.POINT_LONGITUDE as number,origin:"stored_point"};
  const name = String(point.POINT_NAME || "");
  const candidates = reference.filter(row => row.name === name);
  if (name && candidates.length === 1 && points.filter(row => String(row.POINT_NAME || "") === name).length === 1 && valid(candidates[0].latitude,candidates[0].longitude)) {
    return {lat:candidates[0].latitude!,lng:candidates[0].longitude!,origin:"recorded_snapshot"};
  }
  return {lat:null,lng:null,origin:"unavailable"};
}
