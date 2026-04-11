import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: process.env.NODE_ENV === "production",
  beforeSend(event) {
    // Filter out noise from browser wallet extensions (inpage.js, contentscript.js)
    const frames = event.exception?.values?.[0]?.stacktrace?.frames;
    if (frames?.length && frames.every((f) => !f.filename || /^app:\/\/\/|extensions?\/|inpage\.js|contentscript/.test(f.filename))) {
      return null;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
