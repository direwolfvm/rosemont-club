"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowUpRight,
  ArrowRight,
  Leaf,
  Users,
  CalendarDays,
  Compass,
  MessageCircle,
  Globe,
  MapPin,
  LockKeyhole,
  Search,
  Check,
  Mail,
  Menu,
  X,
  Settings,
  ShieldCheck,
  Plus,
  LogOut,
} from "lucide-react";
import { Card, Entity, Member, canManage } from "@/lib/schema";
import { occurrences, googleCalendar } from "@/lib/events";
import boundary from "@/data/rosemont-boundary.json";
import {
  api,
  clientAuth,
  downloadCalendar,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from "./client";
import Editor from "./Editor";
import HistoryCarousel from "./HistoryCarousel";
import { buildTimeline, type TimelineItem, type Rsvp } from "@/lib/following";
const labels: Record<string, string> = {
  groups: "Groups",
  events: "Events",
  resources: "Resources",
  governance: "Community questions",
  about: "About",
  guidelines: "Community guidelines",
  following: "Following",
  privacy: "Privacy",
  support: "Support",
  polls: "Quick polls",
  consultations: "Consultations",
  content: "Site content",
  tags: "Tags",
};
const audience = (v?: string) =>
  v === "residents"
    ? "Verified residents"
    : v === "members"
      ? "Club members"
      : "Everyone welcome";
const displayDate = (
  s: string,
  options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    weekday: "long",
  },
) =>
  new Date(s + "Z").toLocaleDateString("en-US", {
    ...options,
    timeZone: "UTC",
  });
/** Icon for a group's communication channel. Brand marks (WhatsApp, Instagram, Facebook) are drawn inline; the icon set no longer ships them. */
function ChannelIcon({ type }: { type: string }) {
  const key = type.toLowerCase();
  return (
    <span className={"channel-icon " + key} aria-hidden="true">
      {key === "whatsapp" ? (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ) : key === "instagram" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ) : key === "facebook" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ) : key === "email" ? (
        <Mail />
      ) : key === "website" ? (
        <Globe />
      ) : (
        <MessageCircle />
      )}
    </span>
  );
}
const easternDate = (iso: string, allDay: boolean) =>
  allDay
    ? new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : new Date(iso).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      });
