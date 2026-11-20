import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGoogleReviews } from "../../apps/web/src/modules/inicio/google-reviews";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("reseñas públicas de Google Maps", () => {
  it("no consulta a Google sin una clave configurada", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await loadGoogleReviews()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("conserva la atribución y el texto original sin devolver la clave ni enlaces inseguros", async () => {
    vi.stubEnv("GOOGLE_PLACES_PLACE_ID", "");
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");
    const fetch = vi.fn().mockResolvedValue(Response.json({
      rating: 4.7,
      userRatingCount: 21,
      reviews: [{
        name: "places/ChIJ89vGHLs9rZERoYypHBYH20s/reviews/1",
        rating: 5,
        originalText: { text: "Bonita experiencia" },
        relativePublishTimeDescription: "hace una semana",
        googleMapsUri: "https://maps.google.com/?review=1",
        authorAttribution: { displayName: "María", uri: "javascript:alert(1)" }
      }]
    }));
    vi.stubGlobal("fetch", fetch);

    const result = await loadGoogleReviews();
    expect(result).toMatchObject({ rating: 4.7, userRatingCount: 21, reviews: [{
      author: { displayName: "María" }, text: "Bonita experiencia", googleMapsUri: "https://maps.google.com/?review=1"
    }] });
    expect(result?.reviews[0].author.uri).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("test-key");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/places/ChIJ89vGHLs9rZERoYypHBYH20s?"), expect.objectContaining({
      cache: "no-store", headers: expect.objectContaining({ "X-Goog-Api-Key": "test-key" })
    }));
  });
});
