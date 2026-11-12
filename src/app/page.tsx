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
    image: "/images/pmk15GT61_wYTbn3s_j9Ad-Bcmtk7NBKVFFpUNjADRlSPoAQoQDnbq6y6c7BmAVstSEKFNHDw0qt8WpTizMYFIfccjg_hstZcIj0kkl8oVL0K8BGe7DEfHB5ZGVizSgbwLFqory92nRuMIet_EL-ETSHnv4fM_5V69qL_O9qlramfoiXnItHGKSd0s-eiIQr.jpg",
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
    href: "/home/connect",
    number: "05",
  },
];

export default function LandingPage() {
  return (
    <main className={`tizibane-landing ${styles.page}`}>
      <header className={`topbar ${styles.topbar}`}>
        <Brand />
        <nav className={styles.topbarNav} aria-label="Main navigation">
          <Link className={styles.spotlightButton} href="/home/connect">Spotlight</Link>
        </nav>
      </header>

      <section className={`hero ${styles.hero}`}>
        <ScrollReveal className="hero-art-reveal">
          <div className={`hero-art hero-art-photo ${styles.heroArt}`} role="group" aria-label="Happy African friends smiling together">
            <div className={styles.heroImageActions}><WelcomeActions /></div>
            <img className="photo-backdrop" src="/images/zfYl72ihl030o9SInNkzfy4-KiVQKN_NSxKvmFQPSJ_TsRvOTWXol0PwR-_i9ylJeocFChP4YecYSB8rj33c-3K7f8Z0MUJOfhDOS1AImcZOaZquQcuhHsjk56tioosY2XbBpKWUkKvAIGTI3NZcPHcvrDD588zSAZrotyamDJB9NUTqtNuOdiGMgZSIFdFi.jpg" alt="" aria-hidden="true" fetchPriority="high" />
          </div>
        </ScrollReveal>
      </section>


      <LandingContacts />

      <section className={styles.discover} aria-label="Explore TIZIBANE">
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
