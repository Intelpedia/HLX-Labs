# HLX Labs TagadaPay setup

This folder contains server-side TagadaPay integration code. Never place the TagadaPay bearer token in `app.js`, HTML, or any GitHub Pages file.

## Local setup

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env`.
3. Enter your real `TAGADA_API_TOKEN` and `TAGADA_STORE_ID` in `.env`.
4. Set `TAGADA_DEFAULT_GRAMS` to the actual packaged shipping weight in grams.

## Safe first test

From the repository root:

    node --env-file=.env server/tagadapay-products.js --test

This creates only the first HLX catalog product.

After confirming it appears correctly in TagadaPay, create the complete catalog with:

    node --env-file=.env server/tagadapay-products.js --all

The script writes returned TagadaPay product/variant/price IDs to
`server/tagadapay-id-map.json`.

Do not run the creation command repeatedly: the TagadaPay create-product endpoint can create duplicate products.

The storefront can remain on GitHub Pages, but live checkout must call a secure server/serverless backend so the TagadaPay token remains private.
