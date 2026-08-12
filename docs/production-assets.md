# Production assets and contact configuration

## Required visual assets

The public landing page expects four real photographic assets in `public/visuals/`:

- `hero-portrait.jpeg`
- `cabinet-office.jpeg`
- `enterprise-handshake.jpeg`
- `ai-human.jpeg`

The repository currently contains placeholder JPEG payloads rather than the supplied source photographs. Do not treat these files as final visual assets. Replace them with the actual supplied photographs before the final visual sign-off.

## Contact delivery

The public contact endpoint sends messages to `recrutement.prive@hotmail.com` through Resend.

Required Vercel Production environment variables:

- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL` — a verified sender address on the Resend domain

Without both variables the endpoint deliberately returns HTTP 503 instead of falsely reporting success.
