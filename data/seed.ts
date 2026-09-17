import { entitySchema, Entity } from "../lib/schema";
const make = (v: Record<string, unknown>): Entity => {
  const e = entitySchema.parse(v);
  return {
    ...e,
    id: e.kind + "-" + e.slug,
    createdAt: "2026-09-17T12:00:00Z",
    updatedAt: "2026-09-17T12:00:00Z",
  };
};
export const seeds: Entity[] = [
  make({
    kind: "groups",
    name: "Rosemont Neighbors",
    slug: "rosemont-neighbors",
    summary: "A neighborhood-wide group for everyone who lives in Rosemont.",
    description:
      "A neighborhood-wide group for Rosemont residents. Ask a neighbor, share something useful, or find a familiar face on your block. Conversation happens in the channels neighbors already use; this page helps you find them.",
    featured: true,
    membership: "open",
    joinInstructions:
      "Follow the group here to keep it in your profile. The WhatsApp invitation will appear here when the organizers have added it.",
    channels: [
      {
        type: "WhatsApp",
        label: "Rosemont Neighbors on WhatsApp",
        instructions:
          "Our organizers are setting up the invitation. Please check back soon.",
        visibility: "residents",
      },
    ],
  }),
  make({
    kind: "events",
    name: "Rosemont Happy Hour",
    slug: "rosemont-happy-hour",
    summary: "A monthly, no-agenda get-together at Rosemont Cellar.",
    description:
      "A monthly get-together for Rosemont neighbors at Rosemont Cellar. The first people to arrive receive a free drink courtesy of a sponsor; the organizer will share sponsor details. Come on your own or bring a neighbor. No agenda, no RSVP required.",
    featured: true,
    start: "2026-04-08T17:00",
    location: "Rosemont Cellar",
    groupId: "groups-rosemont-neighbors",
    recurrence: {
      frequency: "nth-weekday",
      interval: 1,
      weekday: 2,
      nth: 2,
      months: [4, 5, 6, 7, 8, 9, 10],
      until: "",
    },
    rsvp: true,
  }),
  make({
    kind: "resources",
    name: "Alex311 Visibility",
    slug: "alex311-visibility",
    summary: "A clearer view of local service requests.",
    description:
      "An unofficial mirror and visibility tool for Alexandria’s Alex311 system. Explore neighborhood service requests and their progress. This independent tool is not operated by or officially endorsed by the City of Alexandria.",
    website: "https://alex311-visibility.me",
    audienceTags: ["Anyone", "New resident", "Homeowner", "Renter"],
    topicTags: ["City services", "Civic participation"],
    featured: true,
  }),
  make({
    kind: "resources",
    name: "City of Alexandria",
    slug: "city-of-alexandria",
    summary: "Your starting point for city services and information.",
    description:
      "Find official City of Alexandria services, department contacts, public meetings, and community information.",
    website: "https://www.alexandriava.gov/",
    audienceTags: ["Anyone", "New resident"],
    topicTags: ["City services", "Contact information"],
    featured: true,
  }),
  make({
    kind: "resources",
    name: "Explore your neighborhood",
    slug: "neighborhood-maps",
    summary: "Find parks, libraries, transit, and more on the city map.",
    description:
      "The City of Alexandria’s neighborhood viewer brings local facilities and services together on an interactive map.",
    website: "https://www.alexandriava.gov/GIS",
    audienceTags: [
      "New resident",
      "Family with children",
      "Commuter",
      "Cyclist",
    ],
    topicTags: ["Parks", "Transportation", "Neighborhood services"],
  }),
  make({
    kind: "resources",
    name: "Rosemont history archive",
    slug: "rosemont-history",
    summary: "Neighborhood history, photographs, and videos from the Rosemont Citizens Association.",
    description:
      "Explore the Rosemont Citizens Association’s collection of neighborhood history, historic photographs, and documentary videos.",
    website: "https://www.rosemontcitizens.org/history",
    audienceTags: ["Anyone", "New resident"],
    topicTags: ["Local organizations", "Something to do"],
  }),
  make({
    kind: "content",
    name: "Welcome to the Rosemont Club",
    slug: "home-intro",
    summary:
      "Live in Rosemont? You're already in the Club. Use this site to find neighborhood groups, see what's coming up, look up local resources, and weigh in on community questions.",
  }),
  make({
    kind: "content",
    name: "What is The Rosemont Club?",
    slug: "about-club",
    description:
      "The Rosemont Club is a civil association of civic-minded neighbors in Rosemont, Alexandria, Virginia. If you live in Rosemont, you're already a member. There are no dues and no meetings to attend.\n\nThe Club runs this website so neighbors can do four practical things: find neighborhood groups, see what's on the calendar, look up useful local resources, and weigh in on community questions. Renters and homeowners, new arrivals and longtime residents are all welcome. Take part as much or as little as you like.",
  }),
  make({
    kind: "content",
    name: "What the Club is not",
    slug: "about-not",
    description:
      "The Rosemont Club is not an advocacy organization. It does not lobby, endorse candidates, or take positions on behalf of the neighborhood, and it is not affiliated with or endorsed by the City of Alexandria.\n\nWe can point you to resources for reaching the City and other organizations, and we can help you find the right place to raise an issue. We will not represent Rosemont residents to the City or to anyone else unless there is a compelling reason to do so and significant participation in the Club's online voting tools shows where residents actually stand. Even then, the Club reports how neighbors voted rather than claiming to speak for everyone.",
  }),
  make({
    kind: "content",
    name: "The neighborhood",
    slug: "about-neighborhood",
    description:
      "Rosemont is an established Alexandria neighborhood whose streets and homes reflect its beginnings as an early twentieth-century suburb. Its history is visible in everyday places: front porches, tree-lined blocks, and the broad median along Commonwealth Avenue.\n\nThe Club's boundary was supplied by the community and is shown on this page. It is used only for residency checks, and it is not an official City boundary.",
  }),
  make({
    kind: "content",
    name: "A short history",
    slug: "about-history",
    description:
      "Rosemont took shape in 1908 when the Rosemont Development Company acquired and renamed land that had previously been associated with Spring Park. Planned around electric railway access, it grew as a streetcar suburb in the early decades of the twentieth century. The railway stopped operating in 1932, but its route remains legible in the Commonwealth Avenue median. The historic core entered the National Register of Historic Places in 1992.\n\nAlexandria’s history also includes a distinct African American neighborhood historically known as “Colored Rosemont,” now associated with West Braddock. The City’s community history initiative documents the families who built it, beginning with land sales in 1926. These are connected city histories, and their geographic boundaries are not interchangeable.",
    website: "https://www.rosemontcitizens.org/history",
  }),
  make({
    kind: "content",
    name: "How to take part",
    slug: "about-participation",
    description:
      "Start with whatever is useful to you. Follow Rosemont Neighbors, come to an event, suggest a resource, or offer to help maintain a group page. Groups use their own communication tools; this site helps you find them. Group organizers look after their own listings, and site volunteers keep the shared directory tidy.\n\nYou can take part without attending a meeting. Quick polls help organize everyday things. Substantive community questions go to NeighborVote, which is built for a more deliberate consultation.",
  }),
  make({
    kind: "content",
    name: "Ground rules",
    slug: "about-principles",
    description:
      "Be welcoming. Make room for neighbors with different experiences, abilities, schedules, and points of view.\n\nBe useful. Share clear information, keep the listings you own up to date, and help people find the right place to participate.\n\nRespect privacy. Residency checks do not create a household-address database. Private group invitations and meeting details stay with their intended audience.\n\nKeep it simple. Share responsibility, explain decisions, and prefer participation over procedure.",
  }),
  make({
    kind: "content",
    name: "How the Club runs",
    slug: "governance",
    description:
      "The Rosemont Club is run by volunteers. Group organizers look after their own pages, and site volunteers keep the directory in order. Jordan Eccles is the first site administrator. More volunteers are welcome.\n\nHave an idea for a group, an event, or a useful resource? Send it through the form on this page and a volunteer will follow up. You do not need to attend a meeting to take part.\n\nEveryone here speaks for themselves. The Club does not speak for the neighborhood. Quick polls help with dates and preferences; substantive consultations and community decisions use NeighborVote.",
  }),
  ...[
    "Anyone",
    "New resident",
    "Homeowner",
    "Renter",
    "Family with children",
    "Parent",
    "Senior",
    "Pet owner",
    "Commuter",
    "Cyclist",
    "Volunteer",
  ].map((name) =>
    make({
      kind: "tags",
      name,
      slug: "audience-" + name.toLowerCase().replaceAll(" ", "-"),
      scope: "audience",
    }),
  ),
  ...[
    "City services",
    "Neighborhood services",
    "Something to do",
    "Contact information",
    "Transportation",
    "Schools",
    "Childcare",
    "Parks",
    "Civic participation",
    "Utilities",
    "Safety",
    "Homeownership information",
    "Local organizations",
  ].map((name) =>
    make({
      kind: "tags",
      name,
      slug: "topic-" + name.toLowerCase().replaceAll(" ", "-"),
      scope: "topic",
    }),
  ),
];
