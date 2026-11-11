import { RoyaltyCopyright } from "@/components/royalty-copyright";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ScrollReveal } from "@/components/scroll-reveal";
import { LandingContacts } from "@/components/landing-contacts";
import { WelcomeActions } from "@/components/welcome-actions";
import styles from "./landing-page.module.css";

const destinations = [
  {
    title: "People",
    description: "Meet people across Zambia, discover shared interests and grow your circle.",
    image: "/images/connct%20with%20friends.jpg",
    alt: "Friends connecting and enjoying time together",
    href: "/home/people",
    number: "01",
  },
  {
    title: "Conversations",
    description: "Keep meaningful conversations going and stay close to the people who matter.",
    image: "/images/message%20chats.jpg",
    alt: "A visual about messaging and conversations",
    href: "/home/messages",
    number: "02",
  },
  {
    title: "Groups",
    description: "Find your community, share interests and build something together.",
    image: "/images/call-to-action-using-social-networks.jpg",
    alt: "People connecting through social networks",
    href: "/home/groups",
    number: "03",
  },
  {
    title: "Events",
    description: "Discover what's happening, meet up and make more memories together.",
    image: "/images/EVENTS.jpg",
    alt: "Community events and activities",
    href: "/home/events",
    number: "04",
  },
  {
    title: "Spotlight",
    description: "Explore fresh ideas, community highlights and things worth discovering.",
    image: "/images/always%20find%20something%20new.jpg",
    alt: "A visual invitation to discover something new",
    href: "/home/announcements",
    number: "05",
  },
];

export default function LandingPage() {
  return (
    <main className={`tizibane-landing ${styles.page}`}>
      <header className={`topbar ${styles.topbar}`}>
        <Brand />
        <WelcomeActions />
      </header>

      <section className={`hero ${styles.hero}`}>
        <div className={`hero-copy-card ${styles.heroCopy}`}>
          <span className="eyebrow">MADE FOR ZAMBIA · BUILT FOR CONNECTION</span>
          <h1>Your people.<br /><span className={styles.heroAccent}>Your place. Your community.</span></h1>
          <p className="lead">TIZIBANE is a home for Zambian communities, friendships and meaningful conversations. Discover people, share your moments and stay connected—wherever you are in Zambia.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/signup">Join the community <span aria-hidden="true">↗</span></Link>
            <Link className="btn" href="/login">I already have an account</Link>
          </div>
          <div className={styles.heroTrust}><span>Made for Zambian communities</span><i aria-hidden="true" /> <span>A place to connect and belong</span></div>
        </div>
        <ScrollReveal className="hero-art-reveal">
          <div className={`hero-art hero-art-photo ${styles.heroArt}`} role="img" aria-label="Happy African friends smiling together">
            <img className="photo-backdrop" src="/images/zfYl72ihl030o9SInNkzfy4-KiVQKN_NSxKvmFQPSJ_TsRvOTWXol0PwR-_i9ylJeocFChP4YecYSB8rj33c-3K7f8Z0MUJOfhDOS1AImcZOaZquQcuhHsjk56tioosY2XbBpKWUkKvAIGTI3NZcPHcvrDD588zSAZrotyamDJB9NUTqtNuOdiGMgZSIFdFi.jpg" alt="" aria-hidden="true" fetchPriority="high" />
            <div className="art-caption">Together, we belong</div>
          </div>
        </ScrollReveal>
      </section>

      <LandingContacts />

      <section className={styles.discover} aria-labelledby="discover-title">
        <div className={styles.discoverHeading}>
          <div>
            <span className={styles.sectionKicker}>A COMMUNITY THAT FEELS LIKE HOME</span>
            <h2 id="discover-title">There is a place for you here.</h2>
          </div>
          <p>Meet people, find your conversations and take part in the things bringing our communities together.</p>
        </div>
        <div className={styles.featureGrid}>
          {destinations.map((item) => (
            <Link className={styles.featureCard} href={item.href} key={item.title}>
              <div className={styles.featureImageWrap}>
                <img src={item.image} alt={item.alt} loading="lazy" />
                <span className={styles.featureNumber}>{item.number}</span>
              </div>
              <div className={styles.featureCopy}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className={styles.featureLink}>Explore <span aria-hidden="true">↗</span></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className={`footer ${styles.footer}`}>
        <span className="footer-tagline">Connect. Belong. Grow.</span>
        <RoyaltyCopyright />
      </footer>
    </main>
  );
}
