"use client";
import { useState } from "react";
import type { Entity, Member } from "@/lib/schema";
import { entitySchema } from "@/lib/schema";
import { api } from "./client";
import PolygonMap from "./PolygonMap";
export default function Editor({
  entity,
  kind,
  user,
  records,
  onSave,
  onClose,
}: {
  entity?: Entity;
  kind: string;
  user: Member;
  records: Entity[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() =>
    entity
      ? // Older records may predate newer optional fields; fill their defaults.
        { ...entity, ...entitySchema.parse(entity) }
      : {
          ...entitySchema.parse({
            kind: kind === "events" ? "groups" : kind,
            name: "New item",
            slug: "new-item",
            ...(kind === "polls" ? { options: ["Option 1", "Option 2"] } : {}),
          }),
          name: "",
          slug: "",
          kind,
          ownerIds: [user.id],
          start: "",
          end: "",
        },
  );
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [testAddress, setTestAddress] = useState(""),
    [testResult, setTestResult] = useState(""),
    [testing, setTesting] = useState(false);
  const change = (key: string, value: unknown) =>
    setForm((f) =>
      key === "eligibilityNote"
        ? { ...f, eligibility: { ...f.eligibility, note: value } }
        : { ...f, [key]: value },
    );
  const read = (key: string) =>
    key === "eligibilityNote" ? form.eligibility?.note : form[key];
  const field = (key: string, label: string, type = "text", help?: string) => (
    <label key={key}>
      {label}
      {type === "textarea" ? (
        <textarea
          rows={5}
          value={read(key) || ""}
          onChange={(e) => change(key, e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={read(key) ?? ""}
          onChange={(e) =>
            change(
              key,
              type === "number" ? Number(e.target.value) : e.target.value,
            )
          }
        />
      )}{" "}
      {help && <small>{help}</small>}
    </label>
  );
  const select = (key: string, label: string, options: string[]) => (
    <label>
      {label}
      <select value={form[key]} onChange={(e) => change(key, e.target.value)}>
        {options.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </label>
  );
  const checked = (key: string, label: string) => (
    <label className="check">
      <input
        type="checkbox"
        checked={!!form[key]}
        onChange={(e) => change(key, e.target.checked)}
      />
      {label}
    </label>
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const cleaned = entitySchema.parse(form);
      if (
        entity &&
        (JSON.stringify(cleaned.ownerIds) !== JSON.stringify(entity.ownerIds) ||
          cleaned.visibility !== entity.visibility ||
          (cleaned.status === "archived" && entity.status !== "archived"))
      ) {
        if (
          !window.confirm(
            "Save these access, ownership, or archive changes? They affect who can see or manage this listing.",
          )
        )
          return;
      }
      await api(
        "entities" + (entity ? "/" + entity.id : ""),
        entity ? "PATCH" : "POST",
        cleaned,
      );
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="editor">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Volunteer workspace</span>
          <h1>
            {entity ? "Edit" : "Create"}{" "}
            {kind === "content" ? "site content" : kind.replace(/s$/, "")}
          </h1>
        </div>
        <button type="button" className="secondary" onClick={onClose}>
          Close editor
        </button>
      </div>
      <form onSubmit={save}>
        <div className="form-grid">
          {field("name", kind === "polls" ? "Question" : "Name")}
          {!entity && (
            <label>
              Page URL
              <input
                value={form.slug}
                onChange={(e) =>
                  change(
                    "slug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  )
                }
              />
              <small>Lowercase words separated by hyphens.</small>
            </label>
          )}
          {select("visibility", "Who can see the details?", [
            "public",
            "members",
            "residents",
          ])}
          {select("status", "Publication status", [
            "active",
            "draft",
            "cancelled",
            "archived",
          ])}
        </div>
        {field("summary", "Short description")}
        {field("description", "Full description", "textarea")}
        {["resources", "groups", "consultations"].includes(kind) &&
          field("website", "Website", "url")}
        {["resources", "groups", "events"].includes(kind) && (
          <>
            <div className="form-grid">
              {field(
                "contactEmail",
                "Contact email (visible to this content’s audience)",
                "email",
              )}
              {field("image", "Image URL", "url")}
              {field("imageAlt", "Image description for accessibility")}
            </div>
            {checked(
              "contactRelay",
              "Hide the contact email. Neighbors write through a form on the page and the message is relayed by email (to the contact email, or to the owners if none is set).",
            )}
          </>
        )}
        {user.admin && checked("featured", "Feature on the homepage")}
        {kind === "groups" && (
          <fieldset>
            <legend>Membership and communication</legend>
            {select("membership", "Membership model", [
              "open",
              "request",
              "follow",
            ])}
            {field("scope", "Geographic scope")}
            {field("joinInstructions", "How to join", "textarea")}
            {field(
              "calendarUrl",
              "Published calendar (.ics address)",
              "url",
              "A public iCalendar feed, such as the “Public address in iCal format” from Google Calendar settings. Upcoming events from it are shown on the group page with subscribe links.",
            )}
            {form.channels.map((c: any, i: number) => (
              <div className="subform" key={i}>
                <div className="form-grid">
                  <label>
                    Channel
                    <select
                      value={c.type}
                      onChange={(e) =>
                        change(
                          "channels",
                          form.channels.map((x: any, n: number) =>
                            n === i ? { ...x, type: e.target.value } : x,
                          ),
                        )
                      }
                    >
                      {[
                        "WhatsApp",
                        "Email",
                        "Signal",
                        "Discord",
                        "Instagram",
                        "Website",
                        "Facebook",
                        "Other",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  {["label", "url", "email", "instructions"].map((key) => (
                    <label key={key}>
                      {key}
                      <input
                        value={c[key] || ""}
                        onChange={(e) =>
                          change(
                            "channels",
                            form.channels.map((x: any, n: number) =>
                              n === i ? { ...x, [key]: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Channel visibility
                    <select
                      value={c.visibility}
                      onChange={(e) =>
                        change(
                          "channels",
                          form.channels.map((x: any, n: number) =>
                            n === i ? { ...x, visibility: e.target.value } : x,
                          ),
                        )
                      }
                    >
                      {["public", "members", "residents"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    change(
                      "channels",
                      form.channels.filter((_: any, n: number) => n !== i),
                    )
                  }
                >
                  Remove channel
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                change("channels", [
                  ...form.channels,
                  {
                    type: "WhatsApp",
                    label: "",
                    url: "",
                    email: "",
                    instructions: "",
                    visibility: "residents",
                  },
                ])
              }
            >
              Add communication channel
            </button>
          </fieldset>
        )}
        {kind === "groups" && (
          <fieldset>
            <legend>Who can see this group</legend>
            <label>
              Eligibility rule
              <select
                value={form.eligibility.mode}
                onChange={(e) =>
                  change("eligibility", {
                    ...form.eligibility,
                    mode: e.target.value,
                  })
                }
              >
                <option value="club">Club residency (the audience above)</option>
                <option value="custom">
                  Custom: only addresses on listed streets, in the address list, or inside a drawn area
                </option>
              </select>
              <small>
                A custom rule applies on top of residents-only visibility. Neighbors
                whose verified address matches see the group automatically; anyone
                an owner approves through a join request also sees it. Addresses are
                checked at verification time and never stored.
              </small>
            </label>
            {form.eligibility.mode === "custom" && (
              <>
                {field(
                  "eligibilityNote",
                  "Shown to neighbors who don’t qualify (for example “Households on West Oak Street”)",
                )}
                <div className="form-grid">
                  <label>
                    Streets (one per line)
                    <textarea
                      rows={4}
                      value={form.eligibility.streets.join("\n")}
                      onChange={(e) =>
                        change("eligibility", {
                          ...form.eligibility,
                          streets: e.target.value.split("\n").filter(Boolean),
                        })
                      }
                    />
                    <small>
                      Any house on the street qualifies. Write them the way the
                      post office does, e.g. “W Oak St”; “West Oak Street” also
                      works.
                    </small>
                  </label>
                  <label>
                    Specific addresses (one per line)
                    <textarea
                      rows={4}
                      value={form.eligibility.addresses.join("\n")}
                      onChange={(e) =>
                        change("eligibility", {
                          ...form.eligibility,
                          addresses: e.target.value.split("\n").filter(Boolean),
                        })
                      }
                    />
                    <small>
                      Street address only, e.g. “12 W Oak St”. Visible to owners
                      and administrators only.
                    </small>
                  </label>
                </div>
                <h3>Or draw the area</h3>
                <PolygonMap
                  points={form.eligibility.polygon}
                  onChange={(polygon) =>
                    change("eligibility", { ...form.eligibility, polygon })
                  }
                />
                {entity ? (
                  <div className="subform">
                    <label>
                      Test an address against this rule
                      <input
                        autoComplete="off"
                        placeholder="Street address, Alexandria, VA"
                        value={testAddress}
                        onChange={(e) => setTestAddress(e.target.value)}
                      />
                      <small>
                        Save first; the check uses the saved rule. The address
                        is geocoded and discarded.
                      </small>
                    </label>
                    <button
                      type="button"
                      className="secondary"
                      disabled={testing || testAddress.trim().length < 8}
                      onClick={async () => {
                        setTesting(true);
                        setTestResult("");
                        try {
                          const r = await api(
                            "entities/" + entity.id + "/eligibility-check",
                            "POST",
                            { address: testAddress },
                          );
                          setTestAddress("");
                          setTestResult(
                            !r.matched
                              ? "The geocoder could not match that address."
                              : `${r.eligible ? "Qualifies" : "Does not qualify"} under the saved rule. Street as the geocoder reads it: ${r.street || "unknown"}. ${r.resident ? "Inside" : "Outside"} the Club boundary.`,
                          );
                        } catch (e) {
                          setTestResult((e as Error).message);
                        } finally {
                          setTesting(false);
                        }
                      }}
                    >
                      {testing ? "Checking…" : "Check address"}
                    </button>
                    {testResult && (
                      <p className="notice eligibility-result" role="status">
                        {testResult}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="muted">
                    After saving, you can test addresses against the rule here.
                  </p>
                )}
              </>
            )}
          </fieldset>
        )}
        {kind === "resources" && (
          <fieldset>
            <legend>Help neighbors discover this resource</legend>
            {(["audienceTags", "topicTags"] as const).map((key) => (
              <div key={key}>
                <h3>
                  {key === "audienceTags"
                    ? "Who is it for?"
                    : "What does it help with?"}
                </h3>
                <div className="tag-checkboxes">
                  {records
                    .filter(
                      (r) =>
                        r.kind === "tags" &&
                        r.scope ===
                          (key === "audienceTags" ? "audience" : "topic"),
                    )
                    .map((t) => (
                      <label className="check" key={t.id}>
                        <input
                          type="checkbox"
                          checked={form[key].includes(t.name)}
                          onChange={(e) =>
                            change(
                              key,
                              e.target.checked
                                ? [...form[key], t.name]
                                : form[key].filter((v: string) => v !== t.name),
                            )
                          }
                        />
                        {t.name}
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </fieldset>
        )}
        {kind === "events" && (
          <fieldset>
            <legend>When and where</legend>
            <div className="form-grid">
              {field("start", "Start (Eastern time)", "datetime-local")}
              {field("end", "End (optional, Eastern time)", "datetime-local")}
              {field("location", "Location name")}
              {field(
                "streetAddress",
                "Event street address (not a residency address)",
              )}
              {field("mapUrl", "Map link", "url")}
              {field("website", "Event website", "url")}
              {field("sponsor", "Sponsor (leave blank if unspecified)")}
              <label>
                Host group
                <select
                  value={form.groupId}
                  disabled={!!entity && !user.admin}
                  onChange={(e) => change("groupId", e.target.value)}
                >
                  <option value="">Independent event</option>
                  {records
                    .filter(
                      (r) =>
                        r.kind === "groups" &&
                        (user.admin || r.ownerIds?.includes(user.id)),
                    )
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {checked("rsvp", "Allow RSVPs")}
            {field("capacity", "Capacity (0 means no limit)", "number")}
            <div className="form-grid">
              <label>
                Repeats
                <select
                  value={form.recurrence.frequency}
                  onChange={(e) =>
                    change("recurrence", {
                      ...form.recurrence,
                      frequency: e.target.value,
                    })
                  }
                >
                  {["none", "weekly", "monthly", "nth-weekday"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Repeat every (weeks or months)
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={form.recurrence.interval}
                  onChange={(e) =>
                    change("recurrence", {
                      ...form.recurrence,
                      interval: Number(e.target.value),
                    })
                  }
                />
              </label>
              {form.recurrence.frequency === "nth-weekday" && (
                <>
                  <label>
                    Which week
                    <select
                      value={form.recurrence.nth}
                      onChange={(e) =>
                        change("recurrence", {
                          ...form.recurrence,
                          nth: Number(e.target.value),
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {
                            ["First", "Second", "Third", "Fourth", "Fifth"][
                              n - 1
                            ]
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Day
                    <select
                      value={form.recurrence.weekday}
                      onChange={(e) =>
                        change("recurrence", {
                          ...form.recurrence,
                          weekday: Number(e.target.value),
                        })
                      }
                    >
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ].map((d, i) => (
                        <option key={d} value={i}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label>
                Recurrence ends (optional)
                <input
                  type="date"
                  value={form.recurrence.until}
                  onChange={(e) =>
                    change("recurrence", {
                      ...form.recurrence,
                      until: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <h3>Months (none selected means every month)</h3>
            <div className="tag-checkboxes">
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((m, i) => (
                <label className="check" key={m}>
                  <input
                    type="checkbox"
                    checked={form.recurrence.months.includes(i + 1)}
                    onChange={(e) =>
                      change("recurrence", {
                        ...form.recurrence,
                        months: e.target.checked
                          ? [...form.recurrence.months, i + 1].sort(
                              (a: number, b: number) => a - b,
                            )
                          : form.recurrence.months.filter(
                              (n: number) => n !== i + 1,
                            ),
                      })
                    }
                  />
                  {m}
                </label>
              ))}
            </div>
            {field("notes", "Organizer notes", "textarea")}
            <h3>Exceptions and sponsors for individual dates</h3>
            {form.overrides.map((o: any, i: number) => (
              <div className="subform form-grid" key={i}>
                {["date", "location", "sponsor"].map((k) => (
                  <label key={k}>
                    {k}
                    <input
                      type={k === "date" ? "date" : "text"}
                      value={o[k]}
                      onChange={(e) =>
                        change(
                          "overrides",
                          form.overrides.map((x: any, n: number) =>
                            n === i ? { ...x, [k]: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={o.cancelled}
                    onChange={(e) =>
                      change(
                        "overrides",
                        form.overrides.map((x: any, n: number) =>
                          n === i ? { ...x, cancelled: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                  Cancel this occurrence
                </label>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    change(
                      "overrides",
                      form.overrides.filter((_: any, n: number) => n !== i),
                    )
                  }
                >
                  Remove exception
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                change("overrides", [
                  ...form.overrides,
                  { date: "", cancelled: false, location: "", sponsor: "" },
                ])
              }
            >
              Add date exception
            </button>
          </fieldset>
        )}
        {kind === "polls" && (
          <fieldset>
            <legend>Poll settings</legend>
            <label>
              Answer options (one per line)
              <textarea
                rows={5}
                value={form.options.join("\n")}
                onChange={(e) => change("options", e.target.value.split("\n"))}
              />
            </label>
            <div className="form-grid">
              {field(
                "opens",
                "Opens (include time zone, e.g. 2026-10-01T09:00:00-04:00)",
              )}
              {field("closes", "Closes (include time zone)")}
              {select("resultsVisibility", "Show aggregate results", [
                "always",
                "after-vote",
                "after-close",
                "admins",
              ])}
            </div>
            <p className="muted">
              Responses are counted once per account. Options cannot change
              after the first vote. Use NeighborVote for substantive decisions.
            </p>
          </fieldset>
        )}
        {kind === "tags" &&
          select("scope", "Tag category", ["audience", "topic"])}
        {user.admin && (
          <fieldset>
            <legend>Shared ownership</legend>
            <label>
              Owner account IDs (one per line)
              <textarea
                value={form.ownerIds.join("\n")}
                onChange={(e) =>
                  change("ownerIds", e.target.value.split("\n").filter(Boolean))
                }
              />
              <small>
                Copy account IDs from the People tab. Multiple owners can
                maintain this item.
              </small>
            </label>
          </fieldset>
        )}
        {["resources", "groups", "events"].includes(kind) && (
          <details>
            <summary>Related content</summary>
            {(
              ["relatedGroups", "relatedEvents", "relatedResources"] as const
            ).map((key) => (
              <label key={key}>
                {key.replace("related", "Related ")}
                <select
                  multiple
                  value={form[key]}
                  onChange={(e) =>
                    change(
                      key,
                      [...e.target.selectedOptions].map((o) => o.value),
                    )
                  }
                >
                  {records
                    .filter(
                      (r) =>
                        r.kind === key.replace("related", "").toLowerCase(),
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
                <small>Hold Control or Command to select multiple items.</small>
              </label>
            ))}
          </details>
        )}
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="actions sticky-actions">
          <button disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
