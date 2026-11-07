/**
 * Instagram Creator Flywheel & Reciprocal Discovery Utilities (Pillar 3)
 */

export interface CuratorSummary {
  id: string;
  handle: string;
  name: string;
  eventCount: number;
  upcomingCount?: number;
  isActive: boolean;
  lastScrapedAt?: Date | string | null;
}

export interface CreatorOutreachOptions {
  curatorName: string;
  handle: string;
  featuredEventTitle: string;
  eventUrl: string;
}

export interface CreatorOutreachTemplates {
  subject: string;
  instagramDm: string;
  storyShoutout: string;
  emailBody: string;
}

/**
 * Normalizes an Instagram handle by stripping '@' and whitespace.
 */
export function cleanHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

/**
 * Builds a direct HTTPS Instagram profile link.
 */
export function formatInstagramUrl(handle: string): string {
  const clean = cleanHandle(handle);
  return `https://www.instagram.com/${clean}`;
}

/**
 * Generates personalized, high-converting outreach text for Bay Area parenting influencers.
 */
export function generateCreatorOutreachText(
  options: CreatorOutreachOptions
): CreatorOutreachTemplates {
  const { curatorName, handle, featuredEventTitle, eventUrl } = options;
  const clean = cleanHandle(handle);

  const subject = `Featured on Little Days Out: "${featuredEventTitle}" 🌟`;

  const instagramDm = `Hey @${clean}! 👋 Loved your recommendation for "${featuredEventTitle}". We just featured it on today's Little Days Out calendar for hundreds of local Bay Area parents:

🔗 ${eventUrl}

We made sure to credit and link directly to your profile. Thanks so much for keeping local families in the loop! ✨`;

  const storyShoutout = `🌟 Featured on Little Days Out: Bay Area Family Weekend Calendar! Check out our recommendations at: ${eventUrl}`;

  const emailBody = `Hi ${curatorName},

I wanted to let you know that we featured your recommendation for "${featuredEventTitle}" on Little Days Out (https://www.littledaysout.com), our curated community calendar for Bay Area families.

We've linked directly to your Instagram profile (@${clean}) so local parents can follow you for more recommendations.

Here is your dedicated curation page on our site:
https://www.littledaysout.com/curators/${clean}

Thank you for your wonderful curation for our local community!

Warmly,
The Little Days Out Team`;

  return {
    subject,
    instagramDm,
    storyShoutout,
    emailBody,
  };
}

/**
 * Formats human-readable curator statistics for badges and cards.
 */
export function formatCuratorStats(curator: CuratorSummary) {
  const eventCountLabel =
    curator.eventCount === 1 ? '1 activity curated' : `${curator.eventCount} activities curated`;

  const upcoming = curator.upcomingCount ?? 0;
  const upcomingCountLabel =
    upcoming === 1 ? '1 upcoming' : `${upcoming} upcoming`;

  return {
    eventCountLabel,
    upcomingCountLabel,
    isVerified: curator.isActive,
    instagramUrl: formatInstagramUrl(curator.handle),
  };
}
