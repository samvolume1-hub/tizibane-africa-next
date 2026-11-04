import {ImageResponse} from "next/og";

export const runtime = "edge";
export const alt = "TIZIBANE Africa — You're invited to join the community";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", position: "relative",
        overflow: "hidden", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse at 78% 18%, #49305f 0%, transparent 42%), radial-gradient(ellipse at 10% 100%, #302044 0%, transparent 46%), linear-gradient(135deg, #090711 0%, #160f22 52%, #090711 100%)",
        color: "#f7f0e4", fontFamily: "Georgia, serif"
      }}>
        <div style={{position:"absolute", inset:28, border:"2px solid rgba(221,190,128,.65)", borderRadius:26, display:"flex"}} />
        <div style={{position:"absolute", inset:40, border:"1px solid rgba(221,190,128,.2)", borderRadius:19, display:"flex"}} />
        <div style={{position:"absolute", width:540, height:540, right:-100, top:-190, border:"1px solid rgba(215,181,107,.18)", borderRadius:"50%", display:"flex"}} />
        <div style={{position:"absolute", width:400, height:400, right:-30, top:-120, border:"1px solid rgba(215,181,107,.13)", borderRadius:"50%", display:"flex"}} />
        <div style={{display:"flex", flexDirection:"row", alignItems:"center", gap:62, width:"100%", padding:"78px 105px"}}>
          <div style={{width:280, height:280, border:"5px solid #d8b56b", borderRadius:38, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(145deg, rgba(216,181,107,.16), rgba(20,13,30,.94))", boxShadow:"0 0 50px rgba(216,181,107,.18), inset 0 0 0 5px rgba(216,181,107,.13)"}}>
            <div style={{fontSize:218, lineHeight:1, fontWeight:700, color:"#f1d69c", textShadow:"0 4px 24px rgba(216,181,107,.35)", marginTop:-14}}>T</div>
          </div>
          <div style={{display:"flex", flexDirection:"column", flex:1}}>
            <div style={{fontFamily:"Arial, sans-serif", fontSize:24, letterSpacing:9, color:"#dfc58f", fontWeight:700}}>YOU'RE INVITED</div>
            <div style={{fontSize:58, lineHeight:1.08, fontWeight:700, marginTop:18, letterSpacing:1}}>TIZIBANE</div>
            <div style={{fontFamily:"Arial, sans-serif", fontSize:26, letterSpacing:13, color:"#dfc58f", marginTop:7}}>AFRICA</div>
            <div style={{width:100, height:3, background:"#d8b56b", marginTop:28, display:"flex"}} />
            <div style={{fontFamily:"Arial, sans-serif", fontSize:25, lineHeight:1.4, color:"#e8dfd2", marginTop:24}}>Find your people. Build your circle.</div>
            <div style={{fontFamily:"Arial, sans-serif", fontSize:20, color:"#cbb98f", marginTop:17, letterSpacing:2}}>CONNECT. BELONG. GROW.</div>
          </div>
        </div>
        <div style={{position:"absolute", bottom:48, right:86, fontFamily:"Arial, sans-serif", fontSize:16, letterSpacing:3, color:"rgba(230,211,175,.58)"}}>A COMMUNITY THAT FEELS LIKE HOME</div>
      </div>
    ),
    { ...size }
  );
}