/** Upcoming events from a group's published calendar, fetched through the server. */
function GroupCalendar({ id, url }: { id: string; url: string }) {
  const [feed, setFeed] = useState<{
    name: string;
    events: {
      start: string;
      end: string;
      allDay: boolean;
      summary: string;
      location: string;
      url: string;
    }[];
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api("entities/" + id + "/calendar-feed")
      .then(setFeed)
      .catch(() => setFailed(true));
  }, [id]);
  return (
    <>
      <h2>{feed?.name ? "From the " + feed.name + " calendar" : "Group calendar"}</h2>
      {failed ? (
        <p className="muted">The group’s calendar could not be loaded right now.</p>
      ) : !feed ? (
        <p className="muted">Loading the calendar…</p>
      ) : !feed.events.length ? (
        <p className="muted">Nothing scheduled in the next few months.</p>
      ) : (
        <ul className="feed-list">
          {feed.events.map((item, i) => (
            <li key={i}>
              <time dateTime={item.start}>
                {easternDate(item.start, item.allDay)}
                {item.allDay && <small>All day</small>}
              </time>
              <span>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.summary}
                  </a>
                ) : (
                  item.summary
                )}
                {item.location && <small>{item.location}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="feed-actions">
        <a
          href={
            "https://calendar.google.com/calendar/r?cid=" +
            encodeURIComponent(url)
          }
          target="_blank"
          rel="noreferrer"
        >
          Add to Google Calendar <ArrowUpRight size={13} />
        </a>
        <a href={url.replace(/^https:/, "webcal:")}>
          Subscribe (Apple, Outlook) <ArrowUpRight size={13} />
        </a>
        <a href={url} target="_blank" rel="noreferrer">
          Download .ics <ArrowUpRight size={13} />
        </a>
      </div>
    </>
  );
}
/** Write to the organizers without seeing their address; the reply goes to the sender's account email. */
function ContactRelay({
  entity,
  user,
  signIn,
  notify,
}: {
  entity: Entity;
  user: Member | null;
  signIn: () => void;
  notify: (s: string) => void;
}) {
  const [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="side-card contact-form">
      <Mail />
      <h2>Contact the organizers</h2>
      <p>
        Your message is emailed to the organizers. Their address stays private;
        they reply to your account email.
      </p>
      {user ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("entities/" + entity.id + "/contact", "POST", {
                subject,
                message,
              });
              setSubject("");
              setMessage("");
              notify("Your message is on its way to the organizers.");
            } catch (err) {
              notify((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Subject
            <input
              required
              minLength={3}
              maxLength={150}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label>
            Message
            <textarea
              required
              minLength={10}
              maxLength={3000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <small>Please don’t include your home address.</small>
          <button disabled={busy} className="wide">
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      ) : (
        <button className="wide" onClick={signIn}>
          Sign in to send a message
        </button>
      )}
    </div>
  );
}
/** Upcoming items across followed groups, in one ordered list. */
function TimelineList({ items }: { items: TimelineItem[] }) {
  if (!items.length)
    return (
      <p className="quiet-empty">
        Nothing scheduled in the next couple of months from the groups you
        follow.
      </p>
    );
  return (
    <ul className="timeline-list">
      {items.map((item, i) => (
        <li key={i}>
          <time dateTime={item.date}>
            {item.external
              ? easternDate(item.date, item.allDay)
              : displayDate(item.date, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }) +
                " · " +
                new Date(item.date + "Z").toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "UTC",
                })}
          </time>
          <span>
            {item.external && item.href.startsWith("http") ? (
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.title} <ArrowUpRight size={12} />
              </a>
            ) : (
              <Link href={item.href}>{item.title}</Link>
            )}
            <small>
              {item.groupName}
              {item.location ? " · " + item.location : ""}
              {item.external ? " · from the group’s calendar" : ""}
            </small>
          </span>
          {item.going && <span className="badge-going">Going</span>}
        </li>
      ))}
    </ul>
  );
}
function Following({
  user,
  records,
  activity,
  refreshActivity,
  notify,
  renderCard,
}: {
  user: Member;
  records: Card[];
  activity: { groups: { entityId: string; status: string }[]; events: Rsvp[] };
  refreshActivity: () => Promise<void>;
  notify: (s: string) => void;
  renderCard: (e: Card) => React.ReactNode;
}) {
  const followedIds = activity.groups
    .filter((g) => ["following", "member"].includes(g.status))
    .map((g) => g.entityId);
  const requestedIds = activity.groups
    .filter((g) => g.status === "requested")
    .map((g) => g.entityId);
  const groups = followedIds
    .map((id) => records.find((r) => r.kind === "groups" && r.id === id))
    .filter((g): g is Card => !!g);
  const requested = requestedIds
    .map((id) => records.find((r) => r.kind === "groups" && r.id === id))
    .filter((g): g is Card => !!g);
  const [feeds, setFeeds] = useState<Record<string, never[]>>({});
  const feedKey = groups
    .filter((g) => g.calendarUrl)
    .map((g) => g.id)
    .join(",");
  useEffect(() => {
    let cancelled = false;
    const targets = feedKey ? feedKey.split(",") : [];
    Promise.all(
      targets.map((id) =>
        api("entities/" + id + "/calendar-feed")
          .then((f) => [id, f.events] as const)
          .catch(() => [id, []] as const),
      ),
    ).then((pairs) => {
      if (!cancelled) setFeeds(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [feedKey]);
  const items = buildTimeline({
    followedGroupIds: followedIds,
    records,
    rsvps: activity.events,
    feeds,
  });
  async function unfollow(g: Card) {
    try {
      await api("entities/" + g.id + "/join", "POST", { join: false });
      await refreshActivity();
      notify("You are no longer following " + g.name + ".");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  if (!groups.length && !requested.length && !activity.events.some((r) => r.attending))
    return (
      <>
        <div className="empty">
          <Users />
          <h2>You’re not following any groups yet</h2>
          <p>
            Follow a group and its gatherings, calendar, and chats show up
            here in one place.
          </p>
          <Link className="button" href="/groups">
            Browse groups <ArrowRight size={16} />
          </Link>
        </div>
        <section className="home-section" data-pillar="groups">
          <div className="section-heading">
            <div>
              <span className="eyebrow pillar-label">Groups</span>
              <h2>A few to start with</h2>
            </div>
          </div>
          <div className="card-grid">
            {records
              .filter((r) => r.kind === "groups" && !r.locked)
              .sort((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 3)
              .map(renderCard)}
          </div>
        </section>
      </>
    );
  return (
    <>
      <section className="home-section" data-pillar="events">
        <div className="section-heading">
          <div>
            <span className="eyebrow pillar-label">Events</span>
            <h2>Coming up for you</h2>
          </div>
          <Link href="/events">
            All events <ArrowRight size={16} />
          </Link>
        </div>
        <TimelineList items={items} />
      </section>
      <section className="home-section" data-pillar="groups">
        <div className="section-heading">
          <div>
            <span className="eyebrow pillar-label">Groups</span>
            <h2>Groups you follow</h2>
          </div>
          <Link href="/groups">
            Find more <ArrowRight size={16} />
          </Link>
        </div>
        <div className="following-grid">
          {groups.map((g) => (
            <article className="side-card following-card" key={g.id}>
              <Link href={"/groups/" + g.slug}>
                <h3>{g.name}</h3>
              </Link>
              <p>{g.summary}</p>
              {g.channels?.length ? (
                <ul className="channel-links">
                  {g.channels.map((c, i) => (
                    <li key={i}>
                      <ChannelIcon type={c.type} />
                      {c.locked ? (
                        <span className="muted">
                          {c.label || c.type} · {audience(c.visibility).toLowerCase()}
                        </span>
                      ) : c.url ? (
                        <a href={c.url} target="_blank" rel="noreferrer">
                          {c.label || "Open " + c.type} <ArrowUpRight size={12} />
                        </a>
                      ) : c.email ? (
                        <a href={"mailto:" + c.email}>{c.label || c.email}</a>
                      ) : (
                        <span>{c.label || c.type}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="actions">
                <Link className="text-link" href={"/groups/" + g.slug}>
                  Group page <ArrowRight size={14} />
                </Link>
                <button className="text-button" onClick={() => void unfollow(g)}>
                  Unfollow
                </button>
              </div>
            </article>
          ))}
        </div>
        {requested.length > 0 && (
          <>
            <h3 className="requested-heading">Waiting on an organizer</h3>
            {requested.map((g) => (
              <div className="list-link" key={g.id}>
                <span>
                  <Link href={"/groups/" + g.slug}>{g.name}</Link>
                  <small>Join request sent</small>
                </span>
                <button className="text-button" onClick={() => void unfollow(g)}>
                  Withdraw
                </button>
              </div>
            ))}
          </>
        )}
      </section>
    </>
  );
}
function NeighborhoodMap() {
  const coords = boundary.features[0].geometry.coordinates as number[][][][];
  const project = (p: number[]) => [
    (p[0] + 77.079) * 16000,
    420 - (p[1] - 38.804) * 21000,
  ];
  const path = coords
    .map((p) =>
      p
        .map((r) => "M" + r.map((c) => project(c).join(",")).join(" L") + " Z")
        .join(" "),
    )
    .join(" ");
  return (
    <svg
      className="neighborhood-map"
      viewBox="0 0 460 430"
      role="img"
      aria-label="Outline of the Rosemont Club neighborhood boundary supplied by the community"
    >
      <defs>
        <pattern
          id="grid"
          width="39"
          height="39"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-25)"
        >
          <path d="M39 0H0V39" fill="none" stroke="#c5d2e1" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="460" height="430" fill="#e6edf6" />
      <rect width="460" height="430" fill="url(#grid)" />
      <path
        d={path}
        fill="#a9c2dc"
        fillOpacity=".75"
        stroke="#52799f"
        strokeWidth="2"
        strokeDasharray="6 4"
      />
      <circle cx="230" cy="223" r="32" fill="#faf8ed" />
      <path
        d="M225 232v-20m0 10c-11 1-13-9-10-13 9-1 13 5 10 13m1-5c-1-9 7-13 12-11 2 8-4 13-12 11"
        stroke="#315f8c"
        fill="#315f8c"
        strokeWidth="2"
      />
      <text
        x="230"
        y="279"
        textAnchor="middle"
        fill="#2d557a"
        fontSize="19"
        fontFamily="Georgia,serif"
      >
        Rosemont
      </text>
      <text
        x="230"
        y="299"
        textAnchor="middle"
        fill="#4c7095"
        fontSize="9"
        letterSpacing="2"
      >
        ALEXANDRIA, VIRGINIA
      </text>
      <path d="M406 59V30l-5 9m5-9 5 9" stroke="#4c7095" fill="none" />
      <text x="402" y="22" fill="#4c7095" fontSize="10">
        N
      </text>
      <text x="22" y="407" fill="#4c7095" fontSize="9">
        CLUB BOUNDARY · COMMUNITY PROVIDED
      </text>
    </svg>
  );
}
function AuthDialog({
  close,
  notify,
}: {
  close: () => void;
  notify: (s: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const a = await clientAuth();
      if (mode === "reset") {
        await sendPasswordResetEmail(a, email);
        notify("If an account exists, a password reset email is on its way.");
        close();
      } else if (mode === "signup") {
        const result = await createUserWithEmailAndPassword(a, email, password);
        await sendEmailVerification(result.user);
        notify("Welcome! Check your inbox to verify your email.");
        close();
      } else {
        await signInWithEmailAndPassword(a, email, password);
        close();
      }
    } catch {
      setError(
        "We could not complete that request. Check your details and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog ref={ref} onCancel={close} aria-labelledby="auth-title">
      <div className="dialog-top">
        <Leaf />
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close sign in"
        >
          <X />
        </button>
      </div>
      <span className="eyebrow">The Rosemont Club</span>
      <h2 id="auth-title">
        {mode === "signup"
          ? "Create an account"
          : mode === "reset"
            ? "Reset your password"
            : "Sign in"}
      </h2>
      <p>One account for The Rosemont Club and Alex311 Reborn.</p>
      {mode !== "reset" && (
        <button
          className="secondary wide"
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true);
              await signInWithPopup(
                await clientAuth(),
                new GoogleAuthProvider(),
              );
              close();
            } catch {
              setError("Google sign-in did not finish. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Continue with Google <ArrowUpRight size={16} />
        </button>
      )}
      <form onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== "reset" && (
          <label>
            Password
            <input
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={mode === "signup" ? 8 : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <button className="wide" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : mode === "reset"
                ? "Send reset email"
                : "Sign in with email"}
        </button>
      </form>
      <div className="auth-links">
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError("");
          }}
        >
          {mode === "signup"
            ? "Already a member? Sign in"
            : "New here? Create an account"}
        </button>
        <button className="text-button" onClick={() => setMode("reset")}>
          Forgot password?
        </button>
      </div>
      <small>
        We use the existing Firebase sign-in service. Your profile and Club
        permissions stay separate.
      </small>
    </dialog>
  );
}
function Confirm({
  title,
  text,
  onConfirm,
  onClose,
}: {
  title: string;
  text: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p>{text}</p>
      {error && <p role="alert">{error}</p>}
      <div className="actions">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Confirm
        </button>
        <button disabled={busy} className="secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
export default function Club({ path }: { path: string[] }) {
  const section = path[0] || "home";
  const [records, setRecords] = useState<Card[]>([]),
    [user, setUser] = useState<Member | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [authOpen, setAuthOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<{
      entity?: Entity;
      kind: string;
    } | null>(null),
    [confirm, setConfirm] = useState<{
      title: string;
      text: string;
      run: () => Promise<void>;
    } | null>(null);
  const [query, setQuery] = useState(""),
    [who, setWho] = useState(""),
    [need, setNeed] = useState("");
  const [activity, setActivity] = useState<{
    groups: { entityId: string; status: string }[];
    events: Rsvp[];
  }>({ groups: [], events: [] });
  const refreshActivity = async () => {
    if (!user) {
      setActivity({ groups: [], events: [] });
      return;
    }
    try {
      setActivity(await api("activity"));
    } catch {
      /* stays as it was */
    }
  };
  useEffect(() => {
    void refreshActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const followedIds = activity.groups
    .filter((g) => ["following", "member"].includes(g.status))
    .map((g) => g.entityId);
  async function refresh() {
    setError("");
    try {
      const [data, me] = await Promise.all([
        api("entities"),
        clientAuth().then((a) => (a.currentUser ? api("me") : null)),
      ]);
      setRecords(data);
      setUser(me);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let unsub = () => {};
    clientAuth()
      .then((a) => {
        unsub = onAuthStateChanged(a, () => {
          setRecords([]);
          setLoading(true);
          void refresh();
        });
      })
      .catch(() => {
        setError(
          "Sign-in configuration is unavailable. Please try again later.",
        );
        setLoading(false);
      });
    return () => unsub();
  }, []);
  useEffect(() => {
    setEditing(null);
    setQuery("");
    setWho("");
    setNeed("");
    setMobile(false);
  }, [section, path[1]]);
  const entities = records as Entity[];
  const find = (slug: string) =>
    entities.find((e) => e.kind === "content" && e.slug === slug);
  const list = (kind: string) =>
    records.filter(
      (r) =>
        r.kind === kind &&
        (!r.status || r.status === "active" || r.status === "cancelled"),
    );
  const msg = (s: string) => setNotice(s);
  const act = async (fn: () => Promise<unknown>, message?: string) => {
    try {
      await fn();
      if (message) msg(message);
    } catch (e) {
      msg((e as Error).message);
    }
  };
  const requireSignIn = () => {
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    return true;
  };
  const nextEvent = list("events")
    .filter((e) => !e.locked && e.status === "active")
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .map((e) => ({ event: e as Entity, date: occurrences(e as Entity)[0] }))
    .filter((x) => x.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const iconFor = (kind: string) =>
    kind === "events" ? (
      <CalendarDays />
    ) : kind === "groups" ? (
      <Users />
    ) : kind === "resources" ? (
      <Compass />
    ) : (
      <MessageCircle />
    );
  function card(e: Card) {
    const date =
      e.kind === "events" && !e.locked
        ? occurrences(e as Entity)[0]
        : undefined;
    return (
      <Link
        className={"content-card " + e.kind}
        key={e.id}
        href={`/${e.kind}/${e.slug}`}
      >
        <div className="card-top">
          <span className="tile-icon">{iconFor(e.kind)}</span>
          <span className="small-tag">
            {e.locked ? (
              <>
                <LockKeyhole size={12} />
                {audience(e.visibility)}
              </>
            ) : e.kind === "groups" ? (
              "Neighborhood group"
            ) : e.kind === "events" ? (
              e.status === "cancelled" ? (
                "Cancelled"
              ) : (
                "Event"
              )
            ) : (
              e.topicTags?.[0] || "Local resource"
            )}
          </span>
          <ArrowUpRight className="card-arrow" size={18} />
        </div>
        {date && (
          <div className="event-date">
            {displayDate(date, { month: "short", day: "numeric" })}
            <span>
              {new Date(date + "Z").toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "UTC",
              })}
            </span>
          </div>
        )}
        <h3>{e.name}</h3>
        <p>
          {e.locked
            ? "Details available to " +
              audience(e.visibility).toLowerCase() +
              "."
            : e.summary}
        </p>
        <div className="card-bottom">
          {e.kind === "events" && !e.locked ? (
            <>
              <MapPin size={14} />
              {e.location}
            </>
          ) : e.kind === "groups" ? (
            <>
              View group
              {(e.locked
                ? e.channelTypes || []
                : [...new Set((e.channels || []).map((c) => c.type))]
              ).length ? (
                <span className="card-channels">
                  {(e.locked
                    ? e.channelTypes || []
                    : [...new Set((e.channels || []).map((c) => c.type))]
                  ).map((type) => (
                    <ChannelIcon key={type} type={type} />
                  ))}
                </span>
              ) : null}
            </>
          ) : e.kind === "resources" ? (
            "View resource"
          ) : (
            "View details"
          )}
          <ArrowRight size={16} />
        </div>
      </Link>
    );
  }
  const finder = (
    <div className="finder-controls">
      <label>
        <span>Who are you?</span>
        <select value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">Everyone / any neighbor</option>
          {entities
            .filter(
              (r) =>
                r.kind === "tags" &&
                r.scope === "audience" &&
                r.status === "active",
            )
            .map((t) => (
              <option key={t.id}>{t.name}</option>
            ))}
        </select>
      </label>
      <label>
        <span>What are you looking for?</span>
        <select value={need} onChange={(e) => setNeed(e.target.value)}>
          <option value="">All topics</option>
          {entities
            .filter(
              (r) =>
                r.kind === "tags" &&
                r.scope === "topic" &&
                r.status === "active",
            )
            .map((t) => (
              <option key={t.id}>{t.name}</option>
            ))}
        </select>
      </label>
    </div>
  );
  const filteredResources = list("resources").filter((e) =>
    !e.locked
      ? (!who ||
          e.audienceTags?.includes(who) ||
          e.audienceTags?.includes("Anyone")) &&
        (!need || e.topicTags?.includes(need)) &&
        (!query ||
          [
            e.name,
            e.summary,
            e.description,
            ...(e.audienceTags || []),
            ...(e.topicTags || []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()))
      : !who && !need && e.name.toLowerCase().includes(query.toLowerCase()),
  );
  function questions() {
    const polls = list("polls");
    const consultations = list("consultations");
    return (
      <>
        <div className="question-panel">
          <div className="question-icon">
            <MessageCircle size={29} />
          </div>
          <div>
            <span className="eyebrow">How it works</span>
            <h3>Quick polls here. Bigger questions on NeighborVote.</h3>
            <p>
              Quick polls sort out everyday things like dates and preferences.
              Substantive community questions go to NeighborVote, which is built
              for a more deliberate consultation.
            </p>
          </div>
          <a
            className="secondary"
            href="https://neighborvote.online"
            target="_blank"
            rel="noreferrer"
          >
            Visit NeighborVote <ArrowUpRight size={16} />
          </a>
        </div>
        {consultations.length > 0 && (
          <div className="card-grid">{consultations.map(card)}</div>
        )}
        {polls.length > 0 ? (
          <div className="card-grid">{polls.map(card)}</div>
        ) : (
          <p className="quiet-empty">
            No quick polls are open right now. Have a question the
            neighborhood should weigh in on?{" "}
            <Link href="/governance">
              Send it to the volunteers <ArrowRight size={14} />
            </Link>
          </p>
        )}
      </>
    );
  }
  const detail = path[1]
    ? records.find((r) => r.kind === section && r.slug === path[1])
    : undefined;
  let content: React.ReactNode;
  if (editing && user)
    content = (
      <Editor
        entity={editing.entity}
        kind={editing.kind}
        user={user}
        records={entities}
        onClose={() => setEditing(null)}
        onSave={() => {
          setEditing(null);
          void refresh();
          msg("Your changes are saved.");
        }}
      />
    );
  else if (path[1] && kinds.includes(section))
    content = loading ? (
      <p className="loading">Finding that page…</p>
    ) : detail ? (
      <Detail
        item={detail}
        user={user}
        records={records}
        signIn={() => setAuthOpen(true)}
        notify={msg}
        edit={() => setEditing({ entity: detail as Entity, kind: section })}
      />
    ) : (
      <div className="empty">
        <h1>We couldn’t find that page.</h1>
        <p>It may be unpublished or no longer available.</p>
        <Link href={"/" + section}>Back to {labels[section]}</Link>
      </div>
    );
  else if (section === "home")
    content = (
      <>
        <section className="hero">
          <div className="hero-copy">
            <div className="location-label">
              <span /> Rosemont · Alexandria, VA
            </div>
            <h1>
              {find("home-intro")?.name || "Welcome to the Rosemont Club"}
            </h1>
            <p>
              {find("home-intro")?.summary ||
                "Live in Rosemont? You're already in the Club. Use this site to find neighborhood groups, see what's coming up, look up local resources, and weigh in on community questions."}
            </p>
            <div className="actions">
              <Link className="button" href="/groups">
                Browse groups <ArrowRight size={17} />
              </Link>
              <Link className="text-link" href="/about">
                About the Club <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="hero-note">
              <Leaf size={15} /> Free, volunteer-run, and open to everyone who
              lives in Rosemont.
            </div>
          </div>
          <HistoryCarousel />
        </section>
        <section className="pillars" aria-label="What you can do here">
          {[
            {
              slug: "groups",
              pillar: "groups",
              title: "Groups",
              text: "Find neighborhood groups and the chats, email lists, and channels they use.",
              cta: "Browse groups",
            },
            {
              slug: "events",
              pillar: "events",
              title: "Events",
              text: "See what's on the Rosemont calendar, RSVP, and add dates to your own calendar.",
              cta: "See the calendar",
            },
            {
              slug: "resources",
              pillar: "resources",
              title: "Resources",
              text: "Useful local links, sorted by who you are and what you need.",
              cta: "Find a resource",
            },
            {
              slug: "governance",
              pillar: "questions",
              title: "Community questions",
              text: "Quick polls for everyday decisions, and NeighborVote for the substantive ones.",
              cta: "Have your say",
            },
          ].map((p) => (
            <Link
              href={"/" + p.slug}
              key={p.slug}
              className="pillar"
              data-pillar={p.pillar}
            >
              <span className="pillar-icon">{iconFor(p.pillar)}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <span className="pillar-cta">
                {p.cta} <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </section>
        {user && followedIds.length > 0 && (
          <section className="home-section" data-pillar="groups">
            <div className="section-heading">
              <div>
                <span className="eyebrow pillar-label">Following</span>
                <h2>Coming up for you</h2>
              </div>
              <Link href="/following">
                Everything you follow <ArrowRight size={16} />
              </Link>
            </div>
            <TimelineList
              items={buildTimeline({
                followedGroupIds: followedIds,
                records,
                rsvps: activity.events,
                limit: 4,
              })}
            />
          </section>
        )}
        <section className="home-section" data-pillar="events">
          <div className="section-heading">
            <div>
              <span className="eyebrow pillar-label">Events</span>
              <h2>Coming up</h2>
            </div>
            <Link href="/events">
              All events <ArrowRight size={16} />
            </Link>
          </div>
          {nextEvent ? (
            <Link
              href={"/events/" + nextEvent.event.slug}
              className="featured-event"
            >
              <div className="big-date">
                <span>{displayDate(nextEvent.date, { month: "short" })}</span>
                <strong>
                  {displayDate(nextEvent.date, { day: "numeric" })}
                </strong>
                <small>
                  {displayDate(nextEvent.date, { weekday: "long" })}
                </small>
              </div>
              <div className="featured-event-copy">
                <span className="eyebrow">Next event</span>
                <h3>{nextEvent.event.name}</h3>
                <p>{nextEvent.event.summary}</p>
                <div className="event-meta">
                  <span>
                    <CalendarDays size={15} />{" "}
                    {new Date(nextEvent.date + "Z").toLocaleTimeString(
                      "en-US",
                      { hour: "numeric", minute: "2-digit", timeZone: "UTC" },
                    )}{" "}
                    · Eastern time
                  </span>
                  <span>
                    <MapPin size={15} /> {nextEvent.event.location}
                  </span>
                </div>
              </div>
              <div className="event-art" aria-hidden="true">
                <svg viewBox="0 0 160 130">
                  <path
                    d="M35 25h38v45q-19 28-38 0Z M91 25h38v45q-19 28-38 0Z M54 88v30m-16 0h32m40-30v30m-16 0h32"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                  <path
                    d="M36 49h36v20q-18 25-36 0Z M92 49h36v20q-18 25-36 0Z"
                    fill="currentColor"
                    opacity=".25"
                  />
                  <path
                    d="m78 18 5-11m8 15 9-7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <ArrowUpRight className="featured-arrow" size={24} />
            </Link>
          ) : (
            <p className="quiet-empty">
              {loading
                ? "Loading the neighborhood calendar…"
                : "No upcoming events yet. Check back for the next gathering."}
            </p>
          )}
        </section>
        <section className="home-section" data-pillar="groups">
          <div className="section-heading">
            <div>
              <span className="eyebrow pillar-label">Groups</span>
              <h2>Neighborhood groups</h2>
            </div>
            <Link href="/groups">
              All groups <ArrowRight size={16} />
            </Link>
          </div>
          <div className="group-home-grid">
            {list("groups")
              .sort((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 2)
              .map(card)}
            <div className="invitation-card">
              <span className="tile-icon">
                <Leaf />
              </span>
              <h3>Start a group</h3>
              <p>
                A walking group, a book club, a block email list. Tell the
                volunteers what you have in mind and they will help you set it
                up.
              </p>
              <Link href="/governance">
                Suggest a group <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
        <section className="resource-section" data-pillar="resources">
          <div className="section-heading">
            <div>
              <span className="eyebrow pillar-label">Resources</span>
              <h2>Local resources</h2>
            </div>
            <Link href="/resources">
              All resources <ArrowRight size={16} />
            </Link>
          </div>
          {finder}
          <div className="resource-results">
            {filteredResources
              .sort((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 3)
              .map((r) => (
                <Link key={r.id} href={"/resources/" + r.slug}>
                  <Compass size={20} />
                  <span>
                    <strong>{r.name}</strong>
                    <small>
                      {r.locked
                        ? "Available to " + audience(r.visibility)
                        : r.summary}
                    </small>
                  </span>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
          </div>
          {!filteredResources.length && !loading && (
            <p>No resources match those selections. Try another topic.</p>
          )}
        </section>
        <section className="home-section" data-pillar="questions">
          <div className="section-heading">
            <div>
              <span className="eyebrow pillar-label">Community questions</span>
              <h2>Quick polls and consultations</h2>
            </div>
            <Link href="/governance">
              All questions <ArrowRight size={16} />
            </Link>
          </div>
          {questions()}
        </section>
        <section className="about-strip">
          <Leaf size={40} />
          <div>
            <span className="eyebrow">About the Club</span>
            <h2>Who we are</h2>
            <p>
              The Rosemont Club is a civil association of civic-minded neighbors
              in Rosemont. Read about the neighborhood, how the Club works, and
              what it does not do.
            </p>
          </div>
          <Link className="secondary" href="/about">
            About the Club <ArrowUpRight size={17} />
          </Link>
        </section>
      </>
    );
  else if (["groups", "events", "resources"].includes(section)) {
    const items =
      section === "resources"
        ? filteredResources
        : list(section).filter((e) =>
            [e.name, e.locked ? "" : e.summary, e.locked ? "" : e.description]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase()),
          );
    content = (
      <>
        <PageHeading
          eyebrow="Directory"
          title={labels[section]}
          text={
            section === "groups"
              ? "Neighborhood groups and the chats, email lists, and channels they use."
              : section === "events"
                ? "Gatherings on the Rosemont calendar. Everyone is welcome."
                : "Useful local links, sorted by who you are and what you need."
          }
        />
        <div className="directory-toolbar">
          <label className="search-field">
            <Search size={18} />
            <span className="sr-only">Search {section}</span>
            <input
              placeholder={"Search " + section + "…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {section === "events" && (
            <button
              className="secondary"
              onClick={() => act(() => downloadCalendar())}
            >
              Download calendar <CalendarDays size={16} />
            </button>
          )}
          {user &&
            (user.admin ||
              (section === "events" &&
                entities.some(
                  (r) => r.kind === "groups" && r.ownerIds?.includes(user.id),
                ))) && (
              <button onClick={() => setEditing({ kind: section })}>
                <Plus size={16} /> Create {section.slice(0, -1)}
              </button>
            )}
        </div>
        {section === "resources" && finder}
        <p className="result-count">
          {loading
            ? "Loading…"
            : `${items.length} ${items.length === 1 ? section.slice(0, -1) : section}`}
        </p>
        <div className="card-grid">{items.map(card)}</div>
        {!items.length && !loading && (
          <div className="empty">
            <Search />
            <h3>No matches just yet.</h3>
            <p>
              Try a different search or suggest something for the directory.
            </p>
            <button
              className="secondary"
              onClick={() => {
                setQuery("");
                setWho("");
                setNeed("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </>
    );
  } else if (section === "about")
    content = (
      <>
        <PageHeading
          eyebrow="About the Club"
          title="About The Rosemont Club"
          text="A civil association of civic-minded neighbors in Rosemont, Alexandria, Virginia."
        />
        <div className="about-layout">
          <aside>
            <NeighborhoodMap />
            <p className="muted">
              The Club’s community-provided residency boundary. Address checks
              use this outline.
            </p>
            <Link href="/profile">
              Verify your residency <ArrowRight size={15} />
            </Link>
          </aside>
          <div className="prose">
            {[
              "about-club",
              "about-not",
              "about-neighborhood",
              "about-history",
              "about-participation",
              "about-principles",
            ].map((slug) => (
              <article key={slug}>
                <h2>{find(slug)?.name}</h2>
                <Paragraphs text={find(slug)?.description} />
                {user?.admin && (
                  <button
                    className="text-button"
                    onClick={() =>
                      setEditing({ entity: find(slug), kind: "content" })
                    }
                  >
                    Edit section
                  </button>
                )}
              </article>
            ))}
            <article className="sources">
              <h3>Explore the history</h3>
              <a
                href="https://www.rosemontcitizens.org/history"
                target="_blank"
                rel="noreferrer"
              >
                Rosemont Citizens Association history archive{" "}
                <ArrowUpRight size={14} />
              </a>
              <a
                href="https://www.alexandriava.gov/cultural-history/the-colored-rosemont-community-history-initiative"
                target="_blank"
                rel="noreferrer"
              >
                City of Alexandria: Colored Rosemont Community History
                Initiative <ArrowUpRight size={14} />
              </a>
              <a
                href="https://www.dhr.virginia.gov/VLR_to_transfer/PDFNoms/100-0137_Rosemont_HD_1992_Final_Nomination.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Rosemont Historic District nomination <ArrowUpRight size={14} />
              </a>
              <p>
                The Club’s organization and participation model are described
                here separately from the historical Rosemont Citizens
                Association. Expectations for how neighbors treat each other on
                the site and in the neighborhood chat are in the{" "}
                <Link href="/guidelines">community guidelines</Link>.
              </p>
            </article>
          </div>
        </div>
      </>
    );
  else if (section === "following")
    content = (
      <>
        <PageHeading
          eyebrow="Following"
          title="Your groups, in one place"
          text="Everything coming up from the groups you follow, the events you’ve said you’ll attend, and the chats and lists each group uses."
        />
        {user ? (
          <Following
            user={user}
            records={records}
            activity={activity}
            refreshActivity={refreshActivity}
            notify={msg}
            renderCard={card}
          />
        ) : (
          <div className="empty">
            <Users />
            <h2>Sign in to see what you follow</h2>
            <p>
              Follow groups and this page gathers their gatherings, calendars,
              and chats for you.
            </p>
            <button onClick={() => setAuthOpen(true)}>Sign in</button>
          </div>
        )}
      </>
    );
  else if (section === "privacy" || section === "support") {
    const slug = section === "privacy" ? "privacy-policy" : "support";
    content = (
      <>
        <PageHeading
          eyebrow={section === "privacy" ? "Privacy" : "Support"}
          title={find(slug)?.name || labels[section]}
          text={find(slug)?.summary || ""}
        />
        <div className="prose guidelines">
          <article>
            <Paragraphs text={find(slug)?.description} />
            {user?.admin && (
              <button
                className="text-button"
                onClick={() => setEditing({ entity: find(slug), kind: "content" })}
              >
                Edit page
              </button>
            )}
          </article>
        </div>
      </>
    );
  } else if (section === "guidelines")
    content = (
      <>
        <PageHeading
          eyebrow="Community guidelines"
          title="How we treat each other"
          text="A few plain expectations for the website and for the Rosemont Neighbors WhatsApp group. They apply to everyone, volunteers included."
        />
        <div className="prose guidelines">
          {["guidelines-site", "guidelines-whatsapp"].map((slug) => (
            <article key={slug} id={slug.replace("guidelines-", "")}>
              <h2>{find(slug)?.name}</h2>
              {find(slug)?.summary && (
                <p className="lead">{find(slug)?.summary}</p>
              )}
              <Paragraphs text={find(slug)?.description} />
              {user?.admin && (
                <button
                  className="text-button"
                  onClick={() =>
                    setEditing({ entity: find(slug), kind: "content" })
                  }
                >
                  Edit section
                </button>
              )}
            </article>
          ))}
          <p className="muted">
            Questions about these guidelines, or something you think was handled
            wrongly? <Link href="/governance">Send a note to the volunteers</Link>.
          </p>
        </div>
      </>
    );
  else if (section === "governance")
    content = (
      <>
        <PageHeading
          eyebrow="Polls & consultations"
          title="Community questions"
          text="Quick polls for everyday decisions, NeighborVote for substantive ones, and a place to send ideas to the volunteers."
        />
        {questions()}
        <div className="governance-grid home-section">
          <article className="prose">
            <h2>{find("governance")?.name}</h2>
            <Paragraphs text={find("governance")?.description} />
            {user?.admin && (
              <button
                className="text-button"
                onClick={() =>
                  setEditing({ entity: find("governance"), kind: "content" })
                }
              >
                Edit governance
              </button>
            )}
          </article>
          <Feedback user={user} signIn={() => setAuthOpen(true)} notify={msg} />
        </div>
      </>
    );
  else if (section === "profile")
    content = (
      <>
        <PageHeading
          eyebrow="Your account"
          title={
            user
              ? `Hello, ${user.displayName.split(" ")[0]}.`
              : "Hello, neighbor."
          }
          text="Manage your profile and verify your Rosemont residency."
        />
        {user ? (
          <Profile
            user={user}
            records={entities}
            refresh={refresh}
            notify={msg}
          />
        ) : (
          <div className="empty">
            <Users />
            <h2>Sign in to take part</h2>
            <p>
              Sign in to follow groups, RSVP, vote, and verify your Rosemont
              residency.
            </p>
            <button onClick={() => setAuthOpen(true)}>
              Sign in or create an account
            </button>
          </div>
        )}
      </>
    );
  else if (section === "admin")
    content = user?.admin ? (
      <Admin
        user={user}
        records={entities}
        edit={(entity, kind) => setEditing({ entity, kind })}
        confirm={setConfirm}
        refresh={refresh}
        notify={msg}
      />
    ) : (
      <div className="empty">
        <ShieldCheck />
        <h1>Volunteer administration</h1>
        <p>Sign in with an administrator account to continue.</p>
        {!user && <button onClick={() => setAuthOpen(true)}>Sign in</button>}
      </div>
    );
  else
    content = (
      <div className="empty">
        <h1>Page not found</h1>
        <Link href="/">Back to the neighborhood</Link>
      </div>
    );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="topline">
        <span>A neighborhood site for Rosemont, Alexandria, Virginia</span>
        <Link href="/governance">
          Volunteer <ArrowUpRight size={12} />
        </Link>
      </div>
      <header>
        <div className="header-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <Leaf size={26} />
            </span>
            <span>
              The Rosemont <b>Club</b>
            </span>
          </Link>
          <nav aria-label="Main navigation" className={mobile ? "open" : ""}>
            {[
              "home",
              "groups",
              "events",
              "resources",
              "governance",
              "about",
              ...(user ? ["following"] : []),
            ].map((p) => (
              <Link
                key={p}
                href={p === "home" ? "/" : "/" + p}
                aria-current={section === p ? "page" : undefined}
              >
                {p === "home" ? "Home" : labels[p]}
              </Link>
            ))}
          </nav>
          <div className="account-nav">
            {user ? (
              <>
                <Link
                  className="profile-link"
                  href="/profile"
                  title="Your profile"
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </Link>
                {user.admin && (
                  <Link href="/admin" aria-label="Administration">
                    <Settings size={20} />
                  </Link>
                )}
              </>
            ) : (
              <button className="header-join" onClick={() => setAuthOpen(true)}>
                Sign in <ArrowUpRight size={14} />
              </button>
            )}
            <button
              className="mobile-toggle icon-button"
              aria-label="Toggle navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        {error && (
          <div className="notice error" role="alert">
            {error}{" "}
            <button className="text-button" onClick={() => void refresh()}>
              Try again
            </button>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {content}
      </main>
      <footer>
        <div className="footer-top">
          <Link className="brand" href="/">
            <Leaf size={28} />
            <span>The Rosemont Club</span>
          </Link>
          <p>
            A neighborhood site run by Rosemont volunteers.
            <br />
            Groups, events, resources, and community questions.
          </p>
          <div>
            <Link href="/about">About the Club</Link>
            <Link href="/guidelines">Community guidelines</Link>
            <Link href="/governance">Volunteer & ideas</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/support">Support</Link>
            <Link href="/profile">Your privacy & residency</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Made for the neighbors of Rosemont, Alexandria, Virginia.</span>
          <span>Volunteer-run · Not affiliated with the City of Alexandria</span>
        </div>
      </footer>
      {authOpen && <AuthDialog close={() => setAuthOpen(false)} notify={msg} />}
      {confirm && (
        <Confirm
          title={confirm.title}
          text={confirm.text}
          onConfirm={confirm.run}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
const kinds = [
  "groups",
  "events",
  "resources",
  "polls",
  "content",
  "tags",
  "consultations",
];
function PageHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Paragraphs({ text }: { text?: string }) {
  return (
    <>
      {text?.split("\n\n").map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}
function Feedback({
  user,
  signIn,
  notify,
  entityId = "",
  ownership = false,
}: {
  user: Member | null;
  signIn: () => void;
  notify: (s: string) => void;
  entityId?: string;
  ownership?: boolean;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="feedback-panel">
      <span className="tile-icon">
        <Mail />
      </span>
      <h2>
        {ownership ? "Help look after this listing" : "Send an idea to the volunteers"}
      </h2>
      <p>
        {ownership
          ? "Offer to maintain this page. A volunteer will review the request."
          : "Suggest a group, offer to help, or share a neighborhood idea. The volunteer team can read your message."}
      </p>
      {user ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("feedback", "POST", {
                message,
                entityId,
                type: ownership ? "ownership" : "feedback",
              });
              setMessage("");
              notify(
                "Thanks. Your message has been shared with the volunteer team.",
              );
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Your message
            <textarea
              required
              minLength={5}
              maxLength={3000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <small>
            Please don’t include your home address or sensitive personal
            information.
          </small>
          <button disabled={busy}>
            {busy ? "Sending…" : "Send to the volunteers"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <button onClick={signIn}>Sign in to share an idea</button>
      )}
    </div>
  );
}
function Detail({
  item,
  user,
  records,
  signIn,
  notify,
  edit,
}: {
  item: Card;
  user: Member | null;
  records: Card[];
  signIn: () => void;
  notify: (s: string) => void;
  edit: () => void;
}) {
  const e = item as Entity;
  const [join, setJoin] = useState("none"),
    [date, setDate] = useState(""),
    [attending, setAttending] = useState(false),
    [members, setMembers] = useState<any[]>([]),
    [results, setResults] = useState<any>(null),
    [selected, setSelected] = useState<number | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (e.kind === "groups" && canManage(e, user))
      api("entities/" + e.id + "/members")
        .then(setMembers)
        .catch(() => {});
  }, [e.id, user?.id]);
  const dates = item.locked ? [] : occurrences(e);
  const activeDate = date || dates[0];
  useEffect(() => {
    if (e.kind === "groups" && user && (!item.locked || item.eligibilityNote))
      api("entities/" + e.id + "/join")
        .then((x) => setJoin(x.status))
        .catch(() => {});
    if (e.kind === "polls" && !item.locked)
      api("entities/" + e.id + "/results")
        .then((x) => {
          setResults(x);
          setSelected(x.selected);
        })
        .catch(() => {});
  }, [e.id, user?.id, item.locked]);
  useEffect(() => {
    if (e.kind === "events" && user && activeDate)
      api("entities/" + e.id + "/rsvp?date=" + encodeURIComponent(activeDate))
        .then((x) => setAttending(x.attending))
        .catch(() => {});
  }, [e.id, user?.id, activeDate]);
  async function run(fn: () => Promise<void>) {
    if (!user) {
      signIn();
      return;
    }
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (item.locked)
    return (
      <>
        <Link className="back-link" href={"/" + e.kind}>
          ← {labels[e.kind]}
        </Link>
        <div className="locked-page">
          <LockKeyhole size={34} />
          <span className="eyebrow">Restricted page</span>
          <h1>{e.name}</h1>
          <p>
            {item.eligibilityNote
              ? `This group is limited to ${item.eligibilityNote.charAt(0).toLowerCase() + item.eligibilityNote.slice(1)}. Verified residents with a matching address see it automatically.`
              : `Details are available to ${audience(e.visibility).toLowerCase()}. Private invitations, locations, and contact details stay with their intended audience.`}
          </p>
          {!user ? (
            <button onClick={signIn}>Sign in to continue</button>
          ) : !user.verifiedResident && !user.admin ? (
            <Link className="button" href="/profile">
              Verify your Rosemont residency
            </Link>
          ) : item.eligibilityNote && item.membership === "request" ? (
            <button
              disabled={busy || join !== "none"}
              onClick={() =>
                void run(async () => {
                  const x = await api("entities/" + e.id + "/join", "POST", {
                    join: true,
                  });
                  setJoin(x.status);
                  notify("Your request is saved. An organizer will take a look.");
                })
              }
            >
              {join === "requested" ? "Request sent" : "Request to join"}
            </button>
          ) : (
            <Link className="button" href="/profile">
              Check your residency status
            </Link>
          )}
        </div>
      </>
    );
  const override = e.overrides?.find(
    (o) => o.date === activeDate?.slice(0, 10),
  );
  const group = records.find((r) => r.id === e.groupId && !r.locked);
  return (
    <>
      <div className="detail-top">
        <Link
          className="back-link"
          href={
            "/" +
            (e.kind === "polls" || e.kind === "consultations"
              ? "governance"
              : e.kind)
          }
        >
          ← {labels[e.kind]}
        </Link>
        {canManage(e, user) && (
          <button className="secondary" onClick={edit}>
            Edit this page <Settings size={15} />
          </button>
        )}
      </div>
      <div className="detail-layout">
        <article>
          <span className="eyebrow">
            {audience(e.visibility)}{" "}
            {e.status !== "active" ? " · " + e.status : ""}
          </span>
          <h1>{e.name}</h1>
          <p className="lead">{e.summary}</p>
          {e.image && (
            <img
              className="detail-image"
              src={e.image}
              alt={e.imageAlt || e.name}
            />
          )}
          <div className="prose">
            <Paragraphs text={e.description} />
          </div>
          {group && (
            <p className="host-line">
              Hosted by <Link href={"/groups/" + group.slug}>{group.name}</Link>
            </p>
          )}
          {e.kind === "groups" && (
            <>
              <h2>How to join</h2>
              <p>{e.joinInstructions}</p>
              <p className="muted">
                Groups and their chats follow the Club’s{" "}
                <Link href="/guidelines">community guidelines</Link>.
              </p>
              {(item.channels || []).map((c, i) => (
                <div className={"channel" + (c.locked ? " channel-locked" : "")} key={i}>
                  <ChannelIcon type={c.type} />
                  <div>
                    <h3>{c.label || c.type}</h3>
                    {c.locked ? (
                      <>
                        <p>
                          <LockKeyhole size={14} /> Available to{" "}
                          {audience(c.visibility).toLowerCase()}.
                          {c.visibility === "residents"
                            ? " Verify your Rosemont residency to see the invitation."
                            : " Sign in to see the details."}
                        </p>
                        {!user ? (
                          <button className="secondary" onClick={signIn}>
                            Sign in
                          </button>
                        ) : (
                          <Link className="button secondary" href="/profile">
                            Verify your residency
                          </Link>
                        )}
                      </>
                    ) : (
                      <p>{c.instructions}</p>
                    )}
                    {c.url && (
                      <a
                        className="text-link"
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open {c.type} <ArrowUpRight size={14} />
                      </a>
                    )}
                    {c.email && <a href={"mailto:" + c.email}>{c.email}</a>}
                  </div>
                </div>
              ))}
              {!item.channels?.length && (
                <p className="muted">
                  This group hasn’t listed a chat or email list yet.
                </p>
              )}
              {canManage(e, user) && members.length > 0 && (
                <section className="side-card">
                  <h3>Group followers & requests</h3>
                  {members.map((m) => (
                    <div className="list-link" key={m.userId}>
                      <span>
                        {m.displayName}
                        <small>{m.status}</small>
                      </span>
                      {m.status === "requested" && (
                        <button
                          className="secondary"
                          onClick={() =>
                            void run(async () => {
                              await api(
                                "entities/" + e.id + "/members",
                                "POST",
                                { userId: m.userId, status: "member" },
                              );
                              setMembers(
                                await api("entities/" + e.id + "/members"),
                              );
                            })
                          }
                        >
                          Approve request
                        </button>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {e.calendarUrl && (
                <GroupCalendar id={e.id} url={e.calendarUrl} />
              )}
              <h2>Events from this group</h2>
              {records
                .filter(
                  (r) =>
                    r.kind === "events" &&
                    r.groupId === e.id &&
                    !r.locked &&
                    r.status === "active",
                )
                .map((r) => (
                  <Link
                    className="list-link"
                    href={"/events/" + r.slug}
                    key={r.id}
                  >
                    {r.name}
                    <ArrowRight size={16} />
                  </Link>
                ))}
            </>
          )}
          {e.kind === "events" && (
            <>
              <h2>Details</h2>
              <div className="info-grid">
                <div>
                  <CalendarDays />
                  <h3>When</h3>
                  <p>
                    {e.recurrence.frequency === "nth-weekday"
                      ? `${["First", "Second", "Third", "Fourth", "Fifth"][e.recurrence.nth - 1]} ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][e.recurrence.weekday]} of the month`
                      : e.recurrence.frequency === "none"
                        ? "One-time gathering"
                        : `Every ${e.recurrence.interval} ${e.recurrence.frequency === "weekly" ? "week(s)" : "month(s)"}`}
                  </p>
                  {e.recurrence.months.length > 0 && (
                    <small>
                      {e.recurrence.months
                        .map((m) =>
                          new Date(2026, m - 1, 1).toLocaleDateString("en-US", {
                            month: "short",
                          }),
                        )
                        .join(" · ")}
                    </small>
                  )}
                  <p>All times are Eastern time.</p>
                </div>
                <div>
                  <MapPin />
                  <h3>Where</h3>
                  <p>{override?.location || e.location}</p>
                  <p>{e.streetAddress}</p>
                  {e.mapUrl && (
                    <a href={e.mapUrl} target="_blank" rel="noreferrer">
                      Open map ↗
                    </a>
                  )}
                </div>
              </div>
              {(override?.sponsor || e.sponsor) && (
                <p className="notice">
                  With thanks to {override?.sponsor || e.sponsor}.
                </p>
              )}
              {e.notes && <p>{e.notes}</p>}
            </>
          )}
          {e.kind === "polls" && (
            <form
              className="poll-form"
              onSubmit={(e2) => {
                e2.preventDefault();
                void run(async () => {
                  if (selected === null) return;
                  await api("entities/" + e.id + "/vote", "POST", {
                    option: selected,
                  });
                  setResults(await api("entities/" + e.id + "/results"));
                  notify("Your response is saved.");
                });
              }}
            >
              <fieldset>
                <legend>Your preference</legend>
                {e.options.map((o, i) => (
                  <label className="poll-option" key={i}>
                    <input
                      type="radio"
                      name="vote"
                      value={i}
                      checked={selected === i}
                      onChange={() => setSelected(i)}
                    />
                    <span>{o}</span>
                    {results?.counts && <b>{results.counts[i]}</b>}
                  </label>
                ))}
              </fieldset>
              <button
                disabled={
                  busy ||
                  selected === null ||
                  e.status !== "active" ||
                  (!!e.opens && Date.parse(e.opens) > Date.now()) ||
                  (!!e.closes && Date.parse(e.closes) < Date.now())
                }
              >
                {busy ? "Saving…" : "Save my response"}
              </button>
              <p className="muted">
                One response per account; you can update yours while the poll is
                open. Only aggregate results are shown.{" "}
                {e.closes && "Closes " + new Date(e.closes).toLocaleString()}.
              </p>
              {results?.counts ? (
                <p>{results.total} responses so far.</p>
              ) : (
                <p>
                  Results are shown{" "}
                  {e.resultsVisibility === "after-close"
                    ? "after the poll closes"
                    : e.resultsVisibility === "admins"
                      ? "to administrators only"
                      : "after you respond"}
                  .
                </p>
              )}
            </form>
          )}
          {e.website && (
            <a
              className="button"
              href={e.website}
              target="_blank"
              rel="noreferrer"
            >
              {e.kind === "consultations"
                ? "Participate on NeighborVote"
                : "Visit website"}{" "}
              <ArrowUpRight size={16} />
            </a>
          )}
          {(e.audienceTags?.length > 0 || e.topicTags?.length > 0) && (
            <div className="tags">
              {[...e.audienceTags, ...e.topicTags].map((t) => (
                <span className="small-tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {[
            ...(e.relatedGroups || []),
            ...(e.relatedEvents || []),
            ...(e.relatedResources || []),
          ]
            .map((id) => records.find((r) => r.id === id))
            .filter(Boolean)
            .map((r) => (
              <Link
                className="list-link"
                key={r!.id}
                href={"/" + r!.kind + "/" + r!.slug}
              >
                {r!.name}
                <ArrowRight size={15} />
              </Link>
            ))}
        </article>
        <aside>
          {e.kind === "events" && (
            <div className="side-card">
              <CalendarDays />
              <h2>Dates & RSVP</h2>
              {dates.length && e.status === "active" ? (
                <>
                  <label>
                    Choose a date
                    <select
                      value={activeDate}
                      onChange={(x) => setDate(x.target.value)}
                    >
                      {dates.map((d) => (
                        <option key={d} value={d}>
                          {displayDate(d)} ·{" "}
                          {new Date(d + "Z").toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "UTC",
                          })}
                        </option>
                      ))}
                    </select>
                  </label>
                  {e.rsvp && (
                    <button
                      disabled={busy}
                      className="wide"
                      onClick={() =>
                        void run(async () => {
                          await api("entities/" + e.id + "/rsvp", "POST", {
                            date: activeDate,
                            attending: !attending,
                          });
                          setAttending(!attending);
                          notify(
                            attending
                              ? "Your RSVP was cancelled."
                              : "You’re on the list. See you there!",
                          );
                        })
                      }
                    >
                      {attending ? (
                        <>
                          <Check size={16} /> Going · cancel RSVP
                        </>
                      ) : (
                        "I’ll be there"
                      )}
                    </button>
                  )}
                  <a
                    className="secondary wide"
                    href={googleCalendar(e, activeDate)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Add to Google Calendar <ArrowUpRight size={14} />
                  </a>
                  <button
                    className="text-button"
                    onClick={() =>
                      downloadCalendar(e.id).catch((x) => notify(x.message))
                    }
                  >
                    Download recurring calendar (.ics)
                  </button>
                </>
              ) : (
                <p>
                  {e.status === "cancelled"
                    ? "This event is cancelled."
                    : "No upcoming dates are scheduled."}
                </p>
              )}
            </div>
          )}
          {e.kind === "groups" && (
            <div className="side-card">
              <Users />
              <h2>Follow this group</h2>
              <p>
                {e.membership === "request"
                  ? "Ask to join this group."
                  : "Keep this group close. Follow it from your profile."}
              </p>
              <button
                className="wide"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const x = await api("entities/" + e.id + "/join", "POST", {
                      join: join === "none",
                    });
                    setJoin(x.status);
                    notify(
                      x.status === "none"
                        ? "You are no longer following this group."
                        : x.status === "requested"
                          ? "Your membership request is saved."
                          : "You’re following this group.",
                    );
                  })
                }
              >
                {join === "none"
                  ? e.membership === "request"
                    ? "Request to join"
                    : "Follow this group"
                  : join === "requested"
                    ? "Request sent · withdraw"
                    : "Following · unfollow"}
              </button>
              <small>
                Following here does not automatically join an external chat.
              </small>
            </div>
          )}
          {e.contactEmail ? (
            <div className="side-card">
              <h3>Get in touch</h3>
              <a href={"mailto:" + e.contactEmail}>{e.contactEmail}</a>
            </div>
          ) : e.contactRelay ? (
            <ContactRelay
              entity={e}
              user={user}
              signIn={signIn}
              notify={notify}
            />
          ) : null}
          {["groups", "events", "resources"].includes(e.kind) &&
            !canManage(e, user) && (
              <Feedback
                user={user}
                signIn={signIn}
                notify={notify}
                entityId={e.id}
                ownership
              />
            )}
        </aside>
      </div>
    </>
  );
}
function Profile({
  user,
  records,
  refresh,
  notify,
}: {
  user: Member;
  records: Entity[];
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [activity, setActivity] = useState<any>({ groups: [], events: [] });
  useEffect(() => {
    api("activity")
      .then(setActivity)
      .catch(() => {});
  }, [user.id]);
  const [name, setName] = useState(user.displayName),
    [bio, setBio] = useState(user.bio),
    [address, setAddress] = useState(""),
    [remember, setRemember] = useState(!!user.addressStored),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState("");
  const me = user as Member & {
    rulesUpdatedAt?: string;
    addressStorageAvailable?: boolean;
  };
  const recheckNeeded =
    !user.addressStored &&
    user.verifiedResident &&
    !!me.rulesUpdatedAt &&
    me.rulesUpdatedAt > (user.eligibilityCheckedAt || "");
  return (
    <div className="profile-grid">
      <section className="side-card">
        <h2>Your profile</h2>
        <p className="muted">
          {user.email} · {user.admin ? "Administrator" : "Member"}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("me", "PATCH", { displayName: name, bio });
              await refresh();
              notify("Your profile is saved.");
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <label>
            Display name
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Short bio (optional)
            <textarea
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <button>Save profile</button>
        </form>
        <p className="muted">
          Your email is not listed in a public member directory.
        </p>
        <button
          className="text-button"
          onClick={async () => {
            await signOut(await clientAuth());
            await refresh();
          }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </section>
      <section className="residency-card">
        <ShieldCheck size={30} />
        <span className="eyebrow">Residency check</span>
        <h2>
          {user.verifiedResident
            ? "You’re a verified Rosemont resident."
            : "Verify your Rosemont residency"}
        </h2>
        <p>Access resident-only groups, event details, and resources.</p>
        <div className="privacy-steps">
          <span>
            <b>1</b> Enter your Alexandria address
          </span>
          <span>
            <b>2</b> We check the Club boundary
          </span>
          <span>
            <b>3</b> Only the result is saved
          </span>
        </div>
        <p className="muted">
          Your address is sent to the U.S. Census geocoder to locate it.
          Unless you ask us to remember it, we keep only the result, and
          administrators cannot see the address or coordinates. This is an
          address-location check, not proof that you occupy a home.
        </p>
        {user.verifiedResident && (
          <p className="notice">
            <Check size={18} /> Verified{" "}
            {user.verificationDate
              ? new Date(user.verificationDate).toLocaleDateString()
              : ""}
            {user.addressStored ? " · address remembered" : ""}
          </p>
        )}
        {recheckNeeded && (
          <p className="notice" role="status">
            Block groups were added or changed since your last address check.
            Re-check your address below to see whether you qualify, or tick
            “remember my address” so this happens automatically.
          </p>
        )}
        {user.addressStored && (
          <p className="muted">
            Your address is remembered, encrypted, so new block groups are
            checked for you automatically.{" "}
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await api("residency/forget", "POST", {});
                  await refresh();
                  setRemember(false);
                  notify("Your remembered address has been deleted.");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Forget my address
            </button>
          </p>
        )}
        {(
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setResult("");
              const submitted = address;
              setAddress("");
              try {
                const r = await api("residency", "POST", {
                  address: submitted,
                  remember,
                });
                setResult(
                  r.verifiedResident
                    ? "Your address falls inside the Club boundary. You’re verified." +
                        (r.eligibleGroupIds?.length
                          ? ` It also qualifies you for ${r.eligibleGroupIds.length} block group${r.eligibleGroupIds.length === 1 ? "" : "s"}.`
                          : "") +
                        (r.addressStored
                          ? " Your address is remembered for future block-group checks."
                          : "")
                    : r.matched
                      ? "That address falls outside the current Club boundary. You can request volunteer review."
                      : "We could not confidently match that address. Try the full address or request volunteer review.",
                );
                await refresh();
              } catch (e) {
                setResult((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Alexandria street address
              <input
                autoComplete="off"
                required
                minLength={8}
                maxLength={250}
                placeholder="Street address, Alexandria, VA ZIP"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <label className="check remember-address">
              <input
                type="checkbox"
                checked={remember}
                disabled={me.addressStorageAvailable === false}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>
                Remember my address for future block groups
                <small>
                  Some groups are limited to a street or a few blocks. If you
                  tick this, we keep an encrypted copy of the geocoded result so
                  we can re-check you automatically when such groups are added
                  or changed. It is never shown to anyone, including
                  administrators, and you can delete it any time. Leave it
                  unticked and nothing about your address is kept; you may be
                  asked to re-check later.
                </small>
              </span>
            </label>
            <button disabled={busy}>
              {busy
                ? remember
                  ? "Checking address…"
                  : "Checking and discarding address…"
                : user.verifiedResident
                  ? "Re-check my address"
                  : "Verify residency"}
            </button>
          </form>
        )}
        {result && (
          <p role="status" className="notice">
            {result}
          </p>
        )}
        <button
          className="text-button"
          disabled={user.reviewRequested}
          onClick={async () => {
            try {
              await api("residency/review", "POST", {});
              await refresh();
              notify(
                "Your review request is saved. Please do not send your address through feedback.",
              );
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          {user.reviewRequested
            ? "Volunteer review requested"
            : "Need help? Request volunteer review"}
        </button>
        <small>
          The boundary was provided by the community on September 17, 2026.{" "}
          <Link href="/about">See the neighborhood outline.</Link>
        </small>
      </section>
      <section>
        <h2>Your groups & gatherings</h2>
        <p>
          <Link className="text-link" href="/following">
            See everything you follow in one place <ArrowRight size={14} />
          </Link>
        </p>
        {activity.groups
          .filter((g: any) => g.status !== "none")
          .map((g: any) => {
            const item = records.find((r) => r.id === g.entityId);
            return item ? (
              <Link
                className="list-link"
                key={g.entityId}
                href={"/groups/" + item.slug}
              >
                {item.name}
                <small>{g.status}</small>
              </Link>
            ) : null;
          })}
        {activity.events
          .filter((r: any) => r.attending)
          .map((r: any) => {
            const item = records.find((e) => e.id === r.entityId);
            return item ? (
              <Link
                className="list-link"
                key={r.entityId + r.date}
                href={"/events/" + item.slug}
              >
                {item.name}
                <small>{displayDate(r.date)}</small>
              </Link>
            ) : null;
          })}
        <h2 style={{ marginTop: 30 }}>Things you look after</h2>
        {records
          .filter((e) => e.ownerIds?.includes(user.id))
          .map((e) => (
            <Link
              className="list-link"
              key={e.id}
              href={"/" + e.kind + "/" + e.slug}
            >
              {e.name}
              <ArrowRight size={16} />
            </Link>
          ))}
        {!records.some((e) => e.ownerIds?.includes(user.id)) && (
          <p>
            Want to help maintain a group or resource? Use “Help look after this
            listing” on its page.
          </p>
        )}
      </section>
    </div>
  );
}
function Admin({
  user,
  records,
  edit,
  confirm,
  refresh,
  notify,
}: {
  user: Member;
  records: Entity[];
  edit: (entity: Entity | undefined, kind: string) => void;
  confirm: (v: {
    title: string;
    text: string;
    run: () => Promise<void>;
  }) => void;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState("groups"),
    [data, setData] = useState<any[]>([]),
    [error, setError] = useState(""),
    [recipient, setRecipient] = useState(""),
    [subject, setSubject] = useState(""),
    [message, setMessage] = useState("");
  async function reload() {
    if (["users", "feedback", "audit"].includes(tab)) {
      try {
        setData(await api("admin/" + tab));
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }
  useEffect(() => {
    setData([]);
    setError("");
    void reload();
  }, [tab]);
  return (
    <>
      <PageHeading
        eyebrow="Volunteers"
        title="Administration"
        text="Maintain the directory and help neighbors participate."
      />
      <div
        className="admin-tabs"
        role="navigation"
        aria-label="Administration sections"
      >
        {[...kinds, "users", "feedback", "audit"].map((k) => (
          <button
            key={k}
            className={k === tab ? "active" : "secondary"}
            onClick={() => setTab(k)}
          >
            {labels[k] ||
              (
                {
                  users: "People",
                  feedback: "Inbox",
                  audit: "Activity",
                } as Record<string, string>
              )[k]}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {kinds.includes(tab) ? (
        <>
          <div className="section-heading">
            <h2>{labels[tab]}</h2>
            <button onClick={() => edit(undefined, tab)}>
              <Plus size={16} /> Create{" "}
              {tab === "content" ? "section" : tab.replace(/s$/, "")}
            </button>
          </div>
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Audience</th>
                  <th>Status</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {records
                  .filter((e) => e.kind === tab)
                  .map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.name}</strong>
                        <small>{e.slug}</small>
                      </td>
                      <td>{audience(e.visibility)}</td>
                      <td>
                        {e.status}
                        {e.featured ? " · Featured" : ""}
                      </td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => edit(e, e.kind)}
                        >
                          Edit
                        </button>
                        {e.status !== "archived" && (
                          <button
                            className="text-button"
                            onClick={() =>
                              confirm({
                                title: "Archive " + e.name + "?",
                                text: "This removes it from the directory while preserving the record.",
                                run: async () => {
                                  await api("entities/" + e.id, "PATCH", {
                                    ...e,
                                    status: "archived",
                                  });
                                  await refresh();
                                },
                              })
                            }
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      ) : tab === "users" ? (
        <>
          <h2>People & permissions</h2>
          <p className="muted">
            Only administrators can see this list. Residency addresses are never
            collected here.
          </p>
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Neighbor</th>
                  <th>Access</th>
                  <th>Residency</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u: Member) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.displayName}</strong>
                      <small>{u.email}</small>
                      <button
                        className="text-button"
                        onClick={() => {
                          void navigator.clipboard.writeText(u.id);
                          notify("Account ID copied.");
                        }}
                      >
                        Copy account ID
                      </button>
                    </td>
                    <td>
                      {u.admin ? "Admin" : "Member"}
                      {u.disabled ? " · Disabled" : ""}
                    </td>
                    <td>
                      {u.verifiedResident ? "Verified" : "Unverified"}
                      {u.reviewRequested && (
                        <strong> · Review requested</strong>
                      )}
                      <small>{u.verificationMethod}</small>
                    </td>
                    <td>
                      {[
                        {
                          label: u.admin ? "Revoke admin" : "Make admin",
                          patch: { admin: !u.admin },
                        },
                        {
                          label: u.verifiedResident
                            ? "Unverify"
                            : "Verify resident",
                          patch: { verifiedResident: !u.verifiedResident },
                        },
                        {
                          label: u.disabled ? "Enable" : "Disable",
                          patch: { disabled: !u.disabled },
                        },
                      ].map((a) => (
                        <button
                          key={a.label}
                          className="text-button"
                          onClick={() =>
                            confirm({
                              title: a.label + "?",
                              text:
                                "This changes " +
                                u.displayName +
                                "’s access to The Rosemont Club.",
                              run: async () => {
                                await api(
                                  "admin/users/" + u.id,
                                  "PATCH",
                                  a.patch,
                                );
                                await reload();
                                await refresh();
                              },
                            })
                          }
                        >
                          {a.label}
                        </button>
                      ))}
                      <button
                        className="text-button"
                        onClick={() => setRecipient(u.id)}
                      >
                        Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recipient && (
            <form
              className="side-card"
              onSubmit={(e) => {
                e.preventDefault();
                confirm({
                  title: "Send this email?",
                  text: "The message will be sent to the selected member through Mailgun. Sandbox recipients must be authorized.",
                  run: async () => {
                    await api("admin/mail", "POST", {
                      userId: recipient,
                      subject,
                      message,
                    });
                    setRecipient("");
                    setSubject("");
                    setMessage("");
                    notify("Email sent.");
                  },
                });
              }}
            >
              <h3>Email {data.find((u) => u.id === recipient)?.displayName}</h3>
              <label>
                Subject
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label>
                Message
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <button>Review and send</button>
            </form>
          )}
        </>
      ) : tab === "feedback" ? (
        <>
          <h2>Community inbox</h2>
          {data.length ? (
            data.map((f) => (
              <article className="side-card" key={f.id}>
                <span className="eyebrow">
                  {f.type} · {f.status}
                </span>
                <p>{f.message}</p>
                <small>
                  Account: {f.userId}{" "}
                  {f.entityId ? " · Listing: " + f.entityId : ""}
                </small>
                <button
                  className="text-button"
                  onClick={async () => {
                    await api("admin/feedback", "PATCH", {
                      feedbackId: f.id,
                      status: f.status === "resolved" ? "open" : "resolved",
                    });
                    await reload();
                  }}
                >
                  {f.status === "resolved" ? "Reopen" : "Mark resolved"}
                </button>
              </article>
            ))
          ) : (
            <p>No feedback yet.</p>
          )}
        </>
      ) : (
        <>
          <h2>Administrative activity</h2>
          {data.map((a) => (
            <div className="list-link" key={a.id}>
              <span>
                {a.action}
                <small>
                  {a.target} · {a.actor}
                </small>
              </span>
              <small>{new Date(a.at).toLocaleString()}</small>
            </div>
          ))}
        </>
      )}
    </>
  );
}
