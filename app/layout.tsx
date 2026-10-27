import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'WorkSphere | Work Management SaaS',description:'Manage projects, SEO work, teams, and reporting in one secure workspace.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
