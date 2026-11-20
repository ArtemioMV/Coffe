CREATE TABLE "SiteSocial" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "facebook" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "instagramPost" TEXT,
    "tiktokVideo" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SiteSocial_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SiteSocial_singleton" CHECK ("id" = 1)
);

INSERT INTO "SiteSocial" ("id", "facebook", "instagram", "tiktok", "instagramPost")
VALUES (
    1,
    'https://www.facebook.com/posadacajamarquina/',
    'https://www.instagram.com/posadacajamarquina/',
    'https://www.tiktok.com/@posadacajamarquina',
    'https://www.instagram.com/reel/DJu4_fpSaXW/'
);
