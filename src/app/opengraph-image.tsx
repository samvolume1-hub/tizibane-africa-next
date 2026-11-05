import {ImageResponse} from "next/og";

export const runtime = "edge";
export const alt = "You're invited to TIZIBANE Africa — find your people and build your circle";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const photoResponse = await fetch(new URL("../../public/images/CyRjOE1H6VIkX4mtiuoWOh4PQBRAZBExhEGYt7c5uxc26hSsSnuMDIHGTpmE6kCBgK7QZftdf2nhlnK4kvhEiUaWY2tufs--MECrRWVgMR_6jeRI0ML9Mh3wTiUUEmE9Ar043kC-vkhT915xe39ztJgAYf5dgT4h2klx8LnRrsY.jpg", import.meta.url));
  if (!photoResponse.ok) {
    throw new Error("Unable to load the bundled TIZIBANE preview photo");
  }

  const photoBytes = new Uint8Array(await photoResponse.arrayBuffer());
  let photoBinary = "";
  for (let i = 0; i < photoBytes.length; i += 0x8000) {
    photoBinary += String.fromCharCode(...photoBytes.subarray(i, i + 0x8000));
  }
  const photoSrc = `data:image/jpeg;base64,${btoa(photoBinary)}`;

  return new ImageResponse(
    (
      <div style={{width:"100%",height:"100%",display:"flex",position:"relative",overflow:"hidden",background:"#21112f",fontFamily:"Arial,sans-serif"}}>
        <img src={photoSrc} width="1200" height="630" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 42%"}} />
        <div style={{position:"absolute",inset:0,display:"flex",background:"linear-gradient(90deg,rgba(26,10,43,.94) 0%,rgba(39,15,55,.82) 43%,rgba(39,15,55,.28) 100%),linear-gradient(0deg,rgba(17,8,29,.35),transparent 45%)"}} />
        <div style={{position:"absolute",inset:24,border:"3px solid rgba(244,205,119,.9)",borderRadius:26,display:"flex"}} />
        <div style={{position:"absolute",inset:36,border:"1px solid rgba(255,255,255,.45)",borderRadius:18,display:"flex"}} />
        <div style={{position:"relative",display:"flex",flexDirection:"column",justifyContent:"center",width:620,height:"100%",padding:"58px 0 58px 88px"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:62,height:62,border:"3px solid #f1cf80",borderRadius:15,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(43,21,58,.72)",color:"#ffe3a4",fontSize:47,fontWeight:700}}>T</div>
            <div style={{display:"flex",flexDirection:"column",color:"#ffe3a4",fontSize:19,fontWeight:700,letterSpacing:5}}>TIZIBANE<span style={{fontSize:11,letterSpacing:7,marginTop:4}}>AFRICA</span></div>
          </div>
          <div style={{display:"flex",marginTop:34,color:"#ffdc88",fontSize:22,fontWeight:800,letterSpacing:5}}>YOU'RE INVITED!</div>
          <div style={{display:"flex",flexDirection:"column",marginTop:15,color:"#fff8ef",fontSize:57,fontWeight:800,lineHeight:1.04,letterSpacing:-1}}>Find your people.<span style={{color:"#ffd27a"}}>Build your circle.</span></div>
          <div style={{display:"flex",marginTop:28,color:"#fff1df",fontSize:20,letterSpacing:3,fontWeight:700}}>CONNECT. BELONG. GROW.</div>
          <div style={{display:"flex",marginTop:19,color:"#f7dba5",fontSize:15,letterSpacing:2}}>MADE FOR ZAMBIA · BUILT FOR CONNECTION</div>
        </div>
        <div style={{position:"absolute",right:60,bottom:45,display:"flex",padding:"10px 17px",borderRadius:30,background:"rgba(255,255,255,.88)",color:"#3a1c4c",fontSize:14,fontWeight:700,letterSpacing:1}}>JOIN THE COMMUNITY ↗</div>
      </div>
    ),
    {...size}
  );
}
