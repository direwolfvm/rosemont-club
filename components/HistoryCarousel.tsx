"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";

const archive = "https://www.rosemontcitizens.org/";
const slides = [
  {
    image: "/images/history/rosemont-map.png",
    title: "Rosemont today",
    date: "Today",
    alt: "Map of Rosemont showing Russell Road, Commonwealth Avenue, neighborhood streets, and nearby Metro stations.",
    source: archive + "history",
  },
  {
    image: "/images/history/rosemont-1911.jpg",
    title: "Rosemont on the map",
    date: "1911",
    alt: "Historic 1911 map labeling Rosemont and the Washington, Alexandria and Mount Vernon electric railway.",
    source: archive + "images-1920s-to-civil-war",
  },
  {
    image: "/images/history/sanborn-1921.jpg",
    title: "A neighborhood taking shape",
    date: "1921",
    alt: "Sanborn fire insurance map of Rosemont in 1921, with individual homes and streets marked in color.",
    source: archive + "images-1920s-to-civil-war",
  },
  {
    image: "/images/history/assessment-1963.jpg",
    title: "Rosemont in 1963",
    date: "1963",
    alt: "Alexandria assessment map 201 from 1963, showing Rosemont lots between King Street, Russell Road, and Commonwealth Avenue.",
    source: archive + "images-1980s-to-1960s",
  },
];

export default function HistoryCarousel() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPlaying(!preference.matches);
    const stop = () => setPlaying(false);
    preference.addEventListener("change", stop);
    return () => preference.removeEventListener("change", stop);
  }, []);
  useEffect(() => {
    if (!playing || hovered) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [playing, hovered]);
  const select = (index: number) => {
    setPlaying(false);
    setActive((index + slides.length) % slides.length);
  };
  const slide = slides[active];
  return (
    <section
      className="history-carousel"
      aria-label="Rosemont through the years"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-playback]"))
          setPlaying(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          select(active + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <div className="history-image">
        {slides.map((item, index) => (
          <div
            key={item.image}
            className="history-slide"
            data-active={index === active}
            aria-hidden={index !== active}
          >
            <Image
              src={item.image}
              alt={item.alt}
              fill
              sizes="(max-width: 760px) calc(100vw - 40px), 540px"
              priority={index === 0}
              quality={85}
            />
          </div>
        ))}
        <span className="history-kicker">Our neighborhood, then & now</span>
        <a
          className="history-original"
          href={slide.image}
          target="_blank"
          rel="noreferrer"
          aria-label={`View full ${slide.date} map (opens a new tab)`}
        >
          Explore this map <ArrowUpRight size={14} />
        </a>
      </div>
      <div
        className="history-caption"
        aria-live={playing ? "off" : "polite"}
        aria-atomic="true"
      >
        <span className="history-date">{slide.date}</span>
        <div>
          <strong>{slide.title}</strong>
          <a href={slide.source} target="_blank" rel="noreferrer">
            From the Rosemont Citizens Association collection{" "}
            <ArrowUpRight size={11} />
          </a>
        </div>
      </div>
      <div className="history-controls">
        <button
          className="icon-button"
          data-playback
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="history-dots" aria-label="Choose a map">
          {slides.map((item, index) => (
            <button
              key={item.date}
              aria-label={`Show ${item.date} map`}
              aria-pressed={active === index}
              onClick={() => select(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <span className="history-count">
          {active + 1} / {slides.length}
        </span>
        <button
          className="icon-button"
          aria-label="Previous map"
          onClick={() => select(active - 1)}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          className="icon-button"
          aria-label="Next map"
          onClick={() => select(active + 1)}
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </section>
  );
}
