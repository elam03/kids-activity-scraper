export const FEEDBACK_EMAIL = 'elam03@gmail.com';

export interface MailtoOptions {
  subject?: string;
  body?: string;
}

/**
 * Builds an RFC-compliant mailto URI with encoded query parameters.
 */
export function buildFeedbackMailtoUrl(options?: MailtoOptions): string {
  const subject = options?.subject || 'Little Days Out Feedback';
  const body =
    options?.body ||
    'Hi Eric,\n\nHere is my feedback for Little Days Out:\n\n';

  const params = new URLSearchParams({
    subject,
    body,
  });

  return `mailto:${FEEDBACK_EMAIL}?${params.toString().replace(/\+/g, '%20')}`;
}

export interface AboutContent {
  familyBlurb: string;
  tippingAppreciation: string;
  feedbackNote: string;
}

/**
 * Returns the narrative content for the About view/modal.
 */
export function getAboutContent(): AboutContent {
  return {
    familyBlurb:
      "Hi there! I'm Eric, a parent living in the San Francisco Bay Area. Like many parents with young kids, my partner and I found ourselves constantly searching across dozens of different websites, city calendars, library bulletin boards, and social media flyers every weekend just trying to answer one question: What fun, enriching things can we do with the kids today?\n\nWe built Little Days Out to bring all of these community events—storytimes, seasonal festivals, arts & crafts workshops, nature walks, STEM camps, and free park days—into one simple, searchable, clutter-free calendar. Our goal is to spend less time planning and more time making memories together.",
    tippingAppreciation:
      "Little Days Out is completely free and ad-free, independently built and maintained in my free time between family life and work. If this calendar has helped your family find a fun outing or saved you planning stress, tipping a coffee is a wonderful way to help cover server, hosting, and data scraping costs. Every tip is deeply appreciated!",
    feedbackNote:
      "Positive or negative feedback is welcome! Whether you have ideas for new features, spotted something inaccurate, or know great local event sources we should track, we'd love to hear from you.",
  };
}
