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
      "Follow the group here to keep it in your profile, then join the WhatsApp group with the invitation below. The invitation is shown to verified residents.",
    channels: [
      {
        type: "WhatsApp",
        label: "Rosemont Neighbors on WhatsApp",
        url: "https://chat.whatsapp.com/KtTW2Jwgm952ciVogXTDA4",
        instructions:
          "Open the invitation on your phone to join. Please keep the link within the neighborhood.",
        visibility: "residents",
      },
    ],
  }),
  make({
    kind: "groups",
    name: "Brooks Bike Bus",
    slug: "brooks-bike-bus",
    summary:
      "A group bike ride to Naomi L. Brooks Elementary every Friday morning during the school year.",
    description:
      "Families ride together to school on Friday mornings, with adult marshals leading and sweeping each route. Three color-coded routes converge on Brooks by 7:55 a.m. Kids on bikes, scooters, and balance bikes are welcome, as are strollers and adults on foot.\n\nBike Bus procedures:\n• The Bike Bus runs on a schedule, so please arrive on time.\n• One marshal leads the group and a second serves as sweeper. Riders may not pass the leader.\n• Parents are responsible for their children’s safety; marshals will assist with first aid and basic bike repairs if needed.\n• Obey traffic laws, use hand signals, and pass others courteously.\n• Slower riders, joggers, walkers, and young riders should stay to the right to allow passing.\n• If Red or Blue Line riders become separated, regroup at Commonwealth and Oak and continue the route following the crossing guard and traffic signals.",
    website: "https://www.instagram.com/brooksbikebus/",
    membership: "open",
    joinInstructions:
      "Follow @brooksbikebus on Instagram for route maps and announcements, and join the WhatsApp group for weekly updates and your route’s departure time.",
    channels: [
      {
        type: "Instagram",
        label: "@brooksbikebus",
        url: "https://www.instagram.com/brooksbikebus/",
        instructions: "Route maps, photos, and announcements.",
        visibility: "public",
      },
      {
        type: "WhatsApp",
        label: "Brooks Bike Bus on WhatsApp",
        url: "https://chat.whatsapp.com/HSIU0Ym8sm1GmCo1lszDDf",
        instructions:
          "Weekly updates, weather calls, and departure times for each route.",
        visibility: "public",
      },
    ],
  }),
  make({
    kind: "events",
    name: "Brooks Bike Bus",
    slug: "brooks-bike-bus-friday",
    summary: "Ride to school together. Fridays during the school year.",
    description:
      "The weekly Bike Bus to Naomi L. Brooks Elementary. Routes leave from their starting points at staggered times and arrive at Brooks by 7:55 a.m. Check the WhatsApp group for your route’s departure time and for weather cancellations. There is no Bike Bus on days when school is closed.",
    start: "2026-09-04T07:30",
    location: "Naomi L. Brooks Elementary School",
    streetAddress: "600 Russell Rd, Alexandria, VA 22301",
    website: "https://www.instagram.com/brooksbikebus/",
    groupId: "groups-brooks-bike-bus",
    recurrence: {
      frequency: "weekly",
      interval: 1,
      weekday: 4,
      nth: 1,
      months: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
      until: "",
    },
    notes:
      "The 7:30 a.m. start is approximate: each route has its own departure time. Organizers can adjust this listing.",
  }),
  make({
    kind: "groups",
    name: "Brooks PTA",
    slug: "brooks-pta",
    summary:
      "The parent-teacher association for Naomi L. Brooks Elementary School.",
    description:
      "The Brooks PTA funds field trips, classroom supplies, and school events, and runs the Back to School Picnic, Fall Festival, movie nights, the Fun Run, and more. Membership is open to families and community members; members can vote at PTA meetings.\n\nThe PTA publishes its calendar of school and PTA events, which appears below and can be added to your own calendar.",
    website: "https://brookspta.org/",
    membership: "follow",
    joinInstructions:
      "Join or renew your membership on the PTA website. Following the group here keeps it in your profile and does not make you a PTA member.",
    calendarUrl:
      "https://calendar.google.com/calendar/ical/president%40brookspta.org/public/basic.ics",
    channels: [
      {
        type: "Website",
        label: "Join or renew your PTA membership",
        url: "https://brookspta.org/joinpta/",
        instructions: "Online through Givebacks, or by check or cash at the school.",
        visibility: "public",
      },
      {
        type: "Website",
        label: "Contact the PTA",
        url: "https://brookspta.org/about/contact/",
        instructions: "",
        visibility: "public",
      },
    ],
  }),
  make({
    kind: "groups",
    name: "Friday Pizza at Blue Park",
    slug: "friday-pizza",
    summary:
      "Parents and kids who meet at Blue Park for pizza on nice Fridays, spring through fall.",
    description:
      "An informal Friday evening get-together at Blue Park for neighborhood families. One or more families volunteer to order the pizza, and other parents bring drinks, sides, or dessert. Whether it happens on a given Friday depends on the weather and who is around, so the WhatsApp group is where the plan comes together.",
    visibility: "residents",
    membership: "open",
    joinInstructions:
      "Follow the group here, then ask for the WhatsApp invitation through the contact button on this page. The invitation is shared with verified residents.",
    contactRelay: true,
    channels: [
      {
        type: "WhatsApp",
        label: "Friday Pizza on WhatsApp",
        instructions:
          "The organizers share the invitation directly. Use the contact button on this page to ask for it.",
        visibility: "residents",
      },
    ],
  }),
  make({
    kind: "events",
    name: "Friday Pizza Night",
    slug: "friday-pizza-night",
    summary: "Pizza at Blue Park on nice Fridays, spring through fall.",
    description:
      "Bring the kids and something to share. A volunteer family orders the pizza; others bring drinks, sides, or dessert. Check the WhatsApp group to see whether it’s on this week and when people are heading over.",
    visibility: "residents",
    start: "2026-04-03T17:30",
    location: "Blue Park",
    groupId: "groups-friday-pizza",
    recurrence: {
      frequency: "weekly",
      interval: 1,
      weekday: 4,
      nth: 1,
      months: [4, 5, 6, 7, 8, 9, 10],
      until: "",
    },
    notes:
      "The 5:30 p.m. time is a placeholder. Organizers can adjust the time and cancel individual Fridays from the editor.",
  }),
  make({
    kind: "groups",
    name: "W Oak Street Neighbors",
    slug: "w-oak-street",
    summary: "The block email list for households on West Oak Street.",
    description:
      "A block group for neighbors on West Oak Street: the email list is where the block shares news, asks for a hand, and organizes the occasional get-together.\n\nThis group uses an address rule that is tighter than Club residency: the list details are shown to verified residents whose address is on West Oak Street, and to neighbors an organizer has approved.",
    visibility: "residents",
    membership: "request",
    contactRelay: true,
    joinInstructions:
      "Verify your address from your profile. If it is on West Oak Street you will see the list details here right away; otherwise request to join and an organizer will take a look.",
    eligibility: {
      mode: "custom",
      streets: ["W Oak St"],
      addresses: [],
      polygon: [],
      note: "Households on West Oak Street",
    },
    channels: [
      {
        type: "Email",
        label: "W Oak Street email list",
        instructions:
          "The organizers add approved neighbors to the list. Use the contact button on this page to ask.",
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
    name: "Alex311 Reborn",
    slug: "alex311-visibility",
    summary: "A clearer view of local service requests.",
    description:
      "Alex311 Reborn (formerly Alex311 Visibility) is an unofficial mirror and visibility tool for Alexandria’s Alex311 system. Explore neighborhood service requests and their progress. This independent tool is not operated by or officially endorsed by the City of Alexandria.",
    website: "https://alex311visibility.me/",
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
  ...(
    [
      ["Rosemont Citizens Association", "rosemont-citizens-association", "The neighborhood civic association: meetings, newsletter, land use, and history.", "https://www.rosemontcitizens.org/", ["Anyone", "New resident"], ["Local organizations", "Civic participation"]],
      ["RCA email list", "rca-email-list", "Announcements from the Rosemont Citizens Association on groups.io.", "https://groups.io/g/RCA", ["Anyone", "New resident"], ["Local organizations", "News & information"]],
      ["Rosemont contacts and resources (RCA)", "rca-contacts", "The RCA’s longer list of local contacts, businesses, and services.", "https://www.rosemontcitizens.org/rosemont-contacts", ["Anyone", "New resident"], ["Contact information", "Neighborhood services"]],
      ["Alexandria Renew Enterprises", "alexrenew", "Sewer and wastewater service.", "https://alexrenew.com/", ["New resident", "Homeowner", "Renter"], ["Utilities"]],
      ["Virginia American Water", "virginia-american-water", "Water service and billing.", "https://www.amwater.com/vaaw/", ["New resident", "Homeowner", "Renter"], ["Utilities"]],
      ["Dominion Energy", "dominion-energy", "Electric service and outage reporting.", "https://www.dominionenergy.com/virginia", ["New resident", "Homeowner", "Renter"], ["Utilities"]],
      ["Washington Gas", "washington-gas", "Natural gas service. Call 911 and then Washington Gas if you smell gas.", "https://www.washingtongas.com/", ["New resident", "Homeowner", "Renter"], ["Utilities", "Safety"]],
      ["Xfinity", "xfinity", "Cable internet and television.", "https://www.xfinity.com/", ["New resident", "Homeowner", "Renter"], ["Utilities"]],
      ["Verizon", "verizon", "Fios internet, television, and phone.", "https://www.verizon.com/", ["New resident", "Homeowner", "Renter"], ["Utilities"]],
      ["Naomi L. Brooks Elementary School", "naomi-brooks-elementary", "Rosemont’s neighborhood elementary school (ACPS).", "https://nlb.acps.k12.va.us/", ["Family with children", "Parent", "New resident"], ["Schools"]],
      ["George Washington Middle School", "gw-middle-school", "The ACPS middle school serving Rosemont.", "https://gw.acps.k12.va.us/", ["Family with children", "Parent", "New resident"], ["Schools"]],
      ["Alexandria City High School", "alexandria-city-high-school", "The city’s public high school.", "https://achs.acps.k12.va.us/", ["Family with children", "Parent", "New resident"], ["Schools"]],
      ["Alexandria School Board", "alexandria-school-board", "Meetings, members, and policies for Alexandria City Public Schools.", "https://www.acps.k12.va.us/board", ["Parent", "Anyone"], ["Schools", "Civic participation"]],
      ["Beach Park", "beach-park", "Neighborhood park with a playground.", "https://www.alexandriava.gov/parks/location/beach-park", ["Anyone", "Family with children", "Pet owner"], ["Parks"]],
      ["Hooff’s Run Park and Greenway", "hooffs-run-park", "Greenway trail and park along Hooff’s Run.", "https://www.alexandriava.gov/parks/location/hooffs-run-park-greenway", ["Anyone", "Cyclist", "Pet owner"], ["Parks", "Transportation"]],
      ["Sunset Mini Park", "sunset-mini-park", "Small neighborhood park.", "https://www.alexandriava.gov/parks/location/sunset-mini-park", ["Anyone", "Family with children"], ["Parks"]],
      ["Commonwealth Avenue and Braddock Road park", "commonwealth-braddock-park", "The green at Commonwealth Avenue and Braddock Road.", "https://www.alexandriava.gov/parks/location/braddock-rd-commonwealth", ["Anyone"], ["Parks"]],
      ["Alexandria City Council", "alexandria-city-council", "Council members, meeting schedules, agendas, and how to speak at a meeting.", "https://www.alexandriava.gov/Council", ["Anyone"], ["City services", "Civic participation", "Elected officials"]],
      ["Alexandria Police Department", "alexandria-police", "Non-emergency contacts, reporting, and community programs. Call 911 in an emergency.", "https://www.alexandriava.gov/Police", ["Anyone", "New resident"], ["Safety", "City services"]],
      ["Transportation and Environmental Services", "alexandria-tes", "Streets, trash and recycling, parking, stormwater, and traffic.", "https://www.alexandriava.gov/tes", ["Anyone", "Homeowner", "Renter", "Cyclist"], ["City services", "Transportation", "Neighborhood services"]],
      ["Voter Registration and Elections", "alexandria-elections", "Register to vote, find your polling place, and see what’s on the ballot.", "https://www.alexandriava.gov/Elections", ["Anyone", "New resident"], ["Civic participation", "Elected officials"]],
      ["Find your Virginia legislators", "virginia-legislators", "Look up your state senator and delegate by address.", "https://whosmy.virginiageneralassembly.gov/", ["Anyone"], ["Elected officials", "Civic participation"]],
      ["U.S. Representative Don Beyer", "rep-don-beyer", "Virginia’s 8th District office, casework, and constituent services.", "https://beyer.house.gov/", ["Anyone"], ["Elected officials"]],
      ["Alexandria eNews", "alexandria-enews", "Official City email newsletters and alerts.", "https://enews.alexandriava.gov/", ["Anyone", "New resident"], ["News & information", "City services"]],
      ["Alexandria Times", "alexandria-times", "Weekly local newspaper.", "https://alextimes.com/", ["Anyone"], ["News & information"]],
      ["ALXnow", "alxnow", "Daily local news site.", "https://www.alxnow.com/", ["Anyone"], ["News & information"]],
      ["The Zebra", "the-zebra", "Community news and events magazine.", "https://thezebra.org/", ["Anyone"], ["News & information"]],
      ["Alexandria Federation of Civic Associations", "alexandria-federation-civic-associations", "The citywide federation of neighborhood civic associations.", "https://alexafca.org/", ["Anyone", "Volunteer"], ["Local organizations", "Civic participation"]],
      ["Volunteer Alexandria", "volunteer-alexandria", "Find volunteer opportunities across the city.", "https://www.volunteeralexandria.org/", ["Volunteer", "Anyone"], ["Local organizations", "Something to do"]],
      ["Rosemont Cellar", "rosemont-cellar", "Neighborhood wine shop and bar, and home of the Rosemont Happy Hour.", "https://www.rosemontcellar.com/", ["Anyone"], ["Something to do"]],
    ] as [string, string, string, string, string[], string[]][]
  ).map(([name, slug, summary, website, audienceTags, topicTags]) =>
    make({
      kind: "resources",
      name,
      slug,
      summary,
      description: summary,
      website,
      audienceTags,
      topicTags,
    }),
  ),
  make({
    kind: "polls",
    name: "Should the Club list advocacy groups in the Groups directory?",
    slug: "advocacy-groups-in-directory",
    summary:
      "A quick poll on whether groups organized around advocacy belong in the community groups directory.",
    description:
      "The Rosemont Club itself is not an advocacy organization and does not take positions on behalf of the neighborhood. Some neighbors have asked whether groups that do advocate, for example on traffic, zoning, or schools, should be listed in the Groups directory alongside social and practical groups.\n\nThis is a quick read of neighborhood opinion, not a binding decision. One response per verified resident.",
    visibility: "residents",
    options: [
      "Yes, list them like any other group",
      "Yes, but clearly labeled as advocacy groups",
      "No, keep the directory to non-advocacy groups",
    ],
    closes: "2026-12-31T23:59:00-05:00",
    resultsVisibility: "after-vote",
  }),
  make({
    kind: "content",
    name: "On the website",
    slug: "guidelines-site",
    summary:
      "How we use rosemont.club: groups, events, resources, polls, and the messages you send through it.",
    description:
      "Be a good neighbor. Assume good intent, be welcoming to people who are new or different from you, and disagree without being disagreeable.\n\nKeep it about Rosemont. Post things that are useful to neighbors: groups, gatherings, local resources, and questions about the neighborhood. Give listings clear names and accurate details, and update or archive the ones you own when they change.\n\nRespect privacy. Don’t post anyone’s home address, phone number, or email without their permission, and don’t post photos of neighbors or children without asking. Invitations marked for residents stay with residents; please don’t share them outside the neighborhood.\n\nNo campaigning. The Club is not an advocacy organization and doesn’t take positions on behalf of the neighborhood. Listings and polls are not a place to lobby, endorse candidates, or organize campaigns. Quick polls are a read of opinion, not a decision; substantive community questions go to NeighborVote.\n\nNo advertising. Recommending a plumber or a restaurant is welcome. Repeated promotion, ads, and solicitations are not. Sponsors of events are named on the event listing.\n\nStay safe and legal. No harassment, threats, hate, or accusations against identifiable people. Call 911 in an emergency. Report city service problems through Alex311, not here.\n\nWho looks after what. Group organizers and listing owners are responsible for their own pages. Site volunteers may edit or archive content that breaks these guidelines and may remove access from accounts that repeatedly do. If you have a question or think something was handled wrongly, send a note to the volunteers from the Community questions page.",
  }),
  make({
    kind: "content",
    name: "In the Rosemont Neighbors WhatsApp group",
    slug: "guidelines-whatsapp",
    summary:
      "The neighborhood-wide chat is for residents. A few habits keep it useful for everyone.",
    description:
      "Who it’s for. The group is for people who live in Rosemont. The invitation is shared with verified residents on this site; please don’t forward it outside the neighborhood.\n\nGood things to post. Neighborhood news and heads-ups, questions, lost and found, recommendations, offers of help, and reminders about gatherings.\n\nThings to keep out. Political campaigning and endorsements, advocacy drives, ads and sales pitches, chain messages and forwards, and anything you wouldn’t say to a neighbor’s face.\n\nPrivacy. Don’t share other people’s contact details, addresses, or photos without asking, and keep children out of photos and posts unless their parents share them. What’s said in the group stays in the group.\n\nSafety. For emergencies call 911; for non-emergencies contact the Alexandria Police. Please don’t post license plates, faces, or accusations about people you don’t know.\n\nManners. One topic per message, use the reply feature so threads stay readable, take long back-and-forths to a direct message, and keep late-night messages for things that can’t wait. If the group gets busy, mute it rather than leaving.\n\nModeration. Group admins may remove messages or members that don’t follow these guidelines. Questions about the group can go to the organizers through the Rosemont Neighbors page on this site.",
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
    "News & information",
    "Elected officials",
  ].map((name) =>
    make({
      kind: "tags",
      name,
      slug:
        "topic-" +
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      scope: "topic",
    }),
  ),
];
