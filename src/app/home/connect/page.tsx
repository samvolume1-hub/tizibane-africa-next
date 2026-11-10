import { CommunityNavigation } from "@/components/community-navigation";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "../../auth-actions";

const socialLinks=[
 {name:"Pinterest",label:"Ideas, inspiration & visual collections",mark:"P",url:"https://pin.it/2EP4JejFq",kind:"social"},
 {name:"Facebook",label:"Royalty community updates",mark:"f",url:"https://www.facebook.com/share/19Rz2LxXCP/",kind:"social"},
 {name:"Instagram",label:"Follow @55samroyalty2024",mark:"◎",url:"https://www.instagram.com/55samroyalty2024/",kind:"social"},
 {name:"TikTok · Sam Shane",label:"Short-form creative content · @samshane10",mark:"♪",url:"https://www.tiktok.com/@samshane10",kind:"social"},
 {name:"TikTok · Music World",label:"Music and creative updates · @samshanemusicworld",mark:"♪",url:"https://www.tiktok.com/@samshanemusicworld",kind:"social"},
 {name:"YouTube",label:"Sam Shane Music World channel",mark:"▶",url:"https://www.youtube.com/@samshanemusicworld6626",kind:"social"},
 {name:"WhatsApp Channel",label:"Follow announcements and community updates",mark:"◉",url:"https://whatsapp.com/channel/0029VbDlyjA4Crfrf3vyuK0t",kind:"social"},
];
const companyLinks=[
 {name:"Royalty Music Hub",label:"Main music and creative platform",url:"https://royalty-music-hub.samvolume1.workers.dev/"},
 {name:"Royalty Music",label:"Royalty Music website",url:"https://sites.google.com/view/royalty-music/home"},
 {name:"Sam Shane Music",label:"Sam Shane Music website",url:"https://sites.google.com/view/sam-shane-music/home"},
];
const contacts=[
 {email:"samryt26@gmail.com",label:"General enquiries"},
 {email:"royaltymusicschool833@gmail.com",label:"Royalty Music School"},
 {email:"samvolume1@gmail.com",label:"Company and platform enquiries"},
];
export default async function ConnectPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 return <main className="app-layout">
  <CommunityNavigation active="connect" />
  <section className="app-main">
   <header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">ROYALTY · OFFICIAL LINKS</span></header>
   <div className="app-content">
    <section className="welcome groups-welcome"><img className="photo-backdrop" src="/images/iLKBOv3oRiCcm0MzhA3MpvgFrKdo0ZEHwlYgnTeitT91e0Lky2O82RYBFigBR8TNCAHq8xGqqsXuWGYoJy4Etr4Vr-ZEFxhlm7OGI_FxtghzUkjNeZKFqmSrnEwj1P2SLdAUvEk37FQLDSUcDPJo4Pkb5WJJu6JofqEuilE9vbYyhafX17Iyt3u9YiH_yYUS.jpg" alt="" aria-hidden="true" loading="eager"/><h1 style={{ fontWeight: 800 }}>Company Links</h1></section>
    <section className="module-section company-link-section">
     <div className="feed-heading"><div><span className="eyebrow">Follow our channels</span><h2>Social platforms</h2></div><span className="muted">Official destinations</span></div>
     <div className="company-link-grid">{socialLinks.map(item=><a className="company-link-card" href={item.url} target="_blank" rel="noopener noreferrer" key={item.name}><span className="company-link-mark">{item.mark}</span><span className="company-link-copy"><strong>{item.name}</strong><small>{item.label}</small></span><span className="company-link-arrow">↗</span></a>)}</div>
    </section>
    <section className="module-section company-link-section">
     <div className="feed-heading"><div><span className="eyebrow">Our platforms</span><h2>Royalty websites</h2></div></div>
     <div className="company-site-list">{companyLinks.map(item=><a className="company-site-row" href={item.url} target="_blank" rel="noopener noreferrer" key={item.url}><span><strong>{item.name}</strong><small>{item.label}</small></span><span className="company-link-arrow">Open ↗</span></a>)}</div>
    </section>
    <section className="module-section company-link-section">
     <div className="feed-heading"><div><span className="eyebrow">Talk to us</span><h2>WhatsApp</h2></div></div>
     <div className="company-site-list">
      <a className="company-site-row" href="https://wa.me/260760930509" target="_blank" rel="noopener noreferrer"><span><strong>WhatsApp contact · +260 760 930 509</strong><small>Direct message</small></span><span className="company-link-arrow">Chat ↗</span></a>
      <a className="company-site-row" href="https://wa.me/260769614559" target="_blank" rel="noopener noreferrer"><span><strong>WhatsApp contact · +260 769 614 559</strong><small>Direct message</small></span><span className="company-link-arrow">Chat ↗</span></a>
     </div>
    </section>
    <section className="module-section company-link-section">
     <div className="feed-heading"><div><span className="eyebrow">Custom service</span><h2>Email the team</h2></div></div>
     <div className="company-site-list">{contacts.map(item=><a className="company-site-row" href={"mailto:"+item.email} key={item.email}><span><strong>{item.email}</strong><small>{item.label}</small></span><span className="company-link-arrow">Email ↗</span></a>)}</div>
    </section>
    <footer className="community-credit">Developed by Royalty For the Zambian community.</footer>
    
   </div>
  </section>
 </main>;
}
