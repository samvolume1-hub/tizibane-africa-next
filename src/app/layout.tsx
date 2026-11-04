import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"TIZIBANE Africa — Connect. Belong. Grow.",description:"A home for African communities, conversations and connections."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
