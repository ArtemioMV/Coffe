import { z } from "zod";
import { restaurantPlaceId } from "./location";

const httpsUrl = z.string().url().startsWith("https://").optional().catch(undefined);
const review = z.object({
  name: z.string(),
  rating: z.number().int().min(1).max(5),
  originalText: z.object({ text: z.string() }).optional(),
  text: z.object({ text: z.string() }).optional(),
  relativePublishTimeDescription: z.string().optional(),
  googleMapsUri: httpsUrl,
  authorAttribution: z.object({ displayName: z.string().min(1), uri: httpsUrl, photoUri: httpsUrl })
}).transform(({ authorAttribution, originalText, text, ...rest }) => ({
  ...rest, author: authorAttribution, text: originalText?.text ?? text?.text
}));

const place = z.object({
  rating: z.number().min(1).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().default(0),
  googleMapsUri: httpsUrl,
  reviews: z.array(review).default([]),
  attributions: z.array(z.object({ provider: z.string(), providerUri: httpsUrl })).default([])
});
export type GoogleReviews = z.output<typeof place>;

function config() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACES_PLACE_ID?.trim() || restaurantPlaceId;
  return key && placeId && /^[\w-]+$/.test(placeId) ? { key, placeId } : null;
}

export function googleReviewsEnabled() {
  return Boolean(config());
}

export async function loadGoogleReviews(): Promise<GoogleReviews | null> {
  const settings = config();
  if (!settings) return null;

  const response = await fetch(`https://places.googleapis.com/v1/places/${settings.placeId}?languageCode=es&regionCode=PE`, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(4500),
    headers: {
      "X-Goog-Api-Key": settings.key,
      "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews,attributions"
    }
  });
  if (!response.ok) throw new Error(`Places API: HTTP ${response.status}`);

  const result = place.safeParse(await response.json());
  if (!result.success) throw new Error("Places API: respuesta inesperada");
  return result.data;
}
